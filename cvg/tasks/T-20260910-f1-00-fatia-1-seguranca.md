---
id: T-20260910-f1-00-fatia-1-seguranca
title: "Fatia 1 · Fechar os riscos de segurança da vistoria"
status: ready
format_version: 3
profile: standard
effort: XL
budget_iterations: 15
agent: any
parent: (none)
depends_on: []
supersedes: (none)
children: [T-20260910-f1-01-servico-nasce-e-muda-pelo-fluxo, T-20260910-f1-02-contato-e-endereco-entre-as-partes, T-20260910-f1-03-mundo-de-exemplo-isolado, T-20260910-f1-04-ninguem-vira-administrador-sozinho, T-20260910-f1-05-sysadmin-cria-praca-e-vincula-administrador, T-20260910-f1-06-administrador-ve-so-as-pracas-dele, T-20260910-f1-07-modulos-presos-a-empresa, T-20260910-f1-08-login-lembra-so-o-email, T-20260910-f1-09-convite-nao-revela-conta, T-20260910-f1-10-portas-automaticas-contra-abuso, T-20260910-f1-11-regressao-no-navegador, T-20260910-f1-12-prestador-marca-realizado]
touches_paths: []
creates_paths: []
source_note: "cvg/docs/tech-spec/fatia-1-seguranca.md"
created: "2026-09-10T00:00:00Z"
tags: []
owner: (none)
priority: P0
severity: security
due_date: (none)
precondition: (none)
blocked_reason: (none)
security_class: (none)
source_action_item: (none)
tracker_ref: (none)
execution_backend: none
signed_off: false
signed_off_by: (none)
signed_off_at: (none)
accepted: false
accepted_by: (none)
accepted_at: (none)
---

# Fatia 1 · Fechar os riscos de segurança da vistoria

> **Why:** A vistoria de 10/09 confirmou riscos de segurança no código e o dono pediu todas as recomendações; esta fatia fecha os riscos antes de qualquer pessoa real.

## Goal

Os requisitos R-37 a R-54 da Fatia 1 valem, provados pelos gabaritos de tests/fatia1/ e pela regressão no navegador.

## Context

(none — the manifest contains all execution context)

## Behavior

- **B-1** — GIVEN os 12 filhos entregues e aceitos WHEN os gabaritos da Fatia 1 rodam pela suíte de integração contra o banco do protótipo THEN todos passam

## Success Criteria

```bash
# eval_1: Todos os gabaritos da Fatia 1 passam pela suíte de integração
eval_1() {
  npx vitest run --config vitest.integration.config.ts tests/fatia1
}

```

## Validation Card

```yaml
success_criteria:
  - id: eval_1
    description: "Todos os gabaritos da Fatia 1 passam pela suíte de integração"
    runnable: bash
    check_type: deterministic
    verifies: [B-1]
    terminal: true
    expected_duration_sec: 300
retry_policy:
  max_iterations: 15
  circuit_breaker_no_progress: 3
  on_terminal_failure: park_with_context
agent_contract:
  version: 2
  read: [intent, behavior, contract, guardrails]
  produce: [code, tests]
  required_tools: [git, bash]
  timeout_minutes: 30
  sandbox_type: host
  output_artifacts: []
  mcp_dependencies: []
  emit: [pass, fail, retry_with_reason, parked_with_context]
  backend_metadata: {}
```

## Exit Check

```bash
eval_1
```

## Rollback Plan

Revert only the declared write surface and park the task with context.

## Observability Hooks

(none — no runtime observability required)

## Anti-Patterns

- Do not weaken or edit the eval contract after sign-off.

## Do-Not-Touch

- `(none)`

## Open Questions

(none — this task is fully specified)
