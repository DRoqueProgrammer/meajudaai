-- 0051: hora combinada da visita (pedido do Leonardo em 10/09/2026: "daí o
-- horário acordado pode ser preenchido no serviço, e isso altera a agenda do
-- cliente e do prestador. Exemplo: ele tinha agenda aberta das 09h às 18h, ele
-- combina que vai às 10h00 lá, pode colocar no serviço, sem necessidade da hora
-- final, deixe como opcional").
--
-- O pedido nasce dentro de uma janela (agenda_slots.hora_inicio–hora_fim) com um
-- período preferido (0050). Depois de combinar, o PRESTADOR marca a hora da
-- visita — início obrigatório para marcar, fim opcional —, sempre dentro da
-- janela. As agendas dos dois lados passam a mostrar o serviço nessa hora.

alter table public.servicos
  add column if not exists hora_combinada_inicio time,
  add column if not exists hora_combinada_fim time,
  add constraint servicos_hora_combinada_ordem
    check (hora_combinada_fim is null or (hora_combinada_inicio is not null and hora_combinada_fim > hora_combinada_inicio));

comment on column public.servicos.hora_combinada_inicio is
  'Hora combinada da visita (início), dentro da janela do horário (agenda_slots). Null = ainda não combinada. '
  'Só o prestador marca (gatilho validar_transicao_servico). Migration 0051.';
comment on column public.servicos.hora_combinada_fim is
  'Hora combinada do fim da visita — opcional (pedido do dono). Exige início e é depois dele, dentro da janela.';

-- Gatilho de transição (0038/0047) com a regra da hora combinada: só o
-- prestador mexe nela, em serviço não final, e dentro da janela do horário.
create or replace function public.validar_transicao_servico()
returns trigger
language plpgsql
as $$
declare
  quem uuid := auth.uid();
  janela_inicio time;
  janela_fim time;
begin
  if public.is_chamada_privilegiada() then
    return new;
  end if;

  if new.tipo is distinct from old.tipo then
    if quem is distinct from old.prestador_id
       and not (quem = old.cliente_id and old.status = 'pendente') then
      raise exception 'Só o prestador recategoriza o serviço (o cliente, só enquanto está pendente).';
    end if;
    -- Só o tipo mudou: vale até em serviço realizado ou cancelado.
    if (to_jsonb(new) - 'tipo') = (to_jsonb(old) - 'tipo') then
      return new;
    end if;
  end if;

  if old.status in ('realizado', 'cancelado') then
    raise exception 'Serviço em estado final (%) não aceita mudanças.', old.status;
  end if;

  if new.hora_combinada_inicio is distinct from old.hora_combinada_inicio
     or new.hora_combinada_fim is distinct from old.hora_combinada_fim then
    if quem is distinct from old.prestador_id then
      raise exception 'Só o prestador marca a hora combinada da visita.';
    end if;
    if new.hora_combinada_inicio is not null then
      select a.hora_inicio, a.hora_fim into janela_inicio, janela_fim
        from public.agenda_slots a where a.id = new.slot_id;
      if new.hora_combinada_inicio < janela_inicio or new.hora_combinada_inicio >= janela_fim
         or (new.hora_combinada_fim is not null and new.hora_combinada_fim > janela_fim) then
        raise exception 'A hora combinada precisa estar dentro da agenda aberta (% às %).',
          to_char(janela_inicio, 'HH24:MI'), to_char(janela_fim, 'HH24:MI');
      end if;
    end if;
  end if;

  if new.slot_id is distinct from old.slot_id
      or new.cliente_id is distinct from old.cliente_id
      or new.prestador_id is distinct from old.prestador_id
      or new.preco_tipo is distinct from old.preco_tipo
      or new.created_at is distinct from old.created_at
  then
    raise exception 'O vínculo do serviço (horário, cliente, prestador) e o tipo de preço são imutáveis depois do nascimento.';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'confirmado' then
      if old.status <> 'pendente' or quem is distinct from old.prestador_id then
        raise exception 'Só o prestador confirma um serviço pendente.';
      end if;
    elsif new.status = 'realizado' then
      if old.status <> 'confirmado' or quem is distinct from old.prestador_id then
        raise exception 'Só o prestador marca como realizado um serviço confirmado.';
      end if;
    elsif new.status = 'cancelado' then
      if quem is distinct from old.cliente_id and quem is distinct from old.prestador_id then
        raise exception 'Só o cliente ou o prestador do serviço podem cancelar.';
      end if;
      if new.cancelado_motivo is null or btrim(new.cancelado_motivo) = '' then
        raise exception 'Cancelamento exige um motivo (não vazio depois de tirar os espaços).';
      end if;
    else
      raise exception 'Transição de % para % não é permitida.', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.validar_transicao_servico() is
  'Gatilho BEFORE UPDATE em servicos (ADR 0010, R-38; tipo na 0047; hora combinada na 0051): só o prestador '
  'confirma e marca realizado, qualquer parte cancela com motivo, realizado/cancelado são finais; vínculo, '
  'preco_tipo e created_at imutáveis; mudar SÓ o tipo vale em qualquer estado (prestador) ou pendente (cliente); '
  'a hora combinada só o prestador marca, em serviço não final, dentro da janela do horário. Libera service_role e postgres.';
