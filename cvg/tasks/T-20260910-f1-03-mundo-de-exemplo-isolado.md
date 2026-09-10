---
id: T-20260910-f1-03-mundo-de-exemplo-isolado
title: "Contas de exemplo presas ao mundo de exemplo"
status: ready
format_version: 3
profile: standard
effort: L
budget_iterations: 15
agent: any
parent: (none)
depends_on: [T-20260910-f1-02-contato-e-endereco-entre-as-partes]
supersedes: (none)
touches_paths: [lib/auth/contas-exemplo.ts, lib/auth/roles.ts, lib/actions/admin-users.ts, lib/supabase/database.types.ts, app/(app)/admin/logs/page.tsx, app/(app)/admin/servicos/page.tsx, app/(app)/admin/usuarios/page.tsx]
creates_paths: [supabase/migrations/0040_marca_do_mundo_de_exemplo.sql, lib/auth/exemplo.ts, lib/admin/consultas.ts]
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
signed_off_at: 2026-09-10T17:29:42Z
accepted: false
accepted_by: (none)
accepted_at: (none)
signed_off_sig: hmac-sha256-v3:9648e21f:c67e80d6efe3ec7e96cb3b27c787b2bf7dce1a780093d763db076e58cbd00446
---

# Contas de exemplo presas ao mundo de exemplo

> **Why:** ADR 0012 — as contas de exemplo são contas reais sem marca própria, e a conta de exemplo SysAdmin, de um clique na landing, lê e altera os dados de todo mundo. O dono manteve as cinco contas (D-015); o risco fecha por isolamento.

## Goal

Uma conta de exemplo, de qualquer papel, só enxerga e altera o mundo de exemplo (R-42), e a senha das contas de exemplo só existe no servidor (R-43).

## Context

Leia: cvg/docs/tech-spec/fatia-1-seguranca.md (R-42, R-43), ADR 0012, D-015, e o cabeçalho de tests/fatia1/exemplo.test.ts (o contrato).
- profiles.exemplo (booleano, padrão falso); a migration marca exatamente as cinco contas de lib/auth/contas-exemplo.ts, casadas pelo e-mail.
- lib/auth/exemplo.ts exporta podeAgirSobre(ator, alvo): conta de exemplo não age sobre quem não é de exemplo. O usuário corrente (lib/auth/roles.ts) passa a carregar se é de exemplo.
- lib/admin/consultas.ts exporta listarAcessos(db, ator), listarServicosDaPlataforma(db, ator) e listarUsuarios(db, ator): com ator de exemplo, só o mundo de exemplo. As páginas /admin/logs (as duas abas), /admin/servicos e /admin/usuarios passam a usar essas funções.
- definirPapelAction consulta podeAgirSobre sobre o alvo; criarAdminAction recusa ator de exemplo (criaria uma conta real).
- lib/auth/contas-exemplo.ts ganha import server-only (o vitest já tem stub para ele).
Os cinco botões da landing continuam entrando (a regressão da tarefa 11 confere); a rota app/api/exemplo fica como está.

Arquivos em grupo de rota do Next, declarados no frontmatter desta spec (o TaskPlan não aceita parênteses): app/(app)/admin/logs/page.tsx, app/(app)/admin/servicos/page.tsx, app/(app)/admin/usuarios/page.tsx.

Migration: arquivo novo supabase/migrations/0040_marca_do_mundo_de_exemplo.sql. Mesmos comandos da tarefa 1 (nunca imprima o token):
  export SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_TOKEN=' .env.local | cut -d= -f2-)
  npx supabase db push --linked --yes
  (para reaplicar a SUA 0040: migration repair --status reverted 0040 --linked, depois db push)
  npx supabase gen types typescript --linked > lib/supabase/database.types.ts
Nunca edite migration de outra tarefa. COMMENT ON na coluna nova.

## Behavior

- **B-1** — GIVEN a base do protótipo WHEN se consulta quem carrega a marca de exemplo, e se cria uma pessoa nova THEN exatamente as cinco contas de exemplo carregam a marca, e a pessoa nova nasce sem ela
- **B-2** — GIVEN uma pessoa que não é de exemplo, com acesso registrado e serviço WHEN as consultas administrativas rodam com um ator de exemplo e com um ator real THEN o ator de exemplo não a vê em acessos, serviços nem usuários; o ator real vê
- **B-3** — GIVEN a regra única de escrita administrativa WHEN um ator de exemplo tenta agir sobre quem não é de exemplo THEN podeAgirSobre recusa, a action de mudar papel a consulta, e a senha das contas de exemplo fica só no servidor
- **B-4** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 3 (regra pura, uso nas telas e contra o banco)
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/exemplo.test.ts
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
    description: "Gabarito da tarefa 3 (regra pura, uso nas telas e contra o banco)"
    runnable: bash
    check_type: deterministic
    verifies: [B-1, B-2, B-3]
    terminal: true
    expected_duration_sec: 120
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

Migration nova que remove profiles.exemplo; as páginas voltam a ler sem escopo.

## Observability Hooks

(none)

## Anti-Patterns

- Remover as contas de exemplo ou os botões da landing — o dono decidiu mantê-los (D-015).
- Reconhecer conta de exemplo pelo domínio do e-mail em tempo de consulta, espalhado pelo código — a marca mora no banco e a regra num lugar só.
- Filtrar só na tela sem que a função de consulta imponha o escopo.

## Do-Not-Touch

- `tests/fatia1`
- `vitest.gabarito.config.ts`
- `app/api/exemplo`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
