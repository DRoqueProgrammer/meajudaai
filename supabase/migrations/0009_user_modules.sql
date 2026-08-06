-- 0009: permissão de módulo por funcionário/empresa (molde CareConnect user_modules).
-- O admin liga/desliga módulos do painel para cada funcionário, por empresa.
-- Ausência de linha = default do papel (ver lib/auth/modules.ts). Ver [[rbac-roles]].
create table if not exists public.user_modules (
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module       text not null check (module in ('vagas','equipe','financeiro','relatorios')),
  allowed      boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (user_id, workspace_id, module)
);
create index if not exists user_modules_ws_idx on public.user_modules (workspace_id);
alter table public.user_modules enable row level security;

drop policy if exists "user_modules_select" on public.user_modules;
create policy "user_modules_select" on public.user_modules
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
    or public.current_app_role() = 'sysadmin'
  );

drop policy if exists "user_modules_manage" on public.user_modules;
create policy "user_modules_manage" on public.user_modules
  for all to authenticated
  using (
    (public.current_app_role() = 'admin' and public.is_workspace_member(workspace_id))
    or public.current_app_role() = 'sysadmin'
  )
  with check (
    (public.current_app_role() = 'admin' and public.is_workspace_member(workspace_id))
    or public.current_app_role() = 'sysadmin'
  );
