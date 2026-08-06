-- 0007: denúncias — moderação de usuários, vagas, avaliações e mensagens
-- (escopo do Administrador). Alvo polimórfico (alvo_tipo + alvo_id).
-- RLS: o denunciante cria/vê a própria denúncia; apenas admin vê tudo e modera.
-- current_app_role() vem de 0001 (lê app_role do JWT, populado pelo auth hook).

create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null references auth.users(id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('usuario','vaga','avaliacao','mensagem')),
  alvo_id uuid not null,
  motivo text not null check (motivo in ('spam','fraude','abuso','nao_compareceu','conteudo_improprio','outro')),
  detalhe text,
  status text not null default 'aberta' check (status in ('aberta','em_analise','resolvida','descartada')),
  resolucao text,
  resolvido_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists denuncias_status_idx on public.denuncias(status);
create index if not exists denuncias_alvo_idx on public.denuncias(alvo_tipo, alvo_id);
create index if not exists denuncias_denunciante_idx on public.denuncias(denunciante_id);

alter table public.denuncias enable row level security;

create policy "denuncias_insert_self" on public.denuncias
  for insert to authenticated
  with check (denunciante_id = auth.uid());

create policy "denuncias_select_own_or_admin" on public.denuncias
  for select to authenticated
  using (denunciante_id = auth.uid() or public.current_app_role() = 'admin');

create policy "denuncias_update_admin" on public.denuncias
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- Seed de exemplo (idempotente) — usa usuários/vagas semeados em 0005.
insert into public.denuncias (id, denunciante_id, alvo_tipo, alvo_id, motivo, detalhe, status) values
  ('d0000001-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','usuario','11111111-1111-4111-8111-111111111111','nao_compareceu','Combinou a diária e não apareceu na obra.','aberta'),
  ('d0000002-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','usuario','22222222-2222-4222-8222-222222222222','abuso','Mensagens ofensivas no chat durante a combinação.','em_analise'),
  ('d0000003-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','vaga','44444444-4444-4444-8444-444444444444','conteudo_improprio','Descrição com informação enganosa sobre o valor.','aberta')
on conflict (id) do nothing;
