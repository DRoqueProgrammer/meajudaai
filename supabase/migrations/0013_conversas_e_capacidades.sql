-- 0013: motor de conversa único (canal da equipe + DMs) + capacidades por funcionário.
-- O chat de vaga (0003) passa a ser um caso de conversa 'dm_externa'. Ver DESIGN_CHAT_E_PERMISSOES.

-- ─── Conversas (canal + DMs) ────────────────────────────────────────────────
create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tipo text not null check (tipo in ('canal_equipe','dm_interna','dm_externa')),
  ajudante_id uuid references auth.users(id) on delete cascade,
  vaga_origem_id uuid references public.vagas(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Singletons: 1 canal por equipe; 1 DM externa por (equipe, ajudante) → persiste entre diárias.
create unique index conversas_canal_uniq on public.conversas(workspace_id) where tipo = 'canal_equipe';
create unique index conversas_externa_uniq on public.conversas(workspace_id, ajudante_id) where tipo = 'dm_externa';
create index conversas_ws_idx on public.conversas(workspace_id);

create table public.conversa_membros (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lido_ate timestamptz,
  primary key (conversa_id, user_id)
);
create index conversa_membros_user_idx on public.conversa_membros(user_id);

-- ─── mensagens: aponta para conversa; vaga_id/destinatario_id viram legado ───
alter table public.mensagens add column conversa_id uuid references public.conversas(id) on delete cascade;
alter table public.mensagens alter column vaga_id drop not null;
alter table public.mensagens alter column destinatario_id drop not null;
create index mensagens_conversa_idx on public.mensagens(conversa_id);

-- ─── Helpers SECURITY DEFINER (não disparam RLS por dentro; padrão do repo) ──
create or replace function public.has_capability(v_user uuid, v_ws uuid, v_cap text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_modules um
    where um.user_id = v_user and um.workspace_id = v_ws
      and um.module = v_cap and um.allowed = true
  )
$$;

create or replace function public.is_conversa_membro(v_conversa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    -- ajudante da DM externa
    exists (select 1 from public.conversas c
            where c.id = v_conversa and c.ajudante_id = auth.uid())
    -- membro explícito (DM interna)
    or exists (select 1 from public.conversa_membros cm
               where cm.conversa_id = v_conversa and cm.user_id = auth.uid())
    -- lado-equipe: canal (qualquer membro) | dm_externa (owner OU capacidade chat_ajudantes)
    or exists (
      select 1 from public.conversas c
      join public.workspace_members m on m.workspace_id = c.workspace_id
      where c.id = v_conversa and m.user_id = auth.uid()
        and (
          c.tipo = 'canal_equipe'
          or (c.tipo = 'dm_externa'
              and (m.role = 'owner'
                   or public.has_capability(auth.uid(), c.workspace_id, 'chat_ajudantes')))
        )
    )
$$;

revoke execute on function public.has_capability(uuid, uuid, text) from anon, public;
revoke execute on function public.is_conversa_membro(uuid) from anon, public;
grant execute on function public.has_capability(uuid, uuid, text) to authenticated;
grant execute on function public.is_conversa_membro(uuid) to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.conversas enable row level security;
alter table public.conversa_membros enable row level security;

create policy "conversas_select" on public.conversas
  for select to authenticated
  using (public.is_conversa_membro(id) or public.current_app_role() = 'sysadmin');

create policy "cmembros_select" on public.conversa_membros
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversa_membro(conversa_id)
    or public.current_app_role() = 'sysadmin'
  );
-- Cada um marca só o próprio "lido_ate".
create policy "cmembros_update_self" on public.conversa_membros
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- mensagens: leitura e escrita só para membro da conversa (substitui msg_select_parties / msg_insert_sender de 0003/0010).
drop policy if exists "msg_select_parties" on public.mensagens;
drop policy if exists "msg_insert_sender" on public.mensagens;
create policy "msg_select_membro" on public.mensagens
  for select to authenticated
  using (public.is_conversa_membro(conversa_id) or public.current_app_role() = 'sysadmin');
create policy "msg_insert_membro" on public.mensagens
  for insert to authenticated
  with check (remetente_id = auth.uid() and public.is_conversa_membro(conversa_id));

-- ─── Capacidades no user_modules (estende o CHECK de 0009) ──────────────────
alter table public.user_modules drop constraint if exists user_modules_module_check;
alter table public.user_modules add constraint user_modules_module_check
  check (module in ('vagas','equipe','financeiro','relatorios','publicar_vagas','chat_ajudantes'));

-- ─── Backfill: chat de vaga → dm_externa; seed do canal de cada equipe ──────
insert into public.conversas (workspace_id, tipo, ajudante_id, vaga_origem_id)
select distinct on (v.workspace_id, c.ajudante_id)
       v.workspace_id, 'dm_externa', c.ajudante_id, v.id
from public.mensagens msg
join public.vagas v on v.id = msg.vaga_id
join public.candidaturas c on c.vaga_id = v.id and c.status = 'aceito'
order by v.workspace_id, c.ajudante_id, v.id
on conflict (workspace_id, ajudante_id) where tipo = 'dm_externa' do nothing;

update public.mensagens msg
set conversa_id = conv.id
from public.vagas v
join public.candidaturas c on c.vaga_id = v.id and c.status = 'aceito'
join public.conversas conv
  on conv.workspace_id = v.workspace_id and conv.ajudante_id = c.ajudante_id and conv.tipo = 'dm_externa'
where msg.vaga_id = v.id and msg.conversa_id is null;

insert into public.conversas (workspace_id, tipo)
select id, 'canal_equipe' from public.workspaces
on conflict (workspace_id) where tipo = 'canal_equipe' do nothing;

-- mensagens já está na publication supabase_realtime (0003); conversa_id herda a entrega RLS-filtrada.
