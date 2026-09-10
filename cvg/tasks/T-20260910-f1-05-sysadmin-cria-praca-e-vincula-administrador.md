---
id: T-20260910-f1-05-sysadmin-cria-praca-e-vincula-administrador
title: "O SysAdmin cria praça e vincula Administrador com praça padrão"
status: ready
format_version: 3
profile: standard
effort: L
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-03-mundo-de-exemplo-isolado, T-20260910-f1-04-ninguem-vira-administrador-sozinho]
supersedes: (none)
touches_paths: [lib/actions/admin-users.ts, lib/actions/convite.ts, lib/actions/workspace.ts, components/nav.tsx, components/criar-admin-form.tsx, lib/supabase/database.types.ts, app/(app)/admin/usuarios/page.tsx]
creates_paths: [supabase/migrations/0041_praca_padrao_do_administrador.sql, lib/actions/pracas.ts, components/admin/pracas-forms.tsx, app/(app)/admin/pracas/page.tsx]
source_note: "cvg/docs/tech-spec/fatia-1-seguranca.md"
created: "2026-09-10T00:00:00Z"
tags: []
owner: (none)
priority: P1
severity: security
due_date: (none)
precondition: (none)
blocked_reason: (none)
security_class: (none)
source_action_item: (none)
tracker_ref: (none)
execution_backend: claude
signed_off: true
signed_off_by: operator
signed_off_at: 2026-09-10T17:30:16Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:5abfaf38c01bcc4247eb0dbab1fa8d6e4d14c1350b93a4a5a777751d664c07a3
---

# O SysAdmin cria praça e vincula Administrador com praça padrão

> **Why:** ADR 0013 — a praça nasce do Administrador (auto-criada, criada por ele no seletor, ou pelo convite de sócio), não existe vínculo a praça existente nem praça padrão. D-016 — só o SysAdmin cria praça e vincula Administrador.

## Goal

O SysAdmin cria praça pela área dele e vincula um Administrador a uma ou mais praças com uma padrão (R-46, R-47); convite de Administrador e criação de praça passam a ser só dele; criar ou promover Administrador deixa de fabricar uma Empresa de nome.

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-46, R-47), ADR 0013, D-010, D-016, GAP-015, e o cabeçalho de tests/fatia1/pracas.test.ts (o contrato).
- workspace_members.padrao (booleano): no máximo uma por pessoa (índice único parcial); a migration marca a praça atual de cada Administrador e Funcionário existente.
- lib/actions/pracas.ts ("use server") exporta criarPracaAction(estado, formData), com os campos nome, cidade e estado, e vincularAdministradorAction(adminId, pracaIds, padraoId). O ator vem de tryWriter() (lib/auth/guard); quem não é SysAdmin é recusado ANTES de qualquer escrita. O vínculo SUBSTITUI o conjunto e exige a padrão entre as vinculadas. Escritas com a chave de serviço (lib/supabase/admin.ts).
- criarConviteAction("owner") recusa quem não é SysAdmin antes de qualquer consulta; criarEmpresaAction e excluirEquipeAction (lib/actions/workspace.ts) deixam de valer para quem não é SysAdmin.
- workspaces.owner_id é obrigatório hoje e significa administrador responsável (D-010): decida na migration como fica uma praça criada pelo SysAdmin antes de ter Administrador, e registre a escolha em COMMENT ON.
- Página /admin/pracas (criar e vincular) no menu do SysAdmin (components/nav.tsx); a página cita criarPracaAction e vincularAdministradorAction, e os formulários de cliente moram em components/admin/pracas-forms.tsx. Criar Administrador escolhe a praça padrão entre as existentes.
- Conta de exemplo (tarefa 3): criar praça e vincular também respeitam podeAgirSobre.

Arquivos em grupo de rota do Next, declarados no frontmatter desta spec (o TaskPlan não aceita parênteses): app/(app)/admin/usuarios/page.tsx (alterar) e app/(app)/admin/pracas/page.tsx (criar).

Migration: arquivo novo supabase/migrations/0041_praca_padrao_do_administrador.sql. Mesmos comandos da tarefa 1 (nunca imprima o token):
  export SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_TOKEN=' .env.local | cut -d= -f2-)
  npx supabase db push --linked --yes
  (para reaplicar a SUA 0041: migration repair --status reverted 0041 --linked, depois db push)
  npx supabase gen types typescript --linked > lib/supabase/database.types.ts
Nunca edite migration de outra tarefa. COMMENT ON na coluna e no índice novos.

## Behavior

- **B-1** — GIVEN os Administradores já existentes WHEN a migration roda THEN cada um tem exatamente uma praça padrão
- **B-2** — GIVEN um ator que não é SysAdmin WHEN tenta criar praça, vincular Administrador ou gerar convite de Administrador THEN é recusado e nada é escrito
- **B-3** — GIVEN o SysAdmin WHEN cria duas praças e vincula um Administrador a elas, depois a uma só, e tenta uma padrão fora do conjunto THEN as praças existem, o vínculo reflete exatamente o último conjunto com uma única padrão, e a padrão fora do conjunto é recusada
- **B-4** — GIVEN a interface do SysAdmin WHEN a tarefa termina THEN existe /admin/pracas no menu dele, usando as duas actions, e não se fabrica mais Empresa de nome
- **B-5** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 5 (código e banco, com a sessão simulada)
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/pracas.test.ts
}

# eval_2: O gabarito não foi editado nem ganhou arquivo
eval_2() {
  git diff --quiet f251e2c -- tests/fatia1 vitest.gabarito.config.ts && test -z "$(git status --porcelain -- tests/fatia1 vitest.gabarito.config.ts)"
}

# eval_3: Typecheck verde
eval_3() {
  npm run typecheck
}

# eval_4: Lint verde
eval_4() {
  npm run lint
}

# eval_5: Suíte unitária verde
eval_5() {
  npm test
}

```

## Validation Card

```yaml
success_criteria:
  - id: eval_1
    description: "Gabarito da tarefa 5 (código e banco, com a sessão simulada)"
    runnable: bash
    check_type: deterministic
    verifies: [B-1, B-2, B-3, B-4]
    terminal: true
    expected_duration_sec: 120
  - id: eval_2
    description: "O gabarito não foi editado nem ganhou arquivo"
    runnable: bash
    check_type: deterministic
    verifies: [B-5]
    terminal: true
    expected_duration_sec: 2
  - id: eval_3
    description: "Typecheck verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-5]
    terminal: true
    expected_duration_sec: 60
  - id: eval_4
    description: "Lint verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-5]
    terminal: true
    expected_duration_sec: 60
  - id: eval_5
    description: "Suíte unitária verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-5]
    terminal: true
    expected_duration_sec: 60
retry_policy:
  max_iterations: 15
  circuit_breaker_no_progress: 3
  on_terminal_failure: park_with_context
agent_contract:
  version: 2
  read: [intent, behavior, contract, guardrails]
  produce: [code, tests]
  required_tools: [bash, git, node, npx]
  timeout_minutes: 30
  sandbox_type: host
  output_artifacts: []
  mcp_dependencies: []
  emit: [pass, fail, retry_with_reason, parked_with_context]
  backend_metadata: {}
```

## Exit Check

```bash
eval_1 && eval_2 && eval_3 && eval_4 && eval_5
```

## Rollback Plan

Migration nova que remove workspace_members.padrao; remover a página e as actions.

## Observability Hooks

(none)

## Anti-Patterns

- Checar o papel depois de escrever.
- Apagar praça ou vínculo com histórico — a regra é nunca deletar (ROADMAP seção 3).
- Usar a sessão por cookie nas actions novas — o contrato é tryWriter mais chave de serviço.

## Do-Not-Touch

- `tests/fatia1`
- `vitest.gabarito.config.ts`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
