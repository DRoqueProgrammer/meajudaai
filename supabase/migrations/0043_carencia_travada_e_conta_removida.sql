-- 0043: revisão do controller sobre o lote 2B da Fatia 2 (direitos do titular,
-- D-023). Quatro ajustes que a 0042 deixou em aberto:
--
-- 1. A carência de 7 dias só existia no default da coluna: com a policy de
--    insert/update da 0042, uma sessão chamando a API REST direto podia criar o
--    pedido já com `pode_processar_em` no passado, ou reabrir um pedido
--    cancelado antigo — e o cron anonimizava no dia seguinte. A carência é o
--    que protege a pessoa de uma sessão sequestrada; um gatilho passa a ser
--    quem define as datas e o único caminho de mudança (pendente -> cancelado).
-- 2. Conta anonimizada ganha estado próprio em `profiles.status` ('removido'),
--    diferente de 'inativo' (que a própria pessoa reativa ao entrar de novo).
-- 3. A busca de prestadores não olhava `status`: conta inativa, bloqueada ou
--    removida continuava aparecendo na lista e no mapa. Passa a listar só 'ativo'.
-- 4. Pelo mesmo motivo, a reserva passa a exigir prestador com conta ativa.

-- 1) Carência travada ---------------------------------------------------------
create or replace function public.guardar_pedido_exclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Cron e scripts (chave de serviço/postgres) concluem o pedido livremente.
  if public.is_chamada_privilegiada() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pendente';
    new.solicitado_em := now();
    new.pode_processar_em := now() + interval '7 days';
    new.cancelado_em := null;
    new.concluido_em := null;
    return new;
  end if;

  -- UPDATE por sessão: a única mudança possível é desistir de um pedido pendente.
  if old.status <> 'pendente' or new.status <> 'cancelado' then
    raise exception 'pedido de exclusão: só é possível desistir de um pedido pendente'
      using errcode = '42501';
  end if;
  new.id := old.id;
  new.user_id := old.user_id;
  new.solicitado_em := old.solicitado_em;
  new.pode_processar_em := old.pode_processar_em;
  new.cancelado_em := now();
  new.concluido_em := null;
  return new;
end;
$$;

comment on function public.guardar_pedido_exclusao() is
  'Gatilho de pedidos_exclusao (migration 0043): numa sessão comum, o pedido sempre nasce pendente '
  'com 7 dias de carência contados do now() do banco, e a única mudança aceita depois é '
  'pendente -> cancelado (desistirDaExclusaoAction). Chave de serviço/postgres passam direto — é '
  'o cron (app/api/cron/titular) que marca o pedido como concluido.';

drop trigger if exists pedidos_exclusao_guarda on public.pedidos_exclusao;
create trigger pedidos_exclusao_guarda
  before insert or update on public.pedidos_exclusao
  for each row execute function public.guardar_pedido_exclusao();

-- 2) Estado 'removido' --------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('ativo', 'bloqueado', 'inativo', 'removido'));

comment on column public.profiles.status is
  'ativo (padrão) · bloqueado (banido por moderação) · inativo (o próprio usuário desativou — '
  'reativa ao logar de novo, confirmando os dados) · removido (anonimizado a pedido do titular, '
  'D-023 — lib/titular/anonimizar.ts; não volta). Nunca deletamos uma conta.';

-- 3) Busca só com conta ativa -------------------------------------------------
-- Mesma assinatura e mesmo retorno da 0033: `create or replace` mantém os
-- grants (só authenticated executa) e o comentário é reescrito abaixo.
create or replace function public.buscar_prestadores_proximos(p_categoria text default null)
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
    and p.status = 'ativo'
    and p.preco_tipo is not null
    and (p_categoria is null or p.categoria = p_categoria)
  order by distancia_km nulls last, p.nome;
$$;

comment on function public.buscar_prestadores_proximos(text) is
  'Busca de prestadores ATIVOS (status = ativo; migration 0043) por categoria, ordenada por distância '
  'até quem busca (auth.uid()). SECURITY DEFINER: lê profile_local de terceiros só pra calcular a '
  'distância e devolver o pino aproximado (lat_aprox/lng_aprox) — nunca lat/lng reais.';

-- 4) Reserva só com prestador ativo -------------------------------------------
-- A 0038 conferia o horário livre e o preço, mas não o estado da conta: pelo
-- link direto, dava para reservar horário de prestador inativo, bloqueado ou
-- removido. Mesma policy, com uma condição a mais (p.status = 'ativo').
drop policy if exists "servicos_insert_cliente" on public.servicos;
create policy "servicos_insert_cliente" on public.servicos
  for insert to authenticated
  with check (
    servicos.cliente_id = auth.uid()
    and servicos.status = 'pendente'
    and exists (
      select 1 from public.agenda_slots a
       where a.id = servicos.slot_id
         and a.status = 'livre'
         and a.prestador_id = servicos.prestador_id
    )
    and exists (
      select 1 from public.profiles p
       where p.user_id = servicos.prestador_id
         and p.status = 'ativo'
         and p.preco_tipo = servicos.preco_tipo
         and p.preco_valor = servicos.preco_valor
    )
  );

comment on policy "servicos_insert_cliente" on public.servicos is
  'R-37 (ADR 0010) + migration 0043: o cliente dono só nasce um serviço pendente, sobre um horário livre '
  'do prestador indicado, que precisa estar com a conta ATIVA, com preco_tipo/preco_valor iguais ao perfil '
  'desse prestador nesse instante. Sub-consultas em agenda_slots e profiles seguem a RLS dessas tabelas para '
  'a sessão que insere (ambas liberam leitura suficiente: agenda_slots por status=livre, profiles por '
  'profiles_select_all). Não se aplica à service_role nem ao role postgres, que sempre ignoram RLS — scripts '
  'de seed continuam livres.';
