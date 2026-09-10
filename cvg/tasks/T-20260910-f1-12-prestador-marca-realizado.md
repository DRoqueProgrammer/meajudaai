---
id: T-20260910-f1-12-prestador-marca-realizado
title: "O prestador marca o serviço como realizado"
status: ready
format_version: 3
profile: standard
effort: S
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-01-servico-nasce-e-muda-pelo-fluxo]
supersedes: (none)
touches_paths: [lib/actions/agenda-v2.ts, components/agenda/slot-detalhe.tsx]
creates_paths: []
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
signed_off_at: 2026-09-10T17:31:42Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:c36736dc9ae6b0f1a63431cc51cd2cd7a501f983a6e27f955a0650ab90169dcf
---

# O prestador marca o serviço como realizado

> **Why:** ADR 0016 — não existe na aplicação o caminho de marcar um serviço como realizado; os 25 realizados vieram de script. Sem ele o R-38 não tem caminho legítimo e o roteiro do R-54 não fecha (D-025).

## Goal

Na tela do serviço, o prestador marca como realizado um serviço confirmado dele; a regra do banco da tarefa 1 segue valendo.

## Context

Leia: ADR 0016, D-025 e o cabeçalho de tests/fatia1/realizado.test.ts (o contrato: marcarRealizadoAction(servicoId) em lib/actions/agenda-v2.ts e o botão Marcar como realizado em components/agenda/slot-detalhe.tsx, só para o prestador e só com o serviço confirmado). Siga o padrão das actions vizinhas (tryWriter, sessão do usuário, revalidatePath).

## Behavior

- **B-1** — GIVEN um serviço confirmado do prestador WHEN ele abre a tela do serviço THEN vê Marcar como realizado, e a action existe e só vale para serviço confirmado
- **B-2** — GIVEN a regra do banco da tarefa 1 WHEN a tarefa termina THEN o gabarito da tarefa 1 continua verde
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 12
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/realizado.test.ts
}

# eval_2: O gabarito da tarefa 1 continua verde
eval_2() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/servicos.test.ts
}

# eval_3: O gabarito não foi editado nem ganhou arquivo
eval_3() {
  git diff --quiet f251e2c -- tests/fatia1 vitest.gabarito.config.ts && test -z "$(git status --porcelain -- tests/fatia1 vitest.gabarito.config.ts)"
}

# eval_4: Typecheck verde
eval_4() {
  npm run typecheck
}

# eval_5: Lint e suíte unitária verdes
eval_5() {
  npm run lint && npm test
}

```

## Validation Card

```yaml
success_criteria:
  - id: eval_1
    description: "Gabarito da tarefa 12"
    runnable: bash
    check_type: deterministic
    verifies: [B-1]
    terminal: true
    expected_duration_sec: 30
  - id: eval_2
    description: "O gabarito da tarefa 1 continua verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
    terminal: true
    expected_duration_sec: 120
  - id: eval_3
    description: "O gabarito não foi editado nem ganhou arquivo"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 2
  - id: eval_4
    description: "Typecheck verde"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 60
  - id: eval_5
    description: "Lint e suíte unitária verdes"
    runnable: bash
    check_type: deterministic
    verifies: [B-3]
    terminal: true
    expected_duration_sec: 120
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

- Marcar realizado com a chave de serviço — a regra do banco tem de valer para a sessão do prestador.

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
