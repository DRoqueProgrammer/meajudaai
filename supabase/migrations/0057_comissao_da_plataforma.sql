-- 0057: comissão da plataforma (ROADMAP.md §16; decisão D-044 — as 7 lacunas
-- respondidas pelo Leonardo em 11/09/2026).
--
-- - Quem cobra: a praça da cidade do prestador (mesma cidade/UF e mesmo mundo,
--   exemplo ou real — a regra do limite de anúncios; com mais de uma, a mais
--   antiga). O Pix vai para a chave PADRÃO do Administrador responsável pela
--   praça (workspaces.owner_id, chaves_pix).
-- - Alíquota em quatro níveis, vence o mais específico: prestador + tipo de
--   serviço > prestador > tipo na praça > geral da praça; sem nada, 0%.
-- - Gera quando o serviço vira REALIZADO, sobre o valor final (preco_valor já
--   renegociado), com a alíquota congelada nesse instante. Nada retroativo.
-- - A dívida acumula; o prestador informa o pagamento ("Enviei o Pix") e o
--   Administrador confirma ou recusa. Atraso de 7 dias só destaca no painel.
--
-- Escrita só pela chave de serviço (as actions de lib/actions/comissao.ts
-- conferem papel e alcance antes) e pelo gatilho do banco. O prestador lê as
-- próprias comissões e pagamentos.

-- 1) Alíquotas ----------------------------------------------------------------
create table public.aliquotas_comissao (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  prestador_id  uuid references auth.users(id) on delete cascade,
  tipo_servico  text references public.tipos_servico(slug),
  percentual    numeric(5,2) not null check (percentual >= 0 and percentual <= 50),
  definido_por  uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create unique index aliquotas_comissao_unica
  on public.aliquotas_comissao (workspace_id, prestador_id, tipo_servico) nulls not distinct;

alter table public.aliquotas_comissao enable row level security;
-- Sem policy: a sessão não lê nem escreve; o prestador vê a alíquota vigente
-- pela função aliquota_de(), a administração pelo servidor.

comment on table public.aliquotas_comissao is
  'Alíquotas da comissão da plataforma por praça (migration 0057, D-044). Linha com prestador_id e '
  'tipo_servico nulos = geral da praça; só tipo = por tipo na praça; só prestador = do prestador; os dois = '
  'prestador + tipo. Vence o mais específico (aliquota_de). Escrita só pela chave de serviço.';
comment on column public.aliquotas_comissao.id is 'PK (uuid gerado).';
comment on column public.aliquotas_comissao.workspace_id is 'Praça que cobra.';
comment on column public.aliquotas_comissao.prestador_id is 'Prestador (null = vale para todos da praça).';
comment on column public.aliquotas_comissao.tipo_servico is 'Tipo de serviço (null = todos os tipos).';
comment on column public.aliquotas_comissao.percentual is 'Percentual sobre o valor do serviço (0 a 50).';
comment on column public.aliquotas_comissao.definido_por is 'Administrador (ou SysAdmin) que definiu.';
comment on column public.aliquotas_comissao.atualizado_em is 'Última alteração.';

-- 2) Praça que cobra o prestador e a alíquota vigente --------------------------
create or replace function public.praca_do_prestador(p_prestador uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id
    from public.workspaces w, public.profiles a
   where a.user_id = p_prestador
     and a.tipo_base = 'prestador_servico'
     and w.cidade = a.cidade
     and w.estado = a.estado
     and (
       exists (select 1 from public.profiles d where d.user_id = w.owner_id and d.exemplo)
       or exists (
         select 1 from public.workspace_members m
           join public.profiles d on d.user_id = m.user_id
          where m.workspace_id = w.id and d.exemplo
       )
     ) = a.exemplo
   order by w.created_at asc
   limit 1;
$$;

comment on function public.praca_do_prestador(uuid) is
  'A praça que cobra a comissão de um prestador (migration 0057, D-044): mesma cidade/UF e mesmo mundo '
  '(exemplo ou real); com mais de uma, a mais antiga. Null = nenhuma praça cobra (alíquota 0).';
revoke execute on function public.praca_do_prestador(uuid) from anon, public;
grant execute on function public.praca_do_prestador(uuid) to authenticated;

create or replace function public.aliquota_de(p_prestador uuid, p_tipo text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with praca as (select public.praca_do_prestador(p_prestador) as id),
  quem_pode as (
    select public.is_chamada_privilegiada()
        or auth.uid() = p_prestador
        or exists (
          select 1 from public.profiles q where q.user_id = auth.uid() and q.tipo_base in ('admin', 'sysadmin')
        ) as ok
  )
  select case when not (select ok from quem_pode) then null else coalesce(
    (select a.percentual from public.aliquotas_comissao a, praca
      where a.workspace_id = praca.id and a.prestador_id = p_prestador and a.tipo_servico = p_tipo),
    (select a.percentual from public.aliquotas_comissao a, praca
      where a.workspace_id = praca.id and a.prestador_id = p_prestador and a.tipo_servico is null),
    (select a.percentual from public.aliquotas_comissao a, praca
      where a.workspace_id = praca.id and a.prestador_id is null and a.tipo_servico = p_tipo),
    (select a.percentual from public.aliquotas_comissao a, praca
      where a.workspace_id = praca.id and a.prestador_id is null and a.tipo_servico is null),
    0
  ) end;
$$;

comment on function public.aliquota_de(uuid, text) is
  'Alíquota vigente da comissão para um prestador e um tipo de serviço (migration 0057, D-044): prestador + '
  'tipo > prestador > tipo na praça > geral da praça > 0. Só o próprio prestador, a administração e a chave '
  'de serviço recebem o número (os outros, null).';
revoke execute on function public.aliquota_de(uuid, text) from anon, public;
grant execute on function public.aliquota_de(uuid, text) to authenticated;

-- 3) Pagamentos e comissões ----------------------------------------------------
create table public.pagamentos_comissao (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  valor         numeric(12,2) not null check (valor > 0),
  status        text not null default 'informado' check (status in ('informado', 'confirmado', 'recusado')),
  informado_em  timestamptz not null default now(),
  decidido_por  uuid references auth.users(id) on delete set null,
  decidido_em   timestamptz,
  observacao    text check (observacao is null or char_length(observacao) <= 300)
);

create unique index pagamentos_comissao_um_informado
  on public.pagamentos_comissao (prestador_id)
  where status = 'informado';

alter table public.pagamentos_comissao enable row level security;
create policy "pagamentos_comissao_select_own" on public.pagamentos_comissao
  for select to authenticated using (prestador_id = auth.uid());

comment on table public.pagamentos_comissao is
  'Pagamentos de comissão informados pelo prestador ("Enviei o Pix") e decididos pelo Administrador da praça '
  '(migration 0057, D-044). No máximo um "informado" por vez. O prestador lê os próprios; escrita só pela '
  'chave de serviço.';
comment on column public.pagamentos_comissao.id is 'PK (uuid gerado).';
comment on column public.pagamentos_comissao.prestador_id is 'Quem pagou.';
comment on column public.pagamentos_comissao.workspace_id is 'Praça que recebe.';
comment on column public.pagamentos_comissao.valor is 'Valor informado (o saldo em aberto no momento).';
comment on column public.pagamentos_comissao.status is 'informado (aguarda o Administrador) · confirmado (recebido) · recusado (não recebido).';
comment on column public.pagamentos_comissao.informado_em is 'Quando o prestador clicou "Enviei o Pix".';
comment on column public.pagamentos_comissao.decidido_por is 'Administrador (ou SysAdmin) que confirmou ou recusou.';
comment on column public.pagamentos_comissao.decidido_em is 'Quando foi decidido.';
comment on column public.pagamentos_comissao.observacao is 'Nota do Administrador ("recebi às 14h", "não caiu").';

create table public.comissoes (
  id            uuid primary key default gen_random_uuid(),
  servico_id    uuid not null unique references public.servicos(id) on delete cascade,
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  tipo_servico  text,
  base          numeric(12,2) not null check (base >= 0),
  percentual    numeric(5,2) not null check (percentual > 0 and percentual <= 50),
  valor         numeric(12,2) not null check (valor >= 0),
  status        text not null default 'em_aberto' check (status in ('em_aberto', 'informada', 'paga')),
  pagamento_id  uuid references public.pagamentos_comissao(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index comissoes_prestador_idx on public.comissoes (prestador_id, status, created_at);
create index comissoes_praca_idx on public.comissoes (workspace_id, status, created_at);

alter table public.comissoes enable row level security;
create policy "comissoes_select_own" on public.comissoes
  for select to authenticated using (prestador_id = auth.uid());

comment on table public.comissoes is
  'Comissão devida por serviço realizado (migration 0057, D-044): nasce pelo gatilho quando o serviço vira '
  'realizado, com a alíquota congelada. em_aberto → informada (o prestador informou o Pix) → paga (o '
  'Administrador confirmou); recusado o pagamento, volta a em_aberto. O prestador lê as próprias.';
comment on column public.comissoes.id is 'PK (uuid gerado).';
comment on column public.comissoes.servico_id is 'O serviço realizado (uma comissão por serviço).';
comment on column public.comissoes.prestador_id is 'Quem deve.';
comment on column public.comissoes.workspace_id is 'Praça que cobra.';
comment on column public.comissoes.tipo_servico is 'Tipo do serviço no momento em que foi realizado.';
comment on column public.comissoes.base is 'Valor do serviço (preco_valor final) sobre o qual incide.';
comment on column public.comissoes.percentual is 'Alíquota congelada no momento do realizado.';
comment on column public.comissoes.valor is 'Comissão = base × percentual, arredondada em centavos.';
comment on column public.comissoes.status is 'em_aberto · informada · paga.';
comment on column public.comissoes.pagamento_id is 'Pagamento que a quita (ou que está em análise).';
comment on column public.comissoes.created_at is 'Quando nasceu (o dia do realizado).';

-- 4) Gatilho: serviço realizado → comissão ------------------------------------
create or replace function public.gerar_comissao_do_servico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_praca uuid;
  v_pct numeric;
begin
  if new.status = 'realizado' and old.status is distinct from 'realizado' then
    v_praca := public.praca_do_prestador(new.prestador_id);
    if v_praca is null then
      return new;
    end if;
    v_pct := public.aliquota_de(new.prestador_id, new.tipo);
    if v_pct is null or v_pct <= 0 then
      return new;
    end if;
    insert into public.comissoes (servico_id, prestador_id, workspace_id, tipo_servico, base, percentual, valor)
    values (new.id, new.prestador_id, v_praca, new.tipo, new.preco_valor, v_pct, round(new.preco_valor * v_pct / 100, 2))
    on conflict (servico_id) do nothing;
  end if;
  return new;
end;
$$;

comment on function public.gerar_comissao_do_servico() is
  'Gatilho AFTER UPDATE em servicos (migration 0057, D-044): quando o serviço vira realizado, lança a comissão '
  'da praça do prestador com a alíquota vigente (congelada), se ela for maior que zero.';
revoke execute on function public.gerar_comissao_do_servico() from anon, authenticated, public;

drop trigger if exists servicos_gerar_comissao on public.servicos;
create trigger servicos_gerar_comissao
  after update of status on public.servicos
  for each row execute function public.gerar_comissao_do_servico();

-- 5) Para onde o prestador paga ------------------------------------------------
create or replace function public.destino_da_comissao()
returns table (workspace_id uuid, praca text, recebedor text, cidade text, chave text)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.nome, dono.nome, w.cidade, c.chave
    from public.workspaces w
    join public.profiles dono on dono.user_id = w.owner_id
    left join public.chaves_pix c on c.user_id = w.owner_id and c.padrao
   where w.id = public.praca_do_prestador(auth.uid());
$$;

comment on function public.destino_da_comissao() is
  'Para onde o prestador logado paga a comissão (migration 0057, D-044): a praça dele, o Administrador '
  'responsável (workspaces.owner_id) e a chave Pix PADRÃO dele — chave null se ele ainda não cadastrou.';
revoke execute on function public.destino_da_comissao() from anon, public;
grant execute on function public.destino_da_comissao() to authenticated;
