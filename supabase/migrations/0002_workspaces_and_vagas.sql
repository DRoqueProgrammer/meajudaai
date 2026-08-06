create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cidade text,
  estado text,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'membro' check (role in ('owner','membro')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  )
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "ws_select_member" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id) or public.current_app_role() = 'admin');
create policy "wsm_select_member" on public.workspace_members
  for select to authenticated using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.current_app_role() = 'admin');

create table public.vagas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  criado_por uuid not null references auth.users(id),
  titulo text not null,
  categoria text not null,
  descricao text,
  cidade text not null,
  bairro text,
  cep text,
  data_servico date,
  hora_inicio time,
  valor_diaria numeric(10,2) not null default 0,
  quantidade_vagas integer not null default 1,
  status text not null default 'aberta' check (status in ('aberta','em_andamento','finalizada','cancelada')),
  created_at timestamptz not null default now()
);
create index vagas_workspace_idx on public.vagas(workspace_id);
create index vagas_cidade_idx on public.vagas(cidade);
create index vagas_status_idx on public.vagas(status);

alter table public.vagas enable row level security;
-- Nota: a policy de select de vagas é definida na migration 0006 (versão final, sem recursão).

-- Hardening aplicado na sequência (migration 0004):
revoke execute on function public.is_workspace_member(uuid) from anon, public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
