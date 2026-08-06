-- 0010: fecha as escritas do marketplace no banco, em vez de confiar em
-- checagem no código. Até aqui as server actions escreviam com service_role
-- (RLS ignorada) e não verificavam participação na vaga — qualquer autenticado
-- podia mandar mensagem para qualquer pessoa, avaliar qualquer pessoa e se
-- candidatar a vaga fechada. As actions passam a usar o client de sessão.

-- Participante da diária: o ajudante candidato OU alguém do workspace da vaga.
-- SECURITY DEFINER para não disparar a RLS de vagas/candidaturas por dentro
-- (mesma razão de is_candidato/can_manage_vaga em 0004).
create or replace function public.is_parte_vaga(v_vaga uuid, v_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidaturas c
    where c.vaga_id = v_vaga and c.ajudante_id = v_user
  ) or exists (
    select 1 from public.vagas v
    join public.workspace_members m on m.workspace_id = v.workspace_id
    where v.id = v_vaga and m.user_id = v_user
  )
$$;

create or replace function public.vaga_aberta(v_vaga uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vagas v where v.id = v_vaga and v.status = 'aberta')
$$;

revoke execute on function public.is_parte_vaga(uuid, uuid) from anon, public;
revoke execute on function public.vaga_aberta(uuid) from anon, public;
grant execute on function public.is_parte_vaga(uuid, uuid) to authenticated;
grant execute on function public.vaga_aberta(uuid) to authenticated;

-- mensagens: remetente e destinatário precisam ser partes da mesma diária
drop policy if exists "msg_insert_sender" on public.mensagens;
create policy "msg_insert_sender" on public.mensagens
  for insert to authenticated with check (
    remetente_id = auth.uid()
    and destinatario_id <> auth.uid()
    and public.is_parte_vaga(vaga_id, auth.uid())
    and public.is_parte_vaga(vaga_id, destinatario_id)
  );

-- avaliações: só entre quem trabalhou junto na diária, e nunca de si mesmo
drop policy if exists "aval_insert_self" on public.avaliacoes;
create policy "aval_insert_self" on public.avaliacoes
  for insert to authenticated with check (
    avaliador_id = auth.uid()
    and avaliado_id <> auth.uid()
    and vaga_id is not null
    and public.is_parte_vaga(vaga_id, auth.uid())
    and public.is_parte_vaga(vaga_id, avaliado_id)
  );

-- candidaturas: só em vaga aberta, e o gestor da vaga não se candidata à própria
drop policy if exists "cand_insert_self" on public.candidaturas;
create policy "cand_insert_self" on public.candidaturas
  for insert to authenticated with check (
    ajudante_id = auth.uid()
    and public.vaga_aberta(vaga_id)
    and not public.can_manage_vaga(vaga_id)
  );
