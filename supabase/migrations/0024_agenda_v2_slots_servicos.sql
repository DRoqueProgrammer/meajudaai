-- 0024: Agenda v2 — o prestador oferece horários (agenda_slots), o cliente
-- reserva um (nasce um servico). Molde: `plantao` do careconnect (workspace ×
-- paciente × cuidador × data/turno × status), adaptado pra marketplace P2P
-- (sem workspace: é direto prestador↔cliente). Ver DESIGN_MEAJUDAAI_V2.md
-- Decisão 4 e ROADMAP.md §8.

create table public.agenda_slots (
  id             uuid primary key default gen_random_uuid(),
  prestador_id   uuid not null references auth.users(id) on delete cascade,
  data           date not null,
  hora_inicio    time not null,
  hora_fim       time not null,
  status         text not null default 'livre' check (status in ('livre','pendente','confirmado')),
  created_at     timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);
create index agenda_slots_prestador_idx on public.agenda_slots (prestador_id, data);
alter table public.agenda_slots enable row level security;

comment on table public.agenda_slots is
  'Horário que um prestador de serviço oferece. Status livre->pendente (cliente pediu)->confirmado '
  '(prestador aceitou, vira um registro em servicos). Ver DESIGN_MEAJUDAAI_V2.md.';

-- Leitura: qualquer autenticado vê slots livres (para buscar/agendar); o
-- prestador dono vê todos os seus, em qualquer status.
create policy "agenda_slots_select" on public.agenda_slots
  for select to authenticated
  using (status = 'livre' or prestador_id = auth.uid() or public.current_app_role() = 'sysadmin');

-- Escrita: só o próprio prestador cria/edita/remove os seus horários.
create policy "agenda_slots_insert_own" on public.agenda_slots
  for insert to authenticated with check (prestador_id = auth.uid());
create policy "agenda_slots_update_own" on public.agenda_slots
  for update to authenticated using (prestador_id = auth.uid()) with check (prestador_id = auth.uid());
create policy "agenda_slots_delete_own" on public.agenda_slots
  for delete to authenticated using (prestador_id = auth.uid() and status = 'livre');

create table public.servicos (
  id             uuid primary key default gen_random_uuid(),
  slot_id        uuid not null references public.agenda_slots(id) on delete restrict,
  cliente_id     uuid not null references auth.users(id) on delete cascade,
  prestador_id   uuid not null references auth.users(id) on delete cascade,
  descricao      text not null,
  preco_tipo     text not null check (preco_tipo in ('hora','servico')),
  preco_valor    numeric(10,2) not null,
  status         text not null default 'pendente' check (status in ('pendente','confirmado','realizado','cancelado')),
  cancelado_motivo text,
  cancelado_em   timestamptz,
  created_at     timestamptz not null default now(),
  unique (slot_id)
);
create index servicos_prestador_idx on public.servicos (prestador_id, created_at desc);
create index servicos_cliente_idx on public.servicos (cliente_id, created_at desc);
alter table public.servicos enable row level security;

comment on table public.servicos is
  'Nasce quando um cliente reserva um agenda_slots. preco_tipo/preco_valor herdam a config do '
  'perfil do prestador no momento da reserva (histórico não muda se o prestador reconfigurar depois). '
  'Renegociação de valor é feita à parte (ver ROADMAP.md §6.3) — não altera preco_valor diretamente, '
  'fica registrada como log (fase futura). Cancelamento exige justificativa em cancelado_motivo.';

create policy "servicos_select_parties" on public.servicos
  for select to authenticated
  using (cliente_id = auth.uid() or prestador_id = auth.uid() or public.current_app_role() in ('sysadmin','admin'));

-- Inserção: o próprio cliente cria a solicitação (a action valida que o slot está livre e o marca pendente).
create policy "servicos_insert_cliente" on public.servicos
  for insert to authenticated with check (cliente_id = auth.uid());

-- Atualização: cliente só pode cancelar o próprio serviço; prestador confirma, marca realizado, ou cancela com justificativa.
create policy "servicos_update_parties" on public.servicos
  for update to authenticated
  using (cliente_id = auth.uid() or prestador_id = auth.uid())
  with check (cliente_id = auth.uid() or prestador_id = auth.uid());
