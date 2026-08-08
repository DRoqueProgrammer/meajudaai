-- 0014: mapa de vagas — coordenada EXATA protegida (vaga_local) + APROXIMADA na vaga + módulo 'mapa'.
-- Split de tabela no molde de profiles/profiles_pii: RLS row-level não esconde coluna,
-- então o exato mora numa tabela à parte com policy estrita. Ver DESIGN_MAPA_VAGAS.

-- Coordenada aproximada (~bairro, arredondada no servidor) — segura, fica na própria vaga.
alter table public.vagas add column local_aprox_lat double precision;
alter table public.vagas add column local_aprox_lng double precision;

-- Coordenada EXATA — só a equipe dona ou o ajudante contratado leem.
create table public.vaga_local (
  vaga_id uuid primary key references public.vagas(id) on delete cascade,
  lat double precision not null,
  lng double precision not null
);
alter table public.vaga_local enable row level security;

create or replace function public.is_ajudante_aceito(v_vaga uuid, v_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidaturas c
    where c.vaga_id = v_vaga and c.ajudante_id = v_user and c.status = 'aceito'
  )
$$;
revoke execute on function public.is_ajudante_aceito(uuid, uuid) from anon, public;
grant execute on function public.is_ajudante_aceito(uuid, uuid) to authenticated;

-- Leitura: equipe dona (can_manage_vaga, migration 0004) OU ajudante contratado OU sysadmin.
-- Escrita: sem policy → só service role (a action de publicar), nunca o cliente.
create policy "vaga_local_select" on public.vaga_local
  for select to authenticated
  using (
    public.can_manage_vaga(vaga_id)
    or public.is_ajudante_aceito(vaga_id, auth.uid())
    or public.current_app_role() = 'sysadmin'
  );

-- Módulo 'mapa' (gating do funcionário; sócio sempre, ajudante tem a descoberta na superfície dele).
alter table public.user_modules drop constraint if exists user_modules_module_check;
alter table public.user_modules add constraint user_modules_module_check
  check (module in ('vagas','equipe','financeiro','relatorios','publicar_vagas','chat_ajudantes','mapa'));
