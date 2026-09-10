-- 0038: o serviço só nasce e só muda pelo fluxo — regra no banco (Fatia 1,
-- tarefa 1). Fecha R-37, R-38 e R-39 (cvg/docs/tech-spec/fatia-1-seguranca.md),
-- que a ADR 0010 mapeou como regra só de `lib/actions/agenda-v2.ts`: hoje o
-- banco confere apenas "quem escreve" em `servicos` (cliente_id = auth.uid()
-- no insert; qualquer parte no update), não "o que" pode nascer nem "para
-- onde" o estado pode mudar. Isso permite, fora da aplicação, inventar um
-- serviço já realizado/confirmado, num horário ocupado, com prestador ou
-- preço forjados — e mover o contador público (R-39) sem ter passado pelo
-- fluxo. A ADR 0011 mapeou o outro lado do mesmo problema: a reserva do
-- cliente nunca conseguiu marcar `agenda_slots` como pendente (a política de
-- update de agenda_slots é só do prestador dono) — então agora é o próprio
-- banco, via gatilho, quem faz essa marcação no nascimento do serviço.
--
-- Regra de nascimento (R-37) vai para a política de INSERT de `servicos`
-- (WITH CHECK com sub-consultas em agenda_slots/profiles) — RLS não se aplica
-- à service_role nem ao role postgres, então scripts de seed continuam livres
-- (contrato do gabarito: tests/fatia1/servicos.test.ts, bloco "compatibilidade").
--
-- Regra de transição (R-38) precisa comparar o estado antigo com o novo — RLS
-- por si só não faz esse tipo de comparação num UPDATE, por isso vai para um
-- gatilho BEFORE UPDATE. Esse gatilho DISPARA para qualquer role, inclusive
-- service_role/postgres — por isso ele mesmo precisa reconhecer e liberar essas
-- duas chamadas, usando o role da requisição (auth.role(), populado pelo
-- PostgREST a partir do JWT) e o role da sessão (current_user, que é
-- "postgres" fora de uma requisição — migration, psql direto). O mesmo
-- gatilho também trava o vínculo do serviço (slot_id, cliente_id,
-- prestador_id) e o preco_tipo como imutáveis depois do nascimento: a policy
-- de UPDATE "servicos_update_parties" (migration 0024) só confere quem
-- escreve (cliente_id = auth.uid() or prestador_id = auth.uid()), não o que
-- pode mudar — sem essa trava, o prestador re-vincularia o serviço a outro
-- cliente_id (e "teria serviço" com ele, abrindo dados via tem_servico_com,
-- R-40), o cliente trocaria o prestador_id ou o slot_id sem passar pela
-- reserva, ou qualquer lado trocaria o preco_tipo contornando o preço
-- vigente do R-37 — tudo isso é "mudar pelo fluxo" fugindo do fluxo.
--
-- R-39 (contador público só se move pelo fluxo) não precisa de gatilho novo:
-- ele já é mantido por `atualizar_servicos_realizados` (migration 0035) a
-- partir do que está de fato em `servicos.status='realizado'` — bloqueando o
-- nascimento forjado e a transição forjada (este arquivo), o contador herda a
-- proteção, exatamente como a ADR 0010 registrou ("o contador não é uma
-- proteção; ele herda o que a política de escrita deixar passar").

-- Distingue uma chamada "de sistema" (chave de serviço, ou o próprio role
-- postgres rodando fora de uma requisição — migration, seed via psql) de uma
-- sessão real de usuário. auth.role() vem do claim "role" do JWT que o
-- PostgREST decodifica (authenticated/anon/service_role); fora de uma
-- requisição HTTP (migration, `supabase db push`) não há JWT, e auth.role()
-- devolve null — nesse caso o current_user já é "postgres", e é ele quem
-- decide.
create or replace function public.is_chamada_privilegiada()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role(), current_user) in ('service_role', 'postgres')
$$;

comment on function public.is_chamada_privilegiada() is
  'true quando quem está escrevendo é a chave de serviço (auth.role() = service_role) ou o próprio '
  'role postgres fora de uma requisição HTTP (migration, seed via psql — auth.role() vem null e '
  'current_user já é postgres). Usado pelos gatilhos de servicos (migration 0038) para não barrar '
  'scripts de seed nem migrations, só sessões reais de cliente/prestador.';

-- R-37 — nascimento só pelo fluxo de reserva: estado inicial pendente, sobre
-- um horário livre que pertence ao prestador indicado, com o preço vigente
-- do perfil desse prestador. Continua exigindo cliente_id = auth.uid() (regra
-- que já existia). Isto é RLS: não se aplica a service_role nem a postgres.
drop policy if exists "servicos_insert_cliente" on public.servicos;
create policy "servicos_insert_cliente" on public.servicos
  for insert to authenticated
  with check (
    servicos.cliente_id = auth.uid()
    and servicos.status = 'pendente'
    and exists (
      select 1 from public.agenda_slots a
       where a.id = servicos.slot_id
         and a.status = 'livre'
         and a.prestador_id = servicos.prestador_id
    )
    and exists (
      select 1 from public.profiles p
       where p.user_id = servicos.prestador_id
         and p.preco_tipo = servicos.preco_tipo
         and p.preco_valor = servicos.preco_valor
    )
  );

comment on policy "servicos_insert_cliente" on public.servicos is
  'R-37 (ADR 0010): o cliente dono só nasce um serviço pendente, sobre um horário livre do prestador '
  'indicado, com preco_tipo/preco_valor iguais ao perfil desse prestador nesse instante. Sub-consultas '
  'em agenda_slots e profiles seguem a RLS dessas tabelas para a sessão que insere (ambas liberam '
  'leitura suficiente: agenda_slots por status=livre, profiles por profiles_select_all). Não se aplica '
  'à service_role nem ao role postgres, que sempre ignoram RLS — scripts de seed continuam livres.';

-- Marca o horário como pendente quando o serviço nasce pendente (fluxo normal
-- de reserva) — a sessão do cliente nunca teve, e continua sem ter, permissão
-- de update em agenda_slots (ADR 0011: a única política é do prestador dono).
-- SECURITY DEFINER pra essa escrita interna específica poder ignorar essa
-- RLS; nada externo chama esta função diretamente (revogado de anon/public).
create or replace function public.marcar_horario_pendente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pendente' then
    update public.agenda_slots
       set status = 'pendente'
     where id = new.slot_id
       and status = 'livre';
  end if;
  return new;
end;
$$;
revoke execute on function public.marcar_horario_pendente() from anon, authenticated, public;

comment on function public.marcar_horario_pendente() is
  'Gatilho AFTER INSERT em servicos (ADR 0011): quando o serviço nasce pendente, marca o agenda_slots '
  'correspondente como pendente. SECURITY DEFINER porque a sessão do cliente que insere o serviço não '
  'tem policy de update em agenda_slots (é só do prestador dono) — nunca deve ganhar essa permissão '
  'diretamente; é o banco, por este gatilho, quem faz a marcação. Serviços que nascem em outro status '
  '(ex.: seed via service_role gravando já "realizado") não tocam o horário aqui.';

drop trigger if exists servicos_marca_horario_pendente on public.servicos;
create trigger servicos_marca_horario_pendente
  after insert on public.servicos
  for each row execute function public.marcar_horario_pendente();

comment on trigger servicos_marca_horario_pendente on public.servicos is
  'Ver comentário de public.marcar_horario_pendente() — ADR 0011, R-37.';

-- R-38 — o estado só muda pela regra do papel: pendente->confirmado e
-- confirmado->realizado só pelo prestador; pendente ou confirmado->cancelado
-- por qualquer das partes, com motivo não vazio (depois de trim); realizado e
-- cancelado são finais (nenhuma mudança depois, nem de outras colunas). Além
-- do status/motivo, o vínculo do serviço — slot_id, cliente_id, prestador_id
-- — e o preco_tipo também são imutáveis depois do nascimento: sem essa trava,
-- o with check da policy "servicos_update_parties" (migration 0024, só
-- confere `cliente_id = auth.uid() or prestador_id = auth.uid()`) deixa
-- qualquer uma das partes re-vincular um serviço já existente — o prestador
-- troca o cliente_id (e passa a "ter serviço" com outra pessoa, abrindo
-- telefone/endereço dela via tem_servico_com, R-40), o cliente troca o
-- prestador_id ou rouba outro slot_id sem passar pela reserva, ou qualquer
-- lado troca o preco_tipo pra contornar o preço vigente do R-37 — tudo isso
-- contraria o próprio objetivo desta tarefa ("só muda pelo fluxo", ADR 0010:
-- "qualquer uma das partes muda qualquer coluna" foi a permissão pretendida
-- só pra preco_valor/preco_pendente/status/motivo, não pro vínculo). created_at
-- também é imutável (não existe fluxo que o altere). preco_valor e
-- preco_pendente continuam livres pras duas partes enquanto o serviço não é
-- final — a renegociação (migration 0028) precisa deles, exatamente como já
-- funcionava (ADR 0010) e como o gabarito exige ("a renegociação de valor
-- continua funcionando"). Dispara pra qualquer role — por isso libera de cara
-- quem é chamada privilegiada.
create or replace function public.validar_transicao_servico()
returns trigger
language plpgsql
as $$
declare
  quem uuid := auth.uid();
begin
  if public.is_chamada_privilegiada() then
    return new;
  end if;

  if old.status in ('realizado', 'cancelado') then
    raise exception 'Serviço em estado final (%) não aceita mudanças.', old.status;
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
  'Gatilho BEFORE UPDATE em servicos (ADR 0010, R-38): valida a transição de status pela regra do '
  'papel de quem está escrevendo (auth.uid()) — só o prestador confirma e marca realizado, qualquer '
  'parte cancela com motivo não vazio, realizado/cancelado são finais. Também trava o vínculo do '
  'serviço (slot_id, cliente_id, prestador_id), o preco_tipo e o created_at como imutáveis depois do '
  'nascimento — sem isso, o with check de servicos_update_parties (migration 0024) deixa qualquer uma '
  'das partes re-vincular um serviço existente a outro horário/cliente/prestador ou trocar o tipo de '
  'preço, contornando R-37/R-40. preco_valor/preco_pendente continuam livres pra renegociação (trava- '
  'los fica pra Fatia 5). Libera de cara service_role e o role postgres (public.is_chamada_privilegiada) '
  '— o gatilho dispara pra qualquer role, RLS não filtra isso.';

drop trigger if exists servicos_valida_transicao on public.servicos;
create trigger servicos_valida_transicao
  before update on public.servicos
  for each row execute function public.validar_transicao_servico();

comment on trigger servicos_valida_transicao on public.servicos is
  'Ver comentário de public.validar_transicao_servico() — ADR 0010, R-38.';
