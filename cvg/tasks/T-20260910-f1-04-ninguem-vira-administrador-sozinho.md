---
id: T-20260910-f1-04-ninguem-vira-administrador-sozinho
title: "Ninguém se torna Administrador por conta própria"
status: in-progress
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-02-contato-e-endereco-entre-as-partes]
supersedes: (none)
touches_paths: [lib/actions/auth.ts, components/trocar-papel.tsx, app/(auth)/cadastro/form.tsx]
creates_paths: [lib/auth/papeis.ts]
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
signed_off_at: 2026-09-10T17:29:59Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:b4b1b1b449473d5950cac0c105a4499e2452a035cde6288230fee98663985d16
---

# Ninguém se torna Administrador por conta própria

> **Why:** ADR 0013 — o cadastro público aceita tipo_base admin (lib/validation.ts) e a troca de papel leva prestador a Administrador, então qualquer pessoa vira Administrador. D-016 — na v2, Administrador nasce só por ação do SysAdmin.

## Goal

O cadastro público oferece só Cliente e Prestador de Serviço, a troca de papel nunca leva a Administrador, e os dois usam uma regra única em lib/auth/papeis.ts (R-44).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-44), ADR 0013, D-016, e o cabeçalho de tests/fatia1/papeis.test.ts (o contrato: PAPEIS_DO_CADASTRO_PUBLICO, papelPermitidoNoCadastro(tipo, temConvite) e podeTrocarPara(atual, novo) em lib/auth/papeis.ts). Depende da tarefa 2 porque as duas mexem em lib/actions/auth.ts. O cadastro por convite continua valendo o papel do convite. Administradores existentes não perdem acesso. O componente de troca de papel decide sozinho não aparecer quando não houver destino permitido — a página do perfil fica fora do escopo.

Arquivo em grupo de rota do Next, declarado no frontmatter desta spec (o TaskPlan não aceita parênteses): app/(auth)/cadastro/form.tsx.

## Behavior

- **B-1** — GIVEN a regra única de papéis WHEN se pergunta que papéis o cadastro público e a troca de papel aceitam THEN sem convite só Cliente e Prestador passam, papel desconhecido nunca passa, com convite vale o papel do convite, e a troca nunca leva a Administrador
- **B-2** — GIVEN a tela de cadastro e as actions de cadastro e troca WHEN a tarefa termina THEN a tela não oferece a opção de empresa e as duas actions usam a regra única
- **B-3** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 4
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/papeis.test.ts
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
    description: "Gabarito da tarefa 4"
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

- Esconder a opção só na tela, deixando a action aceitar admin.
- Quebrar o cadastro por convite.

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
