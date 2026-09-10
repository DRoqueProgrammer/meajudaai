---
id: T-20260910-f1-06-administrador-ve-so-as-pracas-dele
title: "O Administrador vê só as praças dele, e seletor só com duas ou mais"
status: done
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-05-sysadmin-cria-praca-e-vincula-administrador]
supersedes: (none)
touches_paths: [components/workspace-switcher.tsx, lib/auth/workspace.ts, app/(app)/layout.tsx]
creates_paths: [lib/auth/praca-ativa.ts]
source_note: "cvg/docs/tech-spec/fatia-1-seguranca.md"
created: "2026-09-10T00:00:00Z"
tags: []
owner: (none)
priority: P1
severity: feature
due_date: (none)
precondition: (none)
blocked_reason: (none)
security_class: (none)
source_action_item: (none)
tracker_ref: (none)
execution_backend: claude
signed_off: true
signed_off_by: operator
signed_off_at: 2026-09-10T17:30:33Z
accepted: true
accepted_by: operator
accepted_at: 2026-09-10T19:35:38Z
signed_off_sig: hmac-sha256-v3:9648e21f:b2957bc6ad94aeaf341faa98cdc43fc21a1a8ec1f9ac0b32c6a954ca746f5028
accepted_tier: 1
accepted_attempt_id: 4d9d04d5-3ab6-4266-af90-27e57b77b47a
accepted_authorization_ref: hmac-sha256-v3:9648e21f:b2957bc6ad94aeaf341faa98cdc43fc21a1a8ec1f9ac0b32c6a954ca746f5028
acceptance_record_digest: sha256:0a4af633f3a99daebebcfbaf9d878c1efa3eec966f11e68e87dfeed309482e0c
---

# O Administrador vê só as praças dele, e seletor só com duas ou mais

> **Why:** ADR 0013 — o seletor aparece para todo Administrador, mesmo com uma praça, com criar e excluir praça; a praça ativa é só um cookie ou a primeira da lista.

## Goal

O Administrador entra na praça padrão, vê seletor só com duas ou mais praças, e o seletor não cria nem exclui praça (R-48, R-49).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-48, R-49), ADR 0013, e o cabeçalho de tests/fatia1/seletor.test.ts (o contrato: mostrarSeletorDePraca e escolherPracaAtiva em lib/auth/praca-ativa.ts). getMyWorkspaces passa a trazer a marca padrao (coluna criada na tarefa 5).

Arquivo em grupo de rota do Next, declarado no frontmatter desta spec (o TaskPlan não aceita parênteses): app/(app)/layout.tsx.

## Behavior

- **B-1** — GIVEN a quantidade de praças do Administrador WHEN o layout decide se mostra o seletor THEN com 0 ou 1 não mostra; com 2 ou mais mostra
- **B-2** — GIVEN a lista de praças do Administrador e o cookie da praça ativa WHEN se escolhe a praça ativa THEN vale a do cookie se for dele, senão a padrão, senão a primeira; sem praça, nenhuma
- **B-3** — GIVEN o seletor WHEN a tarefa termina THEN não cria nem exclui praça, o layout usa a regra e a praça ativa sai da regra
- **B-4** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 6
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/seletor.test.ts
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
    description: "Gabarito da tarefa 6"
    runnable: bash
    check_type: deterministic
    verifies: [B-1, B-2, B-3]
    terminal: true
    expected_duration_sec: 30
  - id: eval_2
    description: "O gabarito não foi editado nem ganhou arquivo"
    runnable: bash
    check_type: deterministic
    verifies: [B-4]
    terminal: true
    expected_duration_sec: 2
  - id: eval_3
    description: "Typecheck verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-4]
    terminal: true
    expected_duration_sec: 60
  - id: eval_4
    description: "Lint verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-4]
    terminal: true
    expected_duration_sec: 60
  - id: eval_5
    description: "Suíte unitária verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-4]
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

- Esconder o seletor por CSS mantendo a lógica antiga.

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
