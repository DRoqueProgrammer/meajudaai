-- 0048: horário volta a aceitar reserva depois de um cancelamento (Fatia 4 —
-- supera o ADR 0017).
--
-- Antes: `servicos.slot_id` era único na tabela INTEIRA (migration 0024), sem
-- olhar o estado — um serviço cancelado segurava o horário para sempre, e uma
-- nova reserva violava a unicidade. E a devolução do horário a 'livre' era
-- feita pela sessão de quem cancelou: quando era o CLIENTE, a policy de update
-- de agenda_slots (só do prestador dono) filtrava para 0 linhas (ADR 0011), e o
-- horário ficava 'confirmado' com o serviço cancelado.
--
-- Agora:
-- 1. A unicidade vale só entre serviços que seguram o horário (pendente,
--    confirmado, realizado). Continua sendo a trava da CORRIDA da reserva: dois
--    clientes reservando o mesmo horário ao mesmo tempo — um deles perde no
--    índice, nunca os dois entram.
-- 2. O próprio banco devolve o horário a 'livre' quando o serviço é cancelado,
--    seja quem for que cancelou (gatilho SECURITY DEFINER, escrita interna).
-- 3. Os horários presos por serviço cancelado hoje voltam a 'livre'.

alter table public.servicos drop constraint if exists servicos_slot_id_key;

create unique index if not exists servicos_slot_ocupado_unico
  on public.servicos (slot_id)
  where status <> 'cancelado';

comment on index public.servicos_slot_ocupado_unico is
  'Um horário tem no máximo um serviço que o ocupa (pendente, confirmado ou realizado). Serviço cancelado '
  'não segura o horário — pode ser reservado de novo. Também é a trava da corrida da reserva (migration 0048).';

create or replace function public.liberar_horario_do_cancelado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    update public.agenda_slots a
       set status = 'livre'
     where a.id = new.slot_id
       and a.status in ('pendente', 'confirmado')
       and not exists (
         select 1 from public.servicos s
          where s.slot_id = new.slot_id and s.id <> new.id and s.status <> 'cancelado'
       );
  end if;
  return new;
end;
$$;

comment on function public.liberar_horario_do_cancelado() is
  'Gatilho AFTER UPDATE em servicos (migration 0048): quando um serviço é cancelado, o horário dele volta a '
  '''livre'' — por quem quer que tenha cancelado (o cliente não tem update em agenda_slots, ADR 0011; por isso '
  'SECURITY DEFINER). Não mexe se outro serviço ativo ocupar o mesmo horário.';

revoke execute on function public.liberar_horario_do_cancelado() from anon, authenticated, public;

drop trigger if exists servicos_liberar_horario on public.servicos;
create trigger servicos_liberar_horario
  after update of status on public.servicos
  for each row execute function public.liberar_horario_do_cancelado();

-- Horários presos hoje por serviço cancelado.
update public.agenda_slots a
   set status = 'livre'
 where a.status in ('pendente', 'confirmado')
   and exists (select 1 from public.servicos s where s.slot_id = a.id and s.status = 'cancelado')
   and not exists (select 1 from public.servicos s where s.slot_id = a.id and s.status <> 'cancelado');
