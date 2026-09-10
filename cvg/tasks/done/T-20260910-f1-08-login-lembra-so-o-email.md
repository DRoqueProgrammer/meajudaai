---
id: T-20260910-f1-08-login-lembra-so-o-email
title: "O login lembra só o e-mail"
status: done
format_version: 3
profile: standard
effort: XS
budget_iterations: 15
agent: any
parent: (none)
depends_on: []
supersedes: (none)
touches_paths: [app/(auth)/login/page.tsx]
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
signed_off_at: 2026-09-10T17:28:42Z
accepted: true
accepted_by: operator
accepted_at: 2026-09-10T20:05:46Z
signed_off_sig: hmac-sha256-v3:9648e21f:fd7ea1d81e649eeb881b372a5c5996f40ec81303820884cbdd066ad03431cf58
accepted_tier: 1
accepted_attempt_id: fd29f0ea-d635-41cb-90a7-20512246cb1d
accepted_authorization_ref: hmac-sha256-v3:9648e21f:fd7ea1d81e649eeb881b372a5c5996f40ec81303820884cbdd066ad03431cf58
acceptance_record_digest: sha256:1fbce4bfdfe1e10f91e3f1451027400af239127f469e9c3c7c9bdb6f6ea9f741
---

# O login lembra só o e-mail

> **Why:** Pareceres 06 (LGPD) e 09 (code-reviewer) — a opção Salvar credenciais grava e-mail e senha em texto puro no localStorage. D-018 — lembrar só o e-mail.

## Goal

O login guarda no máximo o e-mail; a senha fica com o gerenciador do navegador; a senha já guardada por versões antigas é apagada na próxima visita (R-50).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-50), D-018 e o cabeçalho de tests/fatia1/login.test.ts. A opção passa a se chamar Lembrar meu e-mail. Os autoComplete de e-mail e senha continuam.

Arquivo em grupo de rota do Next, declarado no frontmatter desta spec (o TaskPlan não aceita parênteses): app/(auth)/login/page.tsx.

## Behavior

- **B-1** — GIVEN a página de login WHEN a pessoa marca Lembrar meu e-mail e entra THEN o navegador guarda o e-mail e nunca a senha, a senha não é restaurada do armazenamento, e o gerenciador de senhas segue funcionando
- **B-2** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 8
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/login.test.ts
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
    description: "Gabarito da tarefa 8"
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

- Guardar a senha criptografada no navegador — a chave estaria no mesmo navegador.

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
