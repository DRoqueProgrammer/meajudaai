-- 0027: prestador lê telefone/e-mail (profiles_pii) de um cliente com quem
-- tem pelo menos um serviço — sem isso ele não consegue mostrar o link de
-- WhatsApp na aba de Clientes (ROADMAP.md §2.3). Mesma lógica de
-- `is_ajudante_aceito` (migration 0014): vínculo comprovado por uma tabela de
-- relação, nunca acesso amplo a profiles_pii.

create or replace function public.tem_servico_com(v_outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.servicos s
    where (s.prestador_id = auth.uid() and s.cliente_id = v_outro)
       or (s.cliente_id = auth.uid() and s.prestador_id = v_outro)
  )
$$;
revoke execute on function public.tem_servico_com(uuid) from anon, public;
grant execute on function public.tem_servico_com(uuid) to authenticated;

comment on function public.tem_servico_com(uuid) is
  'true se auth.uid() e v_outro têm ao menos um registro em servicos entre si (em qualquer status). '
  'Usado para liberar leitura de profiles_pii entre as partes de um serviço.';

drop policy if exists "pii_select_self_or_admin" on public.profiles_pii;
create policy "pii_select_self_or_admin" on public.profiles_pii
  for select to authenticated
  using (
    auth.uid() = user_id
    or public.current_app_role() = 'sysadmin'
    or public.tem_servico_com(user_id)
  );
