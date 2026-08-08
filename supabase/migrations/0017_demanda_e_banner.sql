-- 0017: demanda reprimida + banner da home
--
-- demanda_servico — sinal "procuro {categoria} em {cidade}", capturado na busca
--   de vagas sem resultado. Qualquer autenticado registra a PRÓPRIA demanda;
--   1 por (user, categoria, cidade) para a contagem refletir pessoas, não cliques.
-- home_banner — texto único (singleton id=1) que o sysadmin liga/desliga; quando
--   ativo aparece na home para todos.

create table public.demanda_servico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null,
  cidade text not null,
  created_at timestamptz not null default now(),
  unique (user_id, categoria, cidade)
);
create index demanda_servico_cat_cidade_idx on public.demanda_servico (categoria, cidade);

alter table public.demanda_servico enable row level security;

create policy "demanda_insert_own" on public.demanda_servico
  for insert to authenticated
  with check (user_id = auth.uid());

-- lê a própria linha (estado "já avisou") ou tudo se sysadmin (o agregado)
create policy "demanda_select_own_or_sysadmin" on public.demanda_servico
  for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'sysadmin');

create table public.home_banner (
  id smallint primary key default 1 check (id = 1),
  texto text not null default '',
  ativo boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.home_banner enable row level security;

-- todos leem quando ativo; sysadmin lê sempre (para editar com ativo=false)
create policy "banner_select_active_or_sysadmin" on public.home_banner
  for select to authenticated
  using (ativo or public.current_app_role() = 'sysadmin');

create policy "banner_insert_sysadmin" on public.home_banner
  for insert to authenticated
  with check (public.current_app_role() = 'sysadmin');

create policy "banner_update_sysadmin" on public.home_banner
  for update to authenticated
  using (public.current_app_role() = 'sysadmin')
  with check (public.current_app_role() = 'sysadmin');
