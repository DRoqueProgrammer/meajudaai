-- 0008: RBAC — 4 papéis globais (sysadmin / admin / funcionario / ajudante),
-- espelhando o CareConnect (sysadmin > gestao > administrativo > campo).
--   sysadmin    — donos da plataforma; moderam, veem tudo (god-mode das policies)
--   admin       — dono/gestor de empresa(s); publica vagas, gere equipe e módulos
--   funcionario — subordinado ao admin; acesso por módulo (ver 0009_user_modules)
--   ajudante    — candidata-se às vagas
--
-- Migração de dados: admin(plataforma)->sysadmin, profissional->admin.
-- O god-mode das policies (current_app_role()='admin') passa a exigir 'sysadmin'.

do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.profiles'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%tipo_base%';
  if c is not null then execute format('alter table public.profiles drop constraint %I', c); end if;
end $$;

update public.profiles set tipo_base = 'sysadmin' where tipo_base = 'admin';
update public.profiles set tipo_base = 'admin'    where tipo_base = 'profissional';

alter table public.profiles
  add constraint profiles_tipo_base_check
  check (tipo_base in ('sysadmin','admin','funcionario','ajudante'));

-- god-mode das policies: 'admin' (plataforma) -> 'sysadmin'
drop policy if exists "pii_select_self_or_admin" on public.profiles_pii;
create policy "pii_select_self_or_admin" on public.profiles_pii
  for select to authenticated
  using (auth.uid() = user_id or public.current_app_role() = 'sysadmin');

drop policy if exists "ws_select_member" on public.workspaces;
create policy "ws_select_member" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id) or public.current_app_role() = 'sysadmin');

drop policy if exists "wsm_select_member" on public.workspace_members;
create policy "wsm_select_member" on public.workspace_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.current_app_role() = 'sysadmin');

drop policy if exists "vagas_select" on public.vagas;
create policy "vagas_select" on public.vagas
  for select to authenticated using (
    status = 'aberta'
    or public.is_workspace_member(workspace_id)
    or public.current_app_role() = 'sysadmin'
    or public.is_candidato(id)
  );

drop policy if exists "cand_select" on public.candidaturas;
create policy "cand_select" on public.candidaturas
  for select to authenticated using (
    ajudante_id = auth.uid()
    or public.can_manage_vaga(vaga_id)
    or public.current_app_role() = 'sysadmin'
  );

drop policy if exists "denuncias_select_own_or_admin" on public.denuncias;
create policy "denuncias_select_own_or_admin" on public.denuncias
  for select to authenticated
  using (denunciante_id = auth.uid() or public.current_app_role() = 'sysadmin');

drop policy if exists "denuncias_update_admin" on public.denuncias;
create policy "denuncias_update_admin" on public.denuncias
  for update to authenticated
  using (public.current_app_role() = 'sysadmin')
  with check (public.current_app_role() = 'sysadmin');
