-- 0042: pedido de exclusão do titular (LGPD art. 18, decisão D-023, lote 2B da
-- Fatia 2). "Desativar" (migration 0030) continua reversível e não muda aqui.
-- Esta migration cria só a fila do NOVO direito — "excluir meus dados" —, que
-- não deleta ninguém (ROADMAP.md §3: nunca apagamos), e sim agenda uma
-- ANONIMIZAÇÃO (lib/titular/anonimizar.ts) que roda no máximo 15 dias depois
-- do pedido: 7 dias de carência para a pessoa desistir
-- (lib/actions/titular.ts:desistirDaExclusaoAction) mais até 7 dias de
-- folga do cron diário (app/api/cron/titular/route.ts) até o próximo lote de
-- processamento — nunca ultrapassa os 15 dias prometidos em `/perfil/editar`.

create table public.pedidos_exclusao (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  status             text not null default 'pendente' check (status in ('pendente', 'cancelado', 'concluido')),
  solicitado_em      timestamptz not null default now(),
  -- Mesma transação de `solicitado_em` (os dois defaults leem o `now()` da
  -- transação, sempre idêntico) — por isso soma direta em vez de coluna
  -- gerada: `timestamptz + interval` não é IMMUTABLE (depende do fuso em
  -- meses/DST), e coluna gerada exige que seja.
  pode_processar_em  timestamptz not null default (now() + interval '7 days'),
  cancelado_em       timestamptz,
  concluido_em       timestamptz
);

-- Só um pedido pendente por pessoa: `solicitarExclusaoAction` confere isso na
-- action, mas duas chamadas simultâneas (duplo clique) driblam essa checagem —
-- este índice é quem garante de verdade, na race, sem duplicar a fila do cron.
create unique index pedidos_exclusao_pendente_unico_idx
  on public.pedidos_exclusao (user_id)
  where status = 'pendente';

create index pedidos_exclusao_user_idx on public.pedidos_exclusao (user_id, solicitado_em desc);

alter table public.pedidos_exclusao enable row level security;

-- A pessoa lê e cria só o próprio pedido. Sysadmin lê todos aqui (defesa em
-- profundidade, como login_logs/demanda_servico) — hoje inerte enquanto o
-- auth hook não é registrado (D-030/D-014): a tela /admin/pedidos-de-exclusao
-- lê pela chave de serviço, como as outras telas administrativas
-- (lib/admin/consultas.ts).
create policy "pedidos_exclusao_select_own_or_sysadmin" on public.pedidos_exclusao
  for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'sysadmin');

create policy "pedidos_exclusao_insert_own" on public.pedidos_exclusao
  for insert to authenticated
  with check (user_id = auth.uid());

-- Só para `desistirDaExclusaoAction` (cancela o próprio pedido pendente); a
-- conclusão (anonimização) é sempre pelo cron com a chave de serviço, que
-- ignora RLS.
create policy "pedidos_exclusao_update_own" on public.pedidos_exclusao
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.pedidos_exclusao is
  'Pedido de exclusão do titular (LGPD art. 18, D-023): fila da anonimização feita por '
  'lib/titular/anonimizar.ts. Não apaga ninguém — troca dado pessoal por marca neutra e '
  'mantém os ids, para o histórico da outra parte de um serviço continuar íntegro. '
  'Processada por app/api/cron/titular/route.ts, no máximo 15 dias após o pedido.';
comment on column public.pedidos_exclusao.id is 'PK (uuid gerado).';
comment on column public.pedidos_exclusao.user_id is 'Quem pediu (FK auth.users, on delete cascade).';
comment on column public.pedidos_exclusao.status is
  'pendente (aguardando os 7 dias de carência) · cancelado (a própria pessoa desistiu, '
  'via desistirDaExclusaoAction) · concluido (anonimizada pelo cron).';
comment on column public.pedidos_exclusao.solicitado_em is 'Quando a pessoa pediu.';
comment on column public.pedidos_exclusao.pode_processar_em is
  'solicitado_em + 7 dias — carência de desistência (R-D-023). O cron só processa pedidos '
  'pendentes com pode_processar_em no passado; roda diariamente, então o prazo real de '
  'anonimização fica entre 7 e no máximo 15 dias após o pedido.';
comment on column public.pedidos_exclusao.cancelado_em is 'Quando a pessoa desistiu (null enquanto pendente ou concluído).';
comment on column public.pedidos_exclusao.concluido_em is 'Quando o cron anonimizou os dados (null enquanto pendente ou cancelado).';
