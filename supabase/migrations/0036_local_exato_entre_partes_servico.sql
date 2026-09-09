-- 0036: localização EXATA (profile_local.lat/lng) liberada entre as partes de
-- um serviço — exatamente a "Fase C" que a migration 0023 já previa no
-- comentário original ("a outra parte de um serviço ativo também pode ler
-- entra quando a tabela servicos existir"). Sem isso o prestador não tem
-- como saber o endereço real de onde vai trabalhar depois de confirmado.
-- Reaproveita tem_servico_com(uuid) (migration 0027), mesma função já usada
-- pra liberar profiles_pii entre as partes.

drop policy if exists "profile_local_select_own_or_sysadmin" on public.profile_local;
create policy "profile_local_select_own_or_sysadmin_or_parte" on public.profile_local
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.current_app_role() = 'sysadmin'
    or public.tem_servico_com(user_id)
  );

comment on table public.profile_local is
  'Coordenada EXATA do PIN de localização (Cliente ou Prestador de Serviço). RLS: o próprio dono, '
  'sysadmin, ou a outra parte de um serviço em comum (tem_servico_com, migration 0027/0036) — nunca '
  'exposta de outra forma (nunca via SECURITY DEFINER de busca/mapa, que só devolvem distância ou '
  'lat_aprox/lng_aprox, ver migration 0033).';
