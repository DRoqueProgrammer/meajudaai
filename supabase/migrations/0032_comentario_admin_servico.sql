-- 0032: comentário do administrador em um serviço, privado por padrão,
-- público se marcado (ROADMAP.md §6.4). Nesta v2 P2P (prestador_servico não
-- pertence a workspace), quem comenta é o SysAdmin — ver nota em
-- DESIGN_MEAJUDAAI_V2.md sobre a tensão "workspace do prestador" ainda em aberto.
create table public.servico_comentarios_admin (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid not null references public.servicos(id) on delete cascade,
  autor_id    uuid not null references auth.users(id) on delete cascade,
  texto       text not null,
  publico     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index servico_comentarios_admin_servico_idx on public.servico_comentarios_admin (servico_id);
alter table public.servico_comentarios_admin enable row level security;

comment on table public.servico_comentarios_admin is
  'Comentário do SysAdmin sobre um serviço. Privado por padrão (só sysadmin lê); se publico=true, '
  'cliente e prestador daquele serviço também veem. Ver ROADMAP.md §6.4.';

create policy "servico_comentarios_admin_select" on public.servico_comentarios_admin
  for select to authenticated
  using (
    public.current_app_role() = 'sysadmin'
    or (publico and exists (
      select 1 from public.servicos s
      where s.id = servico_id and (s.cliente_id = auth.uid() or s.prestador_id = auth.uid())
    ))
  );

create policy "servico_comentarios_admin_insert" on public.servico_comentarios_admin
  for insert to authenticated
  with check (autor_id = auth.uid() and public.current_app_role() = 'sysadmin');
