-- 0015: agenda do ajudante — dias de indisponibilidade (bloqueio_agenda), privados por dono.
create table public.bloqueio_agenda (
  ajudante_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  primary key (ajudante_id, data)
);
alter table public.bloqueio_agenda enable row level security;

-- RLS de dono: só o próprio ajudante lê, cria e remove os seus bloqueios.
create policy "bloqueio_select_own" on public.bloqueio_agenda
  for select to authenticated using (ajudante_id = auth.uid());
create policy "bloqueio_insert_own" on public.bloqueio_agenda
  for insert to authenticated with check (ajudante_id = auth.uid());
create policy "bloqueio_delete_own" on public.bloqueio_agenda
  for delete to authenticated using (ajudante_id = auth.uid());
