---
id: T-20260910-f1-11-regressao-no-navegador
title: "Regressão no navegador e gabaritos de volta à suíte de integração"
status: ready
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-01-servico-nasce-e-muda-pelo-fluxo, T-20260910-f1-02-contato-e-endereco-entre-as-partes, T-20260910-f1-03-mundo-de-exemplo-isolado, T-20260910-f1-04-ninguem-vira-administrador-sozinho, T-20260910-f1-05-sysadmin-cria-praca-e-vincula-administrador, T-20260910-f1-06-administrador-ve-so-as-pracas-dele, T-20260910-f1-07-modulos-presos-a-empresa, T-20260910-f1-08-login-lembra-so-o-email, T-20260910-f1-09-convite-nao-revela-conta, T-20260910-f1-10-portas-automaticas-contra-abuso, T-20260910-f1-12-prestador-marca-realizado]
supersedes: (none)
touches_paths: [vitest.config.ts, vitest.integration.config.ts, vitest.gabarito.config.ts, tsconfig.json, package.json, package-lock.json]
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
signed_off_at: 2026-09-10T20:59:29Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:f2be42d4991e4fc9db2320c70e888ddb05490c9cb1054d1fc6b1fb44403127c8
---

# Regressão no navegador e gabaritos de volta à suíte de integração

> **Why:** R-53 exige os ataques como testes permanentes da suíte que fala com o banco; R-54 exige que nenhuma jornada que funcionava quebre.

## Goal

Os gabaritos da Fatia 1 voltam à suíte de integração (fora da exclusão do npm test e do typecheck) e verdes, e o roteiro de regressão no navegador passa nos 10 passos.

## Context

O controller já entregou, antes do handoff desta tarefa (commit f1cab83): o roteiro de regressão em scripts/regressao/ (gabarito do R-54, 10/10 contra o build de produção — não o edite), o gabarito tests/fatia1/vinculo.test.ts (achado da revisão da tarefa 1) e playwright-core como devDependency. Esta tarefa tira a exclusão de tests/fatia1 do vitest.config.ts e do tsconfig.json (os gabaritos já compilam), leva à vitest.integration.config.ts o que os gabaritos precisam (tempo de espera de 60 s e arquivos em sequência), e apaga vitest.gabarito.config.ts e o script test:gabarito do package.json.

## Behavior

- **B-1** — GIVEN os gabaritos da Fatia 1 WHEN rodam pela suíte de integração normal THEN passam todos, sem configuração própria
- **B-2** — GIVEN o build de produção com as contas de exemplo WHEN o roteiro reserva, confirma, marca realizado, cancela com motivo, mostra o WhatsApp e entra pelos 5 botões da landing THEN os 10 passos passam
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck e testes unitários seguem verdes

## Success Criteria

```bash
# eval_1: Gabaritos da Fatia 1 pela suíte de integração
eval_1() {
  npx vitest run --config vitest.integration.config.ts tests/fatia1
}

# eval_2: Roteiro de regressão no navegador contra o build de produção
eval_2() {
  bash scripts/regressao/rodar-fatia1.sh
}

# eval_3: Typecheck e suíte unitária verdes
eval_3() {
  npm run typecheck && npm test
}

```

## Validation Card

```yaml
success_criteria:
  - id: eval_1
    description: "Gabaritos da Fatia 1 pela suíte de integração"
    runnable: bash
    check_type: deterministic
    verifies: [B-1]
    terminal: true
    expected_duration_sec: 300
  - id: eval_2
    description: "Roteiro de regressão no navegador contra o build de produção"
    runnable: bash
    check_type: deterministic
    verifies: [B-2]
    terminal: true
    expected_duration_sec: 400
  - id: eval_3
    description: "Typecheck e suíte unitária verdes"
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
eval_1 && eval_2 && eval_3
```

## Rollback Plan

Reverter o commit da tarefa.

## Observability Hooks

(none)

## Anti-Patterns

- Pular um passo do roteiro para ficar verde.

## Do-Not-Touch

- `tests/fatia1`
- `scripts/regressao`
- `supabase/migrations`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
