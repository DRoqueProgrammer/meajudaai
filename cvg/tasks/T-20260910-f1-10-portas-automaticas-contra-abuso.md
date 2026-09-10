---
id: T-20260910-f1-10-portas-automaticas-contra-abuso
title: "As portas automáticas resistem a abuso barato"
status: ready
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: []
supersedes: (none)
touches_paths: [app/api/cron/lembretes-avaliacao/route.ts, lib/actions/geocode.ts]
creates_paths: [lib/seguranca.ts]
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
signed_off_at: 2026-09-10T17:31:25Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:eec8f9d5e5115900680c93fc8445c23371b91288aeb4b151970ab03ea56f6061
---

# As portas automáticas resistem a abuso barato

> **Why:** Parecer 09 (code-reviewer) — o CRON_SECRET é comparado com igualdade simples (vaza tempo) e a busca de endereço não tem limite, podendo queimar a cota do Nominatim para todo mundo.

## Goal

A chave do agendador é conferida em tempo constante e a busca de endereço aceita no máximo 10 pedidos por pessoa a cada 60 segundos (R-52).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-52) e o cabeçalho de tests/fatia1/portas.test.ts (o contrato: segredoConfere(cabecalho, segredo) em lib/seguranca.ts). Use o rateLimit que já existe em lib/rate-limit.ts.

## Behavior

- **B-1** — GIVEN a conferência da chave do agendador WHEN chega a chave certa, uma errada de mesmo tamanho, uma de outro tamanho, nenhuma, ou o segredo não está configurado THEN só a certa passa, sem quebrar, comparando em tempo constante, e a rota usa essa conferência
- **B-2** — GIVEN a busca de endereço WHEN a mesma pessoa pede mais de 10 vezes em 60 segundos THEN o pedido 11 é recusado
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 10
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/portas.test.ts
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
    description: "Gabarito da tarefa 10"
    runnable: bash
    check_type: deterministic
    verifies: [B-1, B-2]
    terminal: true
    expected_duration_sec: 30
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

- timingSafeEqual em buffers de tamanhos diferentes (lança) — iguale o tamanho antes.
- Deixar o agendador aberto quando CRON_SECRET não está configurado.

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
