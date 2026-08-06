create extension if not exists citext;

create or replace function public.current_app_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'ajudante')
$$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  foto_url text,
  cidade text,
  estado text,
  bairro text,
  tipo_base text not null default 'ajudante' check (tipo_base in ('profissional','ajudante','admin')),
  nota_media numeric(3,2) not null default 0,
  total_avaliacoes integer not null default 0,
  verificado boolean not null default false,
  status text not null default 'ativo' check (status in ('ativo','bloqueado')),
  created_at timestamptz not null default now()
);

create table public.profiles_pii (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cpf citext unique,
  telefone citext unique,
  email citext unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles_pii enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "pii_select_self_or_admin" on public.profiles_pii
  for select to authenticated using (auth.uid() = user_id or public.current_app_role() = 'admin');
create policy "pii_update_self" on public.profiles_pii
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_claims jsonb;
begin
  select tipo_base into v_role from public.profiles where user_id = (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims','{}'::jsonb);
  v_claims := jsonb_set(v_claims,'{app_metadata}', coalesce(v_claims->'app_metadata','{}'::jsonb));
  v_claims := jsonb_set(v_claims,'{app_metadata,app_role}', to_jsonb(coalesce(v_role,'ajudante')));
  return jsonb_set(event,'{claims}', v_claims);
end $$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;
