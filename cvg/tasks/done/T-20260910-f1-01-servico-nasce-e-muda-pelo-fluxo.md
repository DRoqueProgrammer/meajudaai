---
id: T-20260910-f1-01-servico-nasce-e-muda-pelo-fluxo
title: "O serviço só nasce e só muda pelo fluxo — regra no banco"
status: done
format_version: 3
profile: standard
effort: M
budget_iterations: 15
agent: any
parent: (none)
depends_on: []
supersedes: (none)
touches_paths: [lib/actions/agenda-v2.ts, lib/supabase/database.types.ts]
creates_paths: [supabase/migrations/0038_servico_nasce_e_muda_pelo_fluxo.sql]
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
signed_off_at: 2026-09-10T17:29:07Z
accepted: true
accepted_by: operator
accepted_at: 2026-09-10T18:06:32Z
signed_off_sig: hmac-sha256-v3:9648e21f:7147a20aab53152513f2589ba6bead6cc340ceff29bc3466f9ece85b2c9a7050
accepted_tier: 1
accepted_attempt_id: dde2d3f1-3742-44cd-b75a-1592e7d00188
accepted_authorization_ref: hmac-sha256-v3:9648e21f:7147a20aab53152513f2589ba6bead6cc340ceff29bc3466f9ece85b2c9a7050
acceptance_record_digest: sha256:0e8204b7e6162587585a7c72fd1f561b56887817aa0c6bc319a026db82791386
---

# O serviço só nasce e só muda pelo fluxo — regra no banco

> **Why:** ADR 0010 — o banco confere quem escreve em servicos, não a regra do agendamento; um cliente fora da aplicação cria serviço já realizado, reserva horário ocupado, inventa preço e confirma o próprio pedido (confirmado ao vivo pelo gabarito). ADR 0011 — a reserva do cliente não consegue marcar o horário.

## Goal

As regras de nascimento e de mudança de estado do serviço (R-37, R-38, R-39) passam a valer no banco para qualquer sessão autenticada, e o próprio banco marca o horário como pendente quando o serviço nasce.

## Context

Leia antes: cvg/docs/tech-spec/fatia-1-seguranca.md (R-37 a R-39), cvg/docs/adrs/0010, 0011 e 0017, e o cabeçalho de tests/fatia1/servicos.test.ts — ele é o contrato.
- Nascimento: só o cliente dono insere; estado inicial pendente; horário livre e do prestador indicado; preco_tipo e preco_valor iguais aos do perfil do prestador.
- Transições: pendente para confirmado só pelo prestador; confirmado para realizado só pelo prestador; pendente ou confirmado para cancelado por qualquer das partes, com motivo não vazio depois de trim; realizado e cancelado são finais.
- O banco marca agenda_slots como pendente quando o serviço nasce. A sessão do cliente não tem, e não deve ganhar, permissão de atualizar agenda_slots.
- A chave de serviço (service_role, usada por scripts de seed e código de servidor) não é barrada.
- A renegociação continua: o prestador grava preco_pendente e o cliente copia para preco_valor ao aceitar.
Ajuste reservarSlotAction (lib/actions/agenda-v2.ts) para não depender do update do horário pela sessão do cliente.

Migration: arquivo novo supabase/migrations/0038_servico_nasce_e_muda_pelo_fluxo.sql, na sequência da 0037. Nunca edite migration de outra tarefa — corrija com uma nova. Base única do protótipo, sem staging. Comandos (nunca imprima o token):
  export SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_TOKEN=' .env.local | cut -d= -f2-)
  npx supabase db push --linked --yes
  (para reaplicar a SUA 0038 enquanto itera: escreva-a idempotente, com drop if exists e create or replace, e rode)
  npx supabase migration repair --status reverted 0038 --linked
  npx supabase db push --linked --yes
  npx supabase gen types typescript --linked > lib/supabase/database.types.ts
Toda tabela, coluna e função nova ganha COMMENT ON (convenção do CLAUDE.md). Função SECURITY DEFINER fixa search_path.
Os gabaritos de integração leem as credenciais do .env.local sozinhos (tests/setup.ts).

## Behavior

- **B-1** — GIVEN um cliente autenticado falando direto com o banco WHEN tenta criar serviço já realizado ou confirmado, em horário ocupado, com prestador que não é o dono do horário, ou com valor ou tipo de preço diferentes do perfil THEN o banco recusa, nenhum serviço nasce e o contador público do prestador não se move
- **B-2** — GIVEN um horário livre de um prestador WHEN o cliente insere o próprio serviço com os dados do perfil do prestador THEN o serviço nasce pendente e o horário passa a pendente
- **B-3** — GIVEN um serviço pendente, confirmado, realizado ou cancelado WHEN o cliente tenta confirmar ou realizar, alguém cancela sem motivo, ou alguém muda um realizado ou cancelado THEN o estado não muda — e o prestador confirma, marca realizado (contador +1) e a renegociação segue funcionando
- **B-4** — GIVEN o resto do app WHEN a tarefa termina THEN typecheck, lint e testes unitários seguem verdes e o gabarito está intacto

## Success Criteria

```bash
# eval_1: Gabarito da tarefa 1 contra o banco do protótipo
eval_1() {
  npx vitest run --config vitest.gabarito.config.ts tests/fatia1/servicos.test.ts
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
    description: "Gabarito da tarefa 1 contra o banco do protótipo"
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

Uma migration nova que remove os gatilhos e funções da 0038 e restaura as políticas de servicos da 0024.

## Observability Hooks

(none)

## Anti-Patterns

- Regra só em lib/actions — o gabarito ataca fora da aplicação.
- Barrar a service_role — quebra os scripts de seed.
- Travar preco_valor para o cliente — quebra a renegociação (fica para a Fatia 5).
- Mexer na unicidade de slot_id ou fazer o cancelamento liberar o horário — é da Fatia 4 (ADR 0017).
- Reaplicar a migration editada sem migration repair.
- Dar à sessão do cliente permissão de atualizar agenda_slots.

## Do-Not-Touch

- `tests/fatia1`
- `vitest.gabarito.config.ts`
- `.cvg`
- `cvg/docs`
- `cvg/brain`
- `.env.local`

## Open Questions

(none — this task is fully specified)
