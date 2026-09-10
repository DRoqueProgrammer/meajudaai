---
id: T-20260910-f1-02-contato-e-endereco-entre-as-partes
title: "Contato, chave e endereço só entre as partes de um serviço válido"
status: done
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-01-servico-nasce-e-muda-pelo-fluxo]
supersedes: (none)
touches_paths: [lib/actions/auth.ts, lib/supabase/database.types.ts]
creates_paths: [supabase/migrations/0039_contato_e_endereco_entre_as_partes.sql]
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
execution_backend: claude
signed_off: true
signed_off_by: operator
signed_off_at: 2026-09-10T17:29:24Z
accepted: true
accepted_by: operator
accepted_at: 2026-09-10T18:22:50Z
signed_off_sig: hmac-sha256-v3:9648e21f:63318f0faa4c1e5ec8f9491fcd52f1a105d4f8a7d8e1efccd747c4683fd6c4bf
accepted_tier: 1
accepted_attempt_id: a461cd5c-37d5-4fbf-8188-fd34ce733343
accepted_authorization_ref: hmac-sha256-v3:9648e21f:63318f0faa4c1e5ec8f9491fcd52f1a105d4f8a7d8e1efccd747c4683fd6c4bf
acceptance_record_digest: sha256:376e70d840af14057c344eb9fc6c54d5c5703dec37fe04f86296f74abea39e1f
---

# Contato, chave e endereço só entre as partes de um serviço válido

> **Why:** ADR 0010 — tem_servico_com libera contato e ponto exato em qualquer status, inclusive cancelado. ADR 0015 — o endereço escrito mora em profiles, tabela que qualquer autenticado lê.

## Goal

Contato, chave de recebimento e ponto exato abrem só com serviço pendente, confirmado ou realizado (R-40, D-017); o endereço escrito sai de profiles e passa a morar em profile_local.endereco, sob a mesma regra (R-41), e o cadastro grava lá.

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-40, R-41), ADRs 0010 e 0015, e o cabeçalho de tests/fatia1/contato.test.ts (o contrato). profiles.endereco tem 0 linhas preenchidas (ADR 0015) e ninguém a lê — só o cadastro (cadastrarAction em lib/actions/auth.ts) grava. O endereço de um SERVIÇO (servicos.endereco) é outra coisa e não muda.

Migration: arquivo novo supabase/migrations/0039_contato_e_endereco_entre_as_partes.sql. Mesmos comandos da tarefa 1 (nunca imprima o token):
  export SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_TOKEN=' .env.local | cut -d= -f2-)
  npx supabase db push --linked --yes
  (para reaplicar a SUA 0039: migration repair --status reverted 0039 --linked, depois db push)
  npx supabase gen types typescript --linked > lib/supabase/database.types.ts
Nunca edite migration de outra tarefa. COMMENT ON na coluna nova e na função alterada.

## Behavior

- **B-1** — GIVEN um cliente e um prestador com um único serviço entre eles WHEN o serviço está pendente, confirmado ou realizado — e depois cancelado THEN cada um lê o contato e o ponto exato do outro nos três primeiros estados, e ninguém lê nada com o serviço cancelado
- **B-2** — GIVEN o endereço escrito de uma pessoa WHEN um estranho, a outra parte de um serviço válido e a própria pessoa tentam lê-lo THEN ele não existe mais em profiles, mora em profile_local.endereco, o estranho lê 0 e as outras duas leem
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 2 contra o banco do protótipo
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/contato.test.ts
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
    description: "Gabarito da tarefa 2 contra o banco do protótipo"
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

Migration nova que devolve profiles.endereco e restaura tem_servico_com da 0027.

## Observability Hooks

(none)

## Anti-Patterns

- Esconder o endereço só na tela — a leitura direta pelo banco continuaria.
- Mexer em servicos.endereco (endereço do serviço, não da pessoa).
- Mudar a leitura global de profiles como um todo — é da Fatia 5 (W-4).

## Do-Not-Touch

- `tests/fatia1`
- `vitest.gabarito.config.ts`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
