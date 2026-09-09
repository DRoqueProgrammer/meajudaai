-- 0022: pivô de papéis v2 — o antigo "ajudante" (ajuda um profissional numa
-- diária) vira "prestador_servico" (presta serviço direto a um cliente, com
-- agenda própria); novo papel "cliente" (busca e agenda) é criado.
--
-- A v2 (ver ROADMAP.md e DESIGN_MEAJUDAAI_V2.md, Decisão 2) muda quem contrata
-- quem: antes um profissional publicava a vaga e um ajudante se candidatava;
-- agora um cliente busca direto um prestador e agenda um horário. Renomear em
-- vez de criar do zero preserva avaliações, perfil e histórico já existentes.
--
-- Fallback de papel muda de 'ajudante' para 'cliente': é o papel de cadastro
-- mais simples (sem aprovação), o equivalente v2 de "usuário comum" quando o
-- tipo não pôde ser determinado.

update public.profiles set tipo_base = 'prestador_servico' where tipo_base = 'ajudante';

alter table public.profiles drop constraint if exists profiles_tipo_base_check;
alter table public.profiles
  add constraint profiles_tipo_base_check
  check (tipo_base in ('sysadmin','admin','funcionario','prestador_servico','cliente'));

alter table public.profiles alter column tipo_base set default 'cliente';

comment on constraint profiles_tipo_base_check on public.profiles is
  'v2: sysadmin (plataforma) > admin (dono/gestor de workspace) > funcionario (RBAC por módulo, '
  'ver user_modules) > prestador_servico (agenda própria, presta serviço) > cliente (busca e agenda). '
  'O antigo "ajudante" foi renomeado para "prestador_servico" nesta migration — ver ROADMAP.md.';

-- current_app_role(): mesmo fallback do JWT, agora 'cliente'.
create or replace function public.current_app_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'cliente')
$$;

-- Hook de JWT (migration 0001): mesmo ajuste de fallback.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_claims jsonb;
begin
  select tipo_base into v_role from public.profiles where user_id = (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims','{}'::jsonb);
  v_claims := jsonb_set(v_claims,'{app_metadata}', coalesce(v_claims->'app_metadata','{}'::jsonb));
  v_claims := jsonb_set(v_claims,'{app_metadata,app_role}', to_jsonb(coalesce(v_role,'cliente')));
  return jsonb_set(event,'{claims}', v_claims);
end $$;

comment on function public.current_app_role() is
  'Papel do JWT (app_metadata.app_role), fallback ''cliente'' (v2 — era ''ajudante''). Usado pelas RLS policies.';
comment on function public.custom_access_token_hook(jsonb) is
  'Auth Hook (Custom Access Token): copia profiles.tipo_base para app_metadata.app_role no JWT. Fallback ''cliente'' (v2).';
