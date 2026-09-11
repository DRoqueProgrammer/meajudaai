-- 0046: fechar uma agenda aberta (pedido do Leonardo em 10/09/2026: "falta uma
-- forma de FECHAR uma agenda aberta… com uma caixa de confirmação. Se tiver
-- serviços agendados numa agenda, não pode cancelar").
--
-- A "agenda aberta" da tela é o agrupamento, por faixa de horário, dos
-- horários (agenda_slots) que o prestador abriu. Fechar = tirar do ar os dias
-- LIVRES dessa faixa. Não dá para apagar: um horário livre pode estar preso a um
-- serviço já cancelado (servicos.slot_id é on delete restrict — histórico da
-- outra parte). Então nasce o estado 'fechado': não aparece para ninguém além
-- do dono e não aceita reserva (a policy de insert de servicos exige 'livre').
--
-- De quebra, a policy de update do dono (0024) deixava ele mudar QUALQUER
-- status do próprio horário — inclusive devolver a 'livre' um horário com
-- serviço em andamento, abrindo reserva dupla. O gatilho abaixo fecha isso.

alter table public.agenda_slots drop constraint if exists agenda_slots_status_check;
alter table public.agenda_slots
  add constraint agenda_slots_status_check check (status in ('livre', 'pendente', 'confirmado', 'fechado'));

comment on column public.agenda_slots.status is
  'livre (aceita reserva) · pendente / confirmado (tem serviço em andamento — o gatilho de servicos marca) · '
  'fechado (o prestador fechou essa agenda aberta; só o dono vê, não aceita reserva — migration 0046).';

create or replace function public.guardar_status_do_horario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_chamada_privilegiada() or new.status = old.status then
    return new;
  end if;
  -- Horário com serviço em andamento não volta a livre nem fecha: primeiro o
  -- serviço é cancelado ou concluído (o cancelamento devolve o horário depois).
  if new.status in ('livre', 'fechado') and exists (
    select 1 from public.servicos s
     where s.slot_id = new.id and s.status in ('pendente', 'confirmado')
  ) then
    raise exception 'este horário tem serviço agendado — cancele o serviço antes'
      using errcode = '42501';
  end if;
  -- Só horário livre fecha; horário fechado só reabre (volta a livre).
  if new.status = 'fechado' and old.status <> 'livre' then
    raise exception 'só um horário livre pode ser fechado' using errcode = '42501';
  end if;
  if old.status = 'fechado' and new.status <> 'livre' then
    raise exception 'horário fechado só pode ser reaberto' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.guardar_status_do_horario() is
  'Gatilho de agenda_slots (migration 0046): numa sessão comum, horário com serviço pendente/confirmado não '
  'volta a livre nem fecha; só horário livre vira fechado; fechado só volta a livre. Chave de serviço e '
  'postgres passam direto (o gatilho de nascimento do serviço e os scripts).';

drop trigger if exists agenda_slots_guardar_status on public.agenda_slots;
create trigger agenda_slots_guardar_status
  before update of status on public.agenda_slots
  for each row execute function public.guardar_status_do_horario();
