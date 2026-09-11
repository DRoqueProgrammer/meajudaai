-- 0044: anúncios do Prestador de Serviço (decisão do Leonardo em 10/09/2026,
-- respondendo "qual é a ação v2 do Administrador?").
--
-- O prestador publica até X anúncios ATIVOS, de dois tipos:
--   · 'servico'        — oferece o próprio serviço (aparece na busca, no perfil
--                        e na vitrine pública da página inicial; o contato
--                        continua só depois do agendamento, como no resto do app);
--   · 'vaga_ajudante'  — "Necessita-se ajudante!": o prestador procura um
--                        ajudante, que NÃO tem conta no app. A vaga aparece no
--                        mural público da página inicial, antes do login, com o
--                        WhatsApp que o prestador escolheu mostrar NAQUELA vaga.
--                        Quanto paga e como combinam é entre os dois — a
--                        plataforma não intermedeia.
-- Quem define o X é o Administrador: um padrão por praça (vale para os
-- prestadores da cidade da praça) e, se quiser, uma quantidade por prestador.
-- Sem praça nem ajuste, vale o padrão da plataforma: 3.
--
-- Mundo de exemplo (D-015/D-030): qualquer visitante abre a conta de exemplo
-- pela landing, e o anúncio aparece na página pública — então conta de exemplo
-- não escreve anúncio (os de exemplo nascem por script, com a chave de
-- serviço), e o padrão de uma praça do mundo de exemplo só vale para
-- prestadores de exemplo (e vice-versa).

-- 1) Limites ------------------------------------------------------------------
alter table public.workspaces
  add column if not exists limite_anuncios_padrao integer
    check (limite_anuncios_padrao between 0 and 50);

comment on column public.workspaces.limite_anuncios_padrao is
  'Quantos anúncios ATIVOS cada prestador da cidade desta praça pode ter (0 a 50), definido pelo '
  'Administrador da praça. Null = padrão da plataforma (3). Um ajuste por prestador '
  '(anuncio_limites) vence este número. Ver public.limite_de_anuncios(uuid).';

create table public.anuncio_limites (
  prestador_id  uuid primary key references auth.users(id) on delete cascade,
  limite        integer not null check (limite between 0 and 50),
  definido_por  uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.anuncio_limites enable row level security;

-- O prestador lê o próprio ajuste. Escrita só pela chave de serviço, depois
-- que a action do Administrador confere que ele alcança esse prestador
-- (lib/anuncios/regras.ts:adminAlcancaPrestador) — nenhuma policy de escrita.
create policy "anuncio_limites_select_own" on public.anuncio_limites
  for select to authenticated
  using (prestador_id = auth.uid());

comment on table public.anuncio_limites is
  'Ajuste, por prestador, de quantos anúncios ATIVOS ele pode ter — vence o padrão da praça. '
  'Escrito só pela chave de serviço, a partir da action do Administrador (lib/actions/anuncios.ts).';
comment on column public.anuncio_limites.prestador_id is 'Prestador de Serviço ajustado (PK, FK auth.users).';
comment on column public.anuncio_limites.limite is 'Quantidade máxima de anúncios ativos (0 a 50).';
comment on column public.anuncio_limites.definido_por is 'Administrador (ou SysAdmin) que definiu o ajuste.';
comment on column public.anuncio_limites.atualizado_em is 'Quando o ajuste foi definido pela última vez.';

-- Padrão da plataforma, num lugar só (lib/anuncios/regras.ts:LIMITE_PADRAO_PLATAFORMA espelha).
create or replace function public.limite_de_anuncios(p_prestador uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with alvo as (
    select p.user_id, p.cidade, p.estado, p.exemplo
      from public.profiles p
     where p.user_id = p_prestador
  ),
  pracas as (
    -- Praças da cidade do prestador, do MESMO mundo (exemplo ou real): uma
    -- praça é do mundo de exemplo quando o responsável ou algum membro é.
    select w.limite_anuncios_padrao
      from public.workspaces w, alvo a
     where w.cidade = a.cidade
       and w.estado = a.estado
       and w.limite_anuncios_padrao is not null
       and (
         exists (select 1 from public.profiles d where d.user_id = w.owner_id and d.exemplo)
         or exists (
           select 1 from public.workspace_members m
             join public.profiles d on d.user_id = m.user_id
            where m.workspace_id = w.id and d.exemplo
         )
       ) = a.exemplo
  )
  select coalesce(
    (select l.limite from public.anuncio_limites l where l.prestador_id = p_prestador),
    (select max(limite_anuncios_padrao) from pracas),
    3
  );
$$;

comment on function public.limite_de_anuncios(uuid) is
  'Quantos anúncios ATIVOS o prestador pode ter: o ajuste dele (anuncio_limites), senão o maior padrão '
  'entre as praças da cidade dele do mesmo mundo (exemplo ou real), senão 3 — o padrão da plataforma. '
  'SECURITY DEFINER: lê praças e membros que a sessão não enxerga; devolve só um número.';

revoke execute on function public.limite_de_anuncios(uuid) from anon, public;
grant execute on function public.limite_de_anuncios(uuid) to authenticated;

-- 2) Anúncios -----------------------------------------------------------------
create table public.anuncios (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  tipo          text not null check (tipo in ('servico', 'vaga_ajudante')),
  titulo        text not null check (char_length(btrim(titulo)) between 3 and 80),
  descricao     text not null check (char_length(btrim(descricao)) between 10 and 600),
  categoria     text,
  whatsapp      text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  cidade        text,
  estado        text,
  status        text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado', 'moderado')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint anuncios_vaga_tem_whatsapp check (tipo <> 'vaga_ajudante' or whatsapp is not null),
  constraint anuncios_servico_sem_whatsapp check (tipo <> 'servico' or whatsapp is null)
);

create index anuncios_publicos_idx on public.anuncios (status, tipo, created_at desc);
create index anuncios_prestador_idx on public.anuncios (prestador_id, status);

alter table public.anuncios enable row level security;

-- O dono vê todos os próprios anúncios (qualquer status). A leitura pública
-- (landing, busca, perfil) é pela função anuncios_publicos, que só devolve
-- colunas seguras de anúncio ativo de prestador ativo.
create policy "anuncios_select_own" on public.anuncios
  for select to authenticated
  using (prestador_id = auth.uid());

-- Só Prestador de Serviço com conta ativa e fora do mundo de exemplo cria.
create policy "anuncios_insert_prestador" on public.anuncios
  for insert to authenticated
  with check (
    prestador_id = auth.uid()
    and status in ('ativo', 'pausado')
    and exists (
      select 1 from public.profiles p
       where p.user_id = auth.uid()
         and p.tipo_base = 'prestador_servico'
         and p.status = 'ativo'
         and not p.exemplo
    )
  );

create policy "anuncios_update_prestador" on public.anuncios
  for update to authenticated
  using (
    prestador_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and not p.exemplo)
  )
  with check (prestador_id = auth.uid() and status in ('ativo', 'pausado', 'encerrado'));

comment on table public.anuncios is
  'Anúncios do Prestador de Serviço (migration 0044): oferta do próprio serviço (servico) ou vaga para '
  'ajudante sem conta no app (vaga_ajudante, com WhatsApp). Até limite_de_anuncios(prestador) ativos ao '
  'mesmo tempo — conferido pelo gatilho anuncios_validar. Nunca apagado pela sessão: encerrar é mudar o '
  'status. Leitura pública só por anuncios_publicos().';
comment on column public.anuncios.id is 'PK (uuid gerado).';
comment on column public.anuncios.prestador_id is 'Quem anuncia (Prestador de Serviço, FK auth.users).';
comment on column public.anuncios.tipo is 'servico (oferece o próprio serviço) · vaga_ajudante ("Necessita-se ajudante!").';
comment on column public.anuncios.titulo is 'Nome do anúncio ou da vaga (3 a 80 caracteres).';
comment on column public.anuncios.descricao is 'Descrição (10 a 600 caracteres). Para a vaga, o que o ajudante vai fazer; valor e combinação ficam entre as partes.';
comment on column public.anuncios.categoria is 'Categoria do catálogo (categorias_servico) — o serviço oferecido ou o tipo de ajudante procurado. Opcional.';
comment on column public.anuncios.whatsapp is
  'Só em vaga_ajudante (obrigatório ali, proibido em servico): o número que o prestador escolheu mostrar '
  'no mural público, só dígitos com DDD (10 a 13). É dado pessoal exposto por escolha dele, só enquanto a vaga está ativa.';
comment on column public.anuncios.cidade is 'Cidade do prestador no momento da publicação (copiada do perfil pelo gatilho).';
comment on column public.anuncios.estado is 'UF do prestador no momento da publicação (copiada do perfil pelo gatilho).';
comment on column public.anuncios.status is
  'ativo (aparece e conta no limite) · pausado · encerrado · moderado (tirado do ar pelo Administrador ou '
  'SysAdmin — só a chave de serviço põe ou tira desse estado).';
comment on column public.anuncios.created_at is 'Quando foi publicado.';
comment on column public.anuncios.updated_at is 'Última alteração (mantida pelo gatilho).';

-- 3) Gatilho: imutáveis, moderação e limite -----------------------------------
create or replace function public.anuncios_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  privilegiada boolean := public.is_chamada_privilegiada();
  ativos integer;
  limite integer;
begin
  if tg_op = 'INSERT' then
    if not privilegiada then
      -- cidade/UF vêm do perfil, nunca do formulário.
      select p.cidade, p.estado into new.cidade, new.estado
        from public.profiles p where p.user_id = new.prestador_id;
      new.created_at := now();
    end if;
  else
    if not privilegiada then
      if new.prestador_id <> old.prestador_id or new.tipo <> old.tipo or new.created_at <> old.created_at
         or new.cidade is distinct from old.cidade or new.estado is distinct from old.estado then
        raise exception 'anúncio: dono, tipo, cidade e data de publicação não mudam' using errcode = '42501';
      end if;
      if old.status = 'moderado' then
        raise exception 'anúncio tirado do ar pela moderação: fale com o Administrador da sua praça' using errcode = '42501';
      end if;
    end if;
  end if;
  new.updated_at := now();

  -- Limite de ativos: vale para qualquer caminho (inclusive o script de
  -- exemplo), só ao ENTRAR em 'ativo'. Baixar o limite não pausa o que já está no ar.
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status <> 'ativo') then
    select count(*) into ativos
      from public.anuncios a
     where a.prestador_id = new.prestador_id and a.status = 'ativo' and a.id <> new.id;
    limite := public.limite_de_anuncios(new.prestador_id);
    if ativos >= limite then
      raise exception 'limite de anúncios ativos atingido (% de %)', ativos, limite using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.anuncios_validar() is
  'Gatilho de anuncios (migration 0044): numa sessão comum, cidade/UF saem do perfil e dono, tipo, cidade e '
  'data não mudam; anúncio moderado só volta pela chave de serviço. Para qualquer caminho, entrar em '
  '''ativo'' exige estar abaixo de limite_de_anuncios(prestador) — erro P0001 "limite de anúncios ativos atingido".';

create trigger anuncios_validar
  before insert or update on public.anuncios
  for each row execute function public.anuncios_validar();

-- 4) Leitura pública ----------------------------------------------------------
create or replace function public.anuncios_publicos(
  p_tipo text default null,
  p_prestador uuid default null,
  p_limite integer default 24
)
returns table (
  id uuid, tipo text, titulo text, descricao text, categoria text, cidade text, estado text,
  whatsapp text, prestador_id uuid, prestador_nome text, prestador_categoria text,
  exemplo boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.tipo, a.titulo, a.descricao, a.categoria, a.cidade, a.estado,
         case when a.tipo = 'vaga_ajudante' then a.whatsapp end,
         a.prestador_id, p.nome, p.categoria, p.exemplo, a.created_at
    from public.anuncios a
    join public.profiles p on p.user_id = a.prestador_id
   where a.status = 'ativo'
     and p.status = 'ativo'
     and p.tipo_base = 'prestador_servico'
     and (p_tipo is null or a.tipo = p_tipo)
     and (p_prestador is null or a.prestador_id = p_prestador)
   order by a.created_at desc
   limit least(greatest(coalesce(p_limite, 24), 1), 60);
$$;

comment on function public.anuncios_publicos(text, uuid, integer) is
  'Anúncios ATIVOS de prestadores ativos, para a página inicial (sem login), a busca e o perfil. SECURITY '
  'DEFINER com colunas escolhidas: nome e categoria públicos do prestador, e o WhatsApp só da vaga para '
  'ajudante (o número que o prestador escolheu expor nela). Nunca telefone do perfil, e-mail nem endereço.';

revoke execute on function public.anuncios_publicos(text, uuid, integer) from public;
grant execute on function public.anuncios_publicos(text, uuid, integer) to anon, authenticated;
