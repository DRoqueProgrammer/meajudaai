-- 0033: coordenada APROXIMADA de profile_local, pro mapa funcionar sem vazar
-- o endereço exato de ninguém. Mesmo molde do antigo `vagas.local_aprox_lat/lng`
-- (migration 0014), agora para o modelo P2P v2 (profile_local). A questão
-- levantada por Leonardo: `/mapa` (app/(app)/mapa/page.tsx) ainda era 100% do
-- modelo v1 (vagas/workspace) e não usava profile_local em nada.
--
-- `lat_aprox`/`lng_aprox` recebem um deslocamento aleatório de até ~800m da
-- coordenada real, gravado UMA VEZ (trigger abaixo, só recalcula se lat/lng
-- mudar) — não a cada leitura, senão a média de várias leituras aproximaria
-- a posição real. Essas duas colunas são seguras pra expor a qualquer
-- autenticado; lat/lng continuam owner+sysadmin-only (policy da 0023, intocada).

alter table public.profile_local
  add column if not exists lat_aprox double precision,
  add column if not exists lng_aprox double precision;

comment on column public.profile_local.lat_aprox is
  'Latitude aproximada (deslocamento aleatório fixo de até ~800m da real), calculada uma única '
  'vez pelo trigger profile_local_aproximado. Segura pra exibir num mapa a qualquer autenticado — '
  'nunca é a coordenada real do PIN.';
comment on column public.profile_local.lng_aprox is
  'Longitude aproximada — ver comentário de lat_aprox.';

-- Backfill pontual pra quem já tinha PIN antes desta coluna existir.
update public.profile_local
set lat_aprox = lat + (random() - 0.5) * 0.014,
    lng_aprox = lng + (random() - 0.5) * 0.014
where lat_aprox is null;

create or replace function public.gerar_local_aproximado()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or old.lat is distinct from new.lat or old.lng is distinct from new.lng then
    new.lat_aprox := new.lat + (random() - 0.5) * 0.014;
    new.lng_aprox := new.lng + (random() - 0.5) * 0.014;
  end if;
  return new;
end;
$$;

comment on function public.gerar_local_aproximado() is
  'Trigger de profile_local: gera (ou regenera, só se o PIN real mudou) o par lat_aprox/lng_aprox '
  '— deslocamento aleatório fixo de até ~800m, nunca recalculado à toa pra não vazar a posição '
  'real por média de várias leituras.';

drop trigger if exists profile_local_aproximado on public.profile_local;
create trigger profile_local_aproximado
  before insert or update on public.profile_local
  for each row execute function public.gerar_local_aproximado();

-- buscar_prestadores_proximos (0026) passa a devolver também o pino
-- aproximado, pro cliente ver os prestadores num mapa (não só numa lista).
-- `drop` antes do `create`: mudar o shape das colunas de retorno não é
-- permitido via `create or replace` (o Postgres exige o mesmo row type).
drop function if exists public.buscar_prestadores_proximos(text);
create function public.buscar_prestadores_proximos(p_categoria text default null)
returns table (
  prestador_id uuid, nome text, categoria text, preco_tipo text, preco_valor numeric,
  distancia_km numeric, lat_aprox double precision, lng_aprox double precision
)
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
    )::numeric, 1) end as distancia_km,
    pl.lat_aprox,
    pl.lng_aprox
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
  'SECURITY DEFINER: lê profile_local de terceiros só pra calcular a distância e devolver o pino '
  'aproximado (lat_aprox/lng_aprox) — nunca lat/lng reais.';

revoke execute on function public.buscar_prestadores_proximos(text) from anon, public;
grant execute on function public.buscar_prestadores_proximos(text) to authenticated;

-- Espelho pro prestador: pino aproximado dos clientes com quem ele tem um
-- serviço pendente ou confirmado — o mapa dele mostra a agenda de campo, não
-- "vagas abertas" (que não existe mais no modelo P2P).
create or replace function public.meus_clientes_no_mapa()
returns table (
  cliente_id uuid, nome text, servico_id uuid, status text,
  lat_aprox double precision, lng_aprox double precision
)
language sql stable security definer set search_path = public as $$
  select distinct on (s.cliente_id)
    s.cliente_id, p.nome, s.id, s.status, pl.lat_aprox, pl.lng_aprox
  from public.servicos s
  join public.profiles p on p.user_id = s.cliente_id
  left join public.profile_local pl on pl.user_id = s.cliente_id
  where s.prestador_id = auth.uid()
    and s.status in ('pendente', 'confirmado')
  order by s.cliente_id, s.created_at desc;
$$;

comment on function public.meus_clientes_no_mapa() is
  'Pra quem chama (o prestador autenticado): pino aproximado de cada cliente com serviço pendente '
  'ou confirmado. SECURITY DEFINER: lê profile_local de terceiros só pra devolver o pino '
  'aproximado — nunca a coordenada real.';

revoke execute on function public.meus_clientes_no_mapa() from anon, public;
grant execute on function public.meus_clientes_no_mapa() to authenticated;
