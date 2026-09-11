-- 0053: sinalizações de cliente (pedido do Leonardo em 10/09/2026: "mesma coisa
-- para clientes. Clientes podem ser pilantras também. Se por acaso tiverem
-- problemas ou não pagarem, um prestador de serviço pode clicar em Flag
-- Pilantra, e isso vai pro Administrador aprovar. Se ele aprovar, no perfil do
-- cliente que o administrador e o prestador de serviço veem, deve aparecer uma
-- flagzinha. Se tiver 2, 2 flagzinhas etc").
--
-- O prestador SINALIZA um cliente com quem teve serviço (a sessão dele insere,
-- a policy confere o vínculo); o Administrador aprova ou recusa (chave de
-- serviço, depois das checagens de lib/actions/suspeitas.ts). Só as APROVADAS
-- contam, e a contagem aparece para prestador e administração — nunca para o
-- próprio cliente, nem o texto, nem quem sinalizou.

create table public.sinalizacoes_cliente (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references auth.users(id) on delete cascade,
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  servico_id    uuid references public.servicos(id) on delete set null,
  motivo        text not null check (motivo in ('nao_pagou', 'problema_no_servico', 'outro')),
  descricao     text check (descricao is null or char_length(descricao) <= 600),
  status        text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  created_at    timestamptz not null default now(),
  decidido_por  uuid references auth.users(id) on delete set null,
  decidido_em   timestamptz
);

create index sinalizacoes_cliente_idx on public.sinalizacoes_cliente (cliente_id, status);
-- Um prestador sinaliza o mesmo serviço uma vez só.
create unique index sinalizacoes_cliente_servico_unica
  on public.sinalizacoes_cliente (prestador_id, servico_id)
  where servico_id is not null;

alter table public.sinalizacoes_cliente enable row level security;

-- O prestador vê as que ele mesmo mandou (para saber que está em análise).
create policy "sinalizacoes_cliente_select_autor" on public.sinalizacoes_cliente
  for select to authenticated
  using (prestador_id = auth.uid());

-- O prestador sinaliza, sempre pendente, um cliente com quem teve serviço —
-- e, se apontar o serviço, ele tem de ser dos dois.
create policy "sinalizacoes_cliente_insert_prestador" on public.sinalizacoes_cliente
  for insert to authenticated
  with check (
    prestador_id = auth.uid()
    and status = 'pendente'
    and decidido_por is null
    and exists (
      select 1 from public.profiles p
       where p.user_id = auth.uid() and p.tipo_base = 'prestador_servico'
    )
    and exists (
      select 1 from public.servicos s
       where s.prestador_id = auth.uid()
         and s.cliente_id = sinalizacoes_cliente.cliente_id
         and (sinalizacoes_cliente.servico_id is null or s.id = sinalizacoes_cliente.servico_id)
    )
  );

comment on table public.sinalizacoes_cliente is
  'Sinalizações ("Flag Pilantra") de um prestador sobre um cliente com quem teve serviço (migration 0053). '
  'Nascem pendentes; o Administrador aprova ou recusa pela chave de serviço. Só as aprovadas contam em '
  'flags_aprovadas_do_cliente(), que só prestador e administração leem.';
comment on column public.sinalizacoes_cliente.id is 'PK (uuid gerado).';
comment on column public.sinalizacoes_cliente.cliente_id is 'Cliente sinalizado.';
comment on column public.sinalizacoes_cliente.prestador_id is 'Prestador que sinalizou (precisa ter tido serviço com o cliente).';
comment on column public.sinalizacoes_cliente.servico_id is 'Serviço de contexto, se houver (um por prestador).';
comment on column public.sinalizacoes_cliente.motivo is 'nao_pagou · problema_no_servico · outro.';
comment on column public.sinalizacoes_cliente.descricao is 'Relato do prestador (até 600 caracteres) — só a administração lê.';
comment on column public.sinalizacoes_cliente.status is 'pendente (aguarda o Administrador) · aprovada (conta como flag) · recusada.';
comment on column public.sinalizacoes_cliente.created_at is 'Quando foi enviada.';
comment on column public.sinalizacoes_cliente.decidido_por is 'Administrador (ou SysAdmin) que aprovou ou recusou.';
comment on column public.sinalizacoes_cliente.decidido_em is 'Quando foi decidida.';

-- Quantas sinalizações APROVADAS o cliente tem — só para quem é prestador,
-- administrador ou sysadmin (pelo tipo do PERFIL de quem pergunta: o auth hook
-- não está registrado, então current_app_role() não serve aqui — D-030).
-- Para qualquer outra pessoa, inclusive o próprio cliente, devolve null.
create or replace function public.flags_aprovadas_do_cliente(p_cliente uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles quem
       where quem.user_id = auth.uid()
         and quem.tipo_base in ('prestador_servico', 'admin', 'sysadmin')
    )
    then (select count(*)::integer from public.sinalizacoes_cliente s
           where s.cliente_id = p_cliente and s.status = 'aprovada')
    else null
  end;
$$;

comment on function public.flags_aprovadas_do_cliente(uuid) is
  'Número de sinalizações APROVADAS de um cliente (migration 0053), para a bandeirinha no perfil. Só prestador, '
  'administrador e sysadmin recebem o número; qualquer outro (inclusive o cliente) recebe null.';

revoke execute on function public.flags_aprovadas_do_cliente(uuid) from anon, public;
grant execute on function public.flags_aprovadas_do_cliente(uuid) to authenticated;
