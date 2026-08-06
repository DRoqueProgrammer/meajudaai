-- candidaturas
create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.vagas(id) on delete cascade,
  ajudante_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'aguardando' check (status in ('aguardando','aceito','recusado','cancelado')),
  created_at timestamptz not null default now(),
  unique (vaga_id, ajudante_id)
);
create index candidaturas_vaga_idx on public.candidaturas(vaga_id);
create index candidaturas_ajudante_idx on public.candidaturas(ajudante_id);
alter table public.candidaturas enable row level security;
create policy "cand_insert_self" on public.candidaturas
  for insert to authenticated with check (ajudante_id = auth.uid());
create policy "cand_update_self" on public.candidaturas
  for update to authenticated using (ajudante_id = auth.uid()) with check (ajudante_id = auth.uid());
-- policy de SELECT: ver 0004 (usa can_manage_vaga p/ evitar recursão)

-- avaliacoes + trigger de media
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid references public.vagas(id) on delete set null,
  avaliador_id uuid not null references auth.users(id) on delete cascade,
  avaliado_id uuid not null references auth.users(id) on delete cascade,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (vaga_id, avaliador_id, avaliado_id)
);
create index avaliacoes_avaliado_idx on public.avaliacoes(avaliado_id);
alter table public.avaliacoes enable row level security;
create policy "aval_select_all" on public.avaliacoes
  for select to authenticated using (true);
create policy "aval_insert_self" on public.avaliacoes
  for insert to authenticated with check (avaliador_id = auth.uid());

create or replace function public.recompute_nota_media()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_avg numeric; v_cnt integer;
begin
  v_target := coalesce(new.avaliado_id, old.avaliado_id);
  select round(avg(nota)::numeric, 2), count(*) into v_avg, v_cnt
    from public.avaliacoes where avaliado_id = v_target;
  update public.profiles
    set nota_media = coalesce(v_avg, 0), total_avaliacoes = coalesce(v_cnt, 0)
    where user_id = v_target;
  return null;
end $$;
revoke execute on function public.recompute_nota_media() from anon, authenticated, public;
create trigger trg_recompute_nota
  after insert or update or delete on public.avaliacoes
  for each row execute function public.recompute_nota_media();

-- mensagens (Realtime)
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.vagas(id) on delete cascade,
  remetente_id uuid not null references auth.users(id) on delete cascade,
  destinatario_id uuid not null references auth.users(id) on delete cascade,
  conteudo text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index mensagens_vaga_idx on public.mensagens(vaga_id);
alter table public.mensagens enable row level security;
create policy "msg_select_parties" on public.mensagens
  for select to authenticated using (auth.uid() in (remetente_id, destinatario_id));
create policy "msg_insert_sender" on public.mensagens
  for insert to authenticated with check (remetente_id = auth.uid());
alter publication supabase_realtime add table public.mensagens;

-- notificacoes (Realtime)
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text,
  visualizada boolean not null default false,
  created_at timestamptz not null default now()
);
create index notificacoes_user_idx on public.notificacoes(user_id);
alter table public.notificacoes enable row level security;
create policy "notif_select_owner" on public.notificacoes
  for select to authenticated using (user_id = auth.uid());
create policy "notif_update_owner" on public.notificacoes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.notificacoes;

-- categorias de servico (seed)
create table public.categorias_servico (
  slug text primary key,
  nome text not null,
  ordem integer not null default 0
);
alter table public.categorias_servico enable row level security;
create policy "cat_select_all" on public.categorias_servico
  for select to authenticated using (true);
insert into public.categorias_servico (slug, nome, ordem) values
  ('ajudante_eletricista','Ajudante de Eletricista',1),
  ('ajudante_pedreiro','Ajudante de Pedreiro',2),
  ('ajudante_pintor','Ajudante de Pintor',3),
  ('ajudante_encanador','Ajudante de Encanador',4),
  ('ajudante_gesseiro','Ajudante de Gesseiro',5),
  ('ajudante_azulejista','Ajudante de Azulejista',6),
  ('ajudante_geral','Ajudante Geral',7)
on conflict (slug) do nothing;
