-- 0016: convite por link + aprovação. Molde petvarejo 0029_invite.
-- RLS ON e SEM policies: só o service role (as server actions) manipula convites.
-- O token é a credencial; a rota /convite lê o convite via admin no servidor.
create table public.invite (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('owner','membro')),
  created_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  status text not null default 'pendente' check (status in ('pendente','aceito','aprovado','recusado')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
create index invite_token_idx on public.invite(token);
create index invite_ws_idx on public.invite(workspace_id, status);
alter table public.invite enable row level security;
