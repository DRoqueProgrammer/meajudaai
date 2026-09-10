---
id: T-20260910-f1-09-convite-nao-revela-conta
title: "O convite para a equipe não revela quem tem conta"
status: ready
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-05-sysadmin-cria-praca-e-vincula-administrador]
supersedes: (none)
touches_paths: [lib/actions/workspace.ts, components/convidar-form.tsx]
creates_paths: [lib/convite-texto.ts]
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
signed_off_at: 2026-09-10T17:31:08Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:d39c1d6d4b436e0d3503a5e6eeabd222ce77b4e4fbd862618788e8288d2ca480
---

# O convite para a equipe não revela quem tem conta

> **Why:** Parecer 09 (code-reviewer) — convidarMembroAction responde Nenhum usuário com este e-mail ou já faz parte da equipe, um oráculo de quem tem conta.

## Goal

O convite responde a mesma mensagem neutra para e-mail com e sem conta (R-51).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-51) e o cabeçalho de tests/fatia1/convite.test.ts (o contrato: MENSAGEM_CONVITE_NEUTRA em lib/convite-texto.ts, fora do arquivo use server porque ele só pode exportar funções). Depende da tarefa 5 porque as duas mexem em lib/actions/workspace.ts.

## Behavior

- **B-1** — GIVEN um convite para a equipe WHEN o e-mail tem conta e quando não tem THEN a resposta é a mesma mensagem neutra, que não afirma nem nega a conta
- **B-2** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 9
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/convite.test.ts
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
    description: "Gabarito da tarefa 9"
    runnable: bash
    check_type: deterministic
    verifies: [B-1]
    terminal: true
    expected_duration_sec: 30
  - id: eval_2
    description: "O gabarito não foi editado nem ganhou arquivo"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
    terminal: true
    expected_duration_sec: 2
  - id: eval_3
    description: "Typecheck verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
    terminal: true
    expected_duration_sec: 60
  - id: eval_4
    description: "Lint verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
    terminal: true
    expected_duration_sec: 60
  - id: eval_5
    description: "Suíte unitária verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
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

- Diferenciar as respostas por tempo ou por outro campo do retorno.

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
