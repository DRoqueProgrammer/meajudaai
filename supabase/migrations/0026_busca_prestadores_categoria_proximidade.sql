-- 0026: categoria do prestador + busca por proximidade sem expor coordenada.
-- ADR 0012 exige que profile_local nunca vaze pra quem não é dono — então o
-- cálculo de distância roda dentro de uma função SECURITY DEFINER que só
-- devolve prestador_id + distancia_km, nunca lat/lng. Ver ROADMAP.md §2.4/§9.

alter table public.profiles add column if not exists categoria text;
comment on column public.profiles.categoria is
  'Categoria de serviço do prestador (slug de categorias_servico, ex.: ajudante_encanador). '
  'Só tem sentido para tipo_base=prestador_servico. Usado na busca do cliente.';

create or replace function public.buscar_prestadores_proximos(p_categoria text default null)
returns table (prestador_id uuid, nome text, categoria text, preco_tipo text, preco_valor numeric, distancia_km numeric)
language sql stable security definer set search_path = public as $$
  with quem_busca as (
    select lat, lng from public.profile_local where user_id = auth.uid()
  )
  select
    p.user_id,
    p.nome,
    p.categoria,
    p.preco_tipo,
    p.preco_valor,
    case when qb.lat is null or pl.lat is null then null else round((
      6371 * acos(least(1, greatest(-1,
        cos(radians(qb.lat)) * cos(radians(pl.lat)) * cos(radians(pl.lng) - radians(qb.lng))
        + sin(radians(qb.lat)) * sin(radians(pl.lat))
      )))
    )::numeric, 1) end as distancia_km
  from public.profiles p
  left join public.profile_local pl on pl.user_id = p.user_id
  cross join quem_busca qb
  where p.tipo_base = 'prestador_servico'
    and p.preco_tipo is not null
    and (p_categoria is null or p.categoria = p_categoria)
  order by distancia_km nulls last, p.nome;
$$;

comment on function public.buscar_prestadores_proximos(text) is
  'Busca de prestadores por categoria, ordenada por distância até quem busca (auth.uid()). '
  'SECURITY DEFINER: lê profile_local de terceiros só para calcular a distância — nunca devolve '
  'lat/lng, só o número em km. Se quem busca não tem profile_local, distancia_km vem null (sem ordenar).';

revoke execute on function public.buscar_prestadores_proximos(text) from anon, public;
grant execute on function public.buscar_prestadores_proximos(text) to authenticated;
