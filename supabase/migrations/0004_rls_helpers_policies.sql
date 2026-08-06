-- Helpers SECURITY DEFINER: não disparam RLS por dentro, evitando recursão
-- entre as policies de `vagas` e `candidaturas`.

create or replace function public.is_candidato(v_vaga uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidaturas c
    where c.vaga_id = v_vaga and c.ajudante_id = auth.uid()
  )
$$;

create or replace function public.can_manage_vaga(v_vaga uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vagas v
    join public.workspace_members m on m.workspace_id = v.workspace_id
    where v.id = v_vaga and m.user_id = auth.uid()
  )
$$;

revoke execute on function public.is_candidato(uuid) from anon, public;
revoke execute on function public.can_manage_vaga(uuid) from anon, public;
grant execute on function public.is_candidato(uuid) to authenticated;
grant execute on function public.can_manage_vaga(uuid) to authenticated;

-- vagas: aberta OU membro do workspace OU admin OU candidato à vaga
create policy "vagas_select" on public.vagas
  for select to authenticated using (
    status = 'aberta'
    or public.is_workspace_member(workspace_id)
    or public.current_app_role() = 'admin'
    or public.is_candidato(id)
  );

-- candidaturas: dono da candidatura OU gestor da vaga OU admin
create policy "cand_select" on public.candidaturas
  for select to authenticated using (
    ajudante_id = auth.uid()
    or public.can_manage_vaga(vaga_id)
    or public.current_app_role() = 'admin'
  );
