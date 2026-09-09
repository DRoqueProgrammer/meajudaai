-- 0031: log de auditoria de login — dispositivo, IP e geolocalização por IP
-- (ROADMAP.md §5.1). Só o SysAdmin lê; escrita só via service role (a action
-- de login), nunca direto do cliente.
create table public.login_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ip          text,
  user_agent  text,
  cidade      text,
  pais        text,
  created_at  timestamptz not null default now()
);
create index login_logs_user_idx on public.login_logs (user_id, created_at desc);
alter table public.login_logs enable row level security;

comment on table public.login_logs is
  'Auditoria de acesso: IP, dispositivo (user-agent) e geolocalização por IP, capturados a cada '
  'login bem-sucedido (entrarAction). Só o SysAdmin lê — RLS sem policy de select pra outros papéis.';

create policy "login_logs_select_sysadmin" on public.login_logs
  for select to authenticated
  using (public.current_app_role() = 'sysadmin');
