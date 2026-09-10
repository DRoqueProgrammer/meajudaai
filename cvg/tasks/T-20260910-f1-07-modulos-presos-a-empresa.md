---
id: T-20260910-f1-07-modulos-presos-a-empresa
title: "Liberação de módulo vale só na empresa que liberou"
status: ready
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-06-administrador-ve-so-as-pracas-dele]
supersedes: (none)
touches_paths: [lib/auth/modules.ts, lib/auth/workspace.ts, lib/actions/modules.ts]
creates_paths: []
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
signed_off_at: 2026-09-10T17:30:50Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:34cc8fdad66f6bfd51050e19c3156bd9a935ea51617c980542af25dbf7c9e0bf
---

# Liberação de módulo vale só na empresa que liberou

> **Why:** ADR 0014 — user_modules grava a liberação por empresa, mas getAllowedModules lê sem a empresa e setModuloFuncionarioAction não confere se o alvo é membro.

## Goal

A leitura dos módulos de um funcionário considera a empresa ativa, e a concessão recusa quem não é membro da empresa (R-45).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-45), ADR 0014, e o cabeçalho de tests/fatia1/modulos.test.ts (o contrato: modulosDoFuncionario(db, userId, workspaceId) em lib/auth/modules.ts e ehMembroDaEmpresa(db, userId, workspaceId) em lib/auth/workspace.ts). Depende da tarefa 6 porque as duas mexem em lib/auth/workspace.ts. As chamadas atuais de getAllowedModules passam a considerar a empresa ativa.

## Behavior

- **B-1** — GIVEN um funcionário membro da empresa A, com módulo liberado na A e outro liberado na B, onde não é membro WHEN se leem os módulos dele na empresa A e numa empresa C sem liberação THEN na A vale só o da A; na C vale o padrão do papel
- **B-2** — GIVEN a concessão de módulo WHEN o alvo não é membro da empresa THEN ehMembroDaEmpresa diz não e a action de concessão a consulta
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 7 (código e banco)
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/modulos.test.ts
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
    description: "Gabarito da tarefa 7 (código e banco)"
    runnable: bash
    check_type: deterministic
    verifies: [B-1, B-2]
    terminal: true
    expected_duration_sec: 120
  - id: eval_2
    description: "O gabarito não foi editado nem ganhou arquivo"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 2
  - id: eval_3
    description: "Typecheck verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 60
  - id: eval_4
    description: "Lint verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 60
  - id: eval_5
    description: "Suíte unitária verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
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

Reverter o commit da tarefa.

## Observability Hooks

(none)

## Anti-Patterns

- Mudar o formato de user_modules — a empresa já está gravada (ADR 0014).

## Do-Not-Touch

- `tests/fatia1`
- `vitest.gabarito.config.ts`
- `supabase/migrations`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
