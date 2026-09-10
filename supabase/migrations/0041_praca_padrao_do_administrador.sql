-- 0041: praça padrão do Administrador (Fatia 1, tarefa 5). Fecha R-46 e R-47
-- (cvg/docs/tech-spec/fatia-1-seguranca.md), ADR 0013, decisão D-016 e GAP-015:
-- só o SysAdmin cria praça e vincula um Administrador a uma ou mais praças,
-- com uma praça padrão — a que ele entra sem escolher, e a única marcada
-- verdadeira por pessoa (índice único parcial abaixo).
--
-- D-010: `workspaces.owner_id` já significa o administrador responsável pela
-- praça (migration 0002, glossário em cvg/docs/CONTEXT.md) e permanece
-- obrigatório (torná-la anulável quebraria o typecheck de
-- lib/actions/mensagens.ts, fora do escopo desta tarefa) — uma praça criada
-- pelo SysAdmin antes de existir um Administrador nasce com owner_id = o
-- próprio SysAdmin que a criou (lib/actions/pracas.ts:criarPracaAction),
-- responsável temporário até um Administrador ser vinculado a ela.

alter table public.workspace_members add column if not exists padrao boolean not null default false;

comment on column public.workspace_members.padrao is
  'Praça padrão da pessoa (R-47, ADR 0013, decisão D-016): a que ela entra sem escolher, '
  'quando tem mais de uma. No máximo uma linha com padrao = true por user_id — imposto pelo '
  'índice único parcial workspace_members_padrao_unica_idx, nunca por trigger. Dois jeitos de '
  'mudar (lib/actions/pracas.ts): vincularAdministradorAction substitui todo o conjunto de '
  'praças do Administrador e exige a padrão entre as vinculadas; criarAdminAction também grava '
  'padrao = true, na única linha que cria pro Administrador novo. Backfill nesta migration '
  '(0041): cada Administrador e Funcionário existente ganhou a praça padrão de forma '
  'determinística — o vínculo de papel "owner" antes de "membro", depois o mais antigo '
  '(created_at), depois o de menor workspace_id.';

-- No máximo uma praça padrão por pessoa. Índice parcial (só sobre
-- padrao = true) — as linhas com padrao = false não competem entre si.
create unique index if not exists workspace_members_padrao_unica_idx
  on public.workspace_members (user_id)
  where padrao;

comment on index public.workspace_members_padrao_unica_idx is
  'Garante no máximo uma praça padrão (padrao = true) por user_id — R-47, ADR 0013, D-016.';

-- Backfill: cada Administrador e Funcionário existente termina com exatamente
-- uma praça padrão. Critério determinístico quando há mais de um vínculo:
-- papel "owner" antes de "membro" (quem responde pela praça como dono vem
-- antes de quem só é membro dela), depois o vínculo mais antigo (created_at),
-- depois o menor workspace_id — para nunca depender da ordem de retorno do
-- banco. Quem não tem vínculo nenhum não recebe padrão (nada a marcar).
with prioridade as (
  select
    m.workspace_id,
    m.user_id,
    row_number() over (
      partition by m.user_id
      order by (m.role <> 'owner'), m.created_at asc, m.workspace_id asc
    ) as posicao
  from public.workspace_members m
  join public.profiles p on p.user_id = m.user_id
  where p.tipo_base in ('admin', 'funcionario')
)
update public.workspace_members m
   set padrao = true
  from prioridade pr
 where pr.posicao = 1
   and m.user_id = pr.user_id
   and m.workspace_id = pr.workspace_id
   and m.padrao is distinct from true;
