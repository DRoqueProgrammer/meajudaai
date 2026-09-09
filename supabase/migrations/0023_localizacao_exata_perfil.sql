-- 0023: localização exata do perfil (Cliente e Prestador) + gênero + cidade
-- IBGE — mesmo molde de vaga_local/vagas (migration 0014): coordenada EXATA
-- numa tabela à parte com RLS estrita, nunca em `profiles` (que é `select
-- true` para qualquer autenticado). Ver DESIGN_MEAJUDAAI_V2.md, Decisão 3 —
-- supera docs/adr/0004-localizacao-aproximada.md (que tratava só de vagas).
--
-- Sem coluna aproximada em `profiles` nesta migration: a v2 usa a exata
-- diretamente para ordenar buscas por proximidade (cálculo no servidor, nunca
-- exposta ao cliente) e agrupa por `cidade_ibge` na visão agregada do admin —
-- não precisa de um segundo par de coordenadas borradas como em vagas.

create table public.profile_local (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);
alter table public.profile_local enable row level security;

comment on table public.profile_local is
  'Coordenada EXATA do PIN de localização (Cliente ou Prestador de Serviço), separada de '
  '`profiles` para RLS estrita. Molde: vaga_local (migration 0014). Ver DESIGN_MEAJUDAAI_V2.md.';

-- Leitura: o próprio dono ou sysadmin. A regra "a outra parte de um serviço
-- ativo também pode ler" entra na Fase C, quando a tabela `servicos` existir
-- (sem ela agora, a policy ficaria com uma cláusula morta referenciando uma
-- tabela inexistente).
create policy "profile_local_select_own_or_sysadmin" on public.profile_local
  for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'sysadmin');

-- Escrita: só o próprio dono (o cadastro grava o PIN que a pessoa marcou).
create policy "profile_local_upsert_own" on public.profile_local
  for insert to authenticated with check (user_id = auth.uid());
create policy "profile_local_update_own" on public.profile_local
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profiles
  add column if not exists cidade_ibge text,
  add column if not exists genero text check (genero in ('masculino','feminino','prefiro_nao_responder'));

comment on column public.profiles.cidade_ibge is
  'Código do município (IBGE), não texto livre. Alimenta a visão agregada por cidade do painel '
  'do admin (agrupa pessoas da mesma cidade, sem espalhar pelas coordenadas exatas). Padrão de '
  'lista de cidades a reaproveitar do projeto amazing-school — pendente de integração.';
comment on column public.profiles.genero is
  'Controla a saudação personalizada (Bem-vindo/Bem-vinda/Bem-vinde) no Hero e em todo o app. '
  'Nullable: perfis existentes (v1) não têm valor até o usuário definir em Perfil.';
