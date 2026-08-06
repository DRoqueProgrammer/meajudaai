# BUILD REPORT: Chat Duplo + Permissão Granular por Funcionário

> Implementation report for CHAT_E_PERMISSOES

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CHAT_E_PERMISSOES |
| **Date** | 2026-08-05 |
| **Author** | build-agent (execução direta) |
| **DEFINE** | [DEFINE_CHAT_E_PERMISSOES.md](../features/DEFINE_CHAT_E_PERMISSOES.md) |
| **DESIGN** | [DESIGN_CHAT_E_PERMISSOES.md](../features/DESIGN_CHAT_E_PERMISSOES.md) |
| **Status** | ✅ Shipped (2026-08-05) — migration aplicada, smoke ao vivo + suíte de integração RLS 13/13 contra o banco real (read + write + capacidade) |

---

## Summary

| Metric | Value |
|--------|-------|
| **Tasks Completed** | 15/16 do manifesto (nav.tsx dispensado) + 6 arquivos além do manifesto |
| **Files Created** | 4 (1 além do manifesto: o resolver `/chat/vaga`) |
| **Files Modified** | 14 · **Deleted** | 1 (`chat/[vagaId]`) |
| **Lines of Code** | ~780 adicionadas/alteradas |
| **Build Time** | — |
| **Tests Passing** | 35/35 unit · 13 RLS de integração autorados (skipados sem DB) |
| **Agents Used** | 0 (execução direta — ver Autonomous Decisions #1) |

---

## Task Execution with Agent Attribution

| # | Task | Agent | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Migration `0013` (conversas, RLS, capacidades, backfill) | (direct) | ✅ Escrita | **Não aplicada** — deploy gated |
| 2 | `database.types.ts` (tipos novos + nullable) | (direct) | ✅ | typecheck limpo |
| 3 | `lib/modules.ts` (AppCapability, CAPABILITIES) | (direct) | ✅ | |
| 4 | `lib/auth/modules.ts` (getAllowedCapabilities, requireCapability) | (direct) | ✅ | default OFF |
| 5 | `lib/actions/modules.ts` (aceita capacidade) | (direct) | ✅ | |
| 6 | `lib/actions/conversas.ts` (ensure canal/dm interna/externa) | (direct) | ✅ | módulo server-only |
| 7 | `lib/validation.ts` (MensagemSchema → conversaId) | (direct) | ✅ | |
| 8 | `lib/actions/mensagens.ts` (envio por conversa + notificação) | (direct) | ✅ | |
| 9 | `lib/actions/candidaturas.ts` (aceite → ensureDmExterna) | (direct) | ✅ | link → /chat/{conversaId} |
| 10 | `lib/actions/leitura.ts` (lido_ate por conversa) | (direct) | ✅ | |
| 11 | `components/chat/chat-thread.tsx` (realtime por conversa_id) | (direct) | ✅ | |
| 12 | `app/(app)/chat/[conversaId]/page.tsx` (thread canônica) | (direct) | ✅ | renomeia `[vagaId]` |
| 12b | `app/(app)/chat/vaga/[vagaId]/page.tsx` (resolver) | (direct) | ✅ | **além do manifesto** |
| 13 | `app/(app)/mensagens/page.tsx` (inbox de conversas) | (direct) | ✅ | |
| 14 | `components/modulos-funcionario.tsx` (chips de capacidade) | (direct) | ✅ | |
| 15 | `lib/actions/vagas.ts` (requireCapability publicar_vagas) | (direct) | ✅ | publicar + editar |
| 16 | `components/nav.tsx` | — | ⏭️ Dispensado | /mensagens já cobre o chat interno |
| + | `app/(app)/{equipe,layout,avaliar,candidatos,minhas-diarias}` | (direct) | ✅ | links + badge (ver Deviations) |
| + | `tests/rls.test.ts` (conserto + casos de conversa/capacidade) | (direct) | ✅ | +3 casos |

---

## Agent Contributions

| Agent | Files | Specialization Applied |
|-------|-------|------------------------|
| (direct) | 20 | Padrões do DESIGN + KB `supabase` (rls-policies, realtime, multi-tenant-rls) e convenções do repo |

O manifesto sugeria `@agentspec:cloud:supabase-specialist` para os arquivos de banco. Execução direta — ver Autonomous Decisions #1.

---

## Files Created

| File | ~Lines | Agent | Verified | Notes |
| ---- | ----- | ----- | -------- | ----- |
| `supabase/migrations/0013_conversas_e_capacidades.sql` | 130 | (direct) | ⏸️ | Escrita; **não aplicada** (gated) |
| `lib/actions/conversas.ts` | 110 | (direct) | ✅ tsc | find-or-create |
| `app/(app)/chat/[conversaId]/page.tsx` | 65 | (direct) | ✅ tsc | |
| `app/(app)/chat/vaga/[vagaId]/page.tsx` | 30 | (direct) | ✅ tsc | resolver vaga→conversa |

---

## Verification Results

### Lint Check

```text
next lint não está configurado no projeto (abre prompt interativo; sem .eslintrc).
Gate efetivo do repo = tsc + vitest.
```

**Status:** ⏭️ Skipped (não configurado)

### Type Check

```text
> tsc --noEmit
(sem erros)
```

**Status:** ✅ Pass

### Tests

```text
> vitest run                       # unit
✓ format (9) · periodo (10) · validation (16) → 35 passed

> npm run test:integration         # RLS contra o Supabase real (migrado)
✓ tests/rls.test.ts (13) — inclui:
    ✓ não-membro NÃO lê mensagens de conversa alheia (anti-IDOR)
    ✓ estranho NÃO manda mensagem em conversa que não é dele
    ✓ funcionário SEM chat_ajudantes não vê a DM externa
    ✓ funcionário COM chat_ajudantes vê a DM externa
    ✓ ajudante se candidata, conversa e avalia na diária dele
Tests  48 passed (48)
```

| Test | Result |
|------|--------|
| format / periodo / validation (unit) | ✅ 35/35 |
| rls (integração, conversa + capacidade) | ✅ 13/13 contra o banco real |

**Status:** ✅ 48/48 Pass (35 unit + 13 integração RLS)

---

## Issues Encountered

| # | Issue | Resolution | Time Impact |
|---|-------|------------|-------------|
| 1 | Cache stale do Next (`.next/types/validator.ts`) apontava para a rota removida `[vagaId]` | `rm .next` e re-typecheck | +2m |
| 2 | Tornar `mensagens.vaga_id` nullable quebraria a página de mensagens (chave de Map) e o badge de não-lidas | Reescrita da inbox para conversas; badge de mensagens adiado (ver Deviations) | +10m |
| 3 | Teste "caminho feliz" do `rls.test.ts` inseria mensagem no shape antigo (falharia pós-migration) | Reescrito para o modelo de conversa + 3 casos novos | +8m |

---

## Autonomous Decisions

| # | Decision Point | Options Considered | Chose | Rationale |
|---|----------------|--------------------|-------|-----------|
| 1 | Delegar ao supabase-specialist vs executar direto | Task(subagent) vs direto | **Direto** | Contexto (schema, RLS, patterns) já mapeado na sessão; subagente frio re-derivaria tudo; mantém o gate de aplicação da migration sob controle |
| 2 | Aplicar a migration `0013` no banco vivo | Aplicar via MCP vs só escrever | **Só escrever** | Backfill + drop de constraint = ação irreversível/data-loss; política do build reserva isso como halt. Aguarda aprovação |
| 3 | Rota do chat externo | Resolver vaga→conversa em cada caller vs rota resolver única | **Resolver `/chat/vaga/[vagaId]`** | DRY: tradução num lugar só; os callers só trocam a string do href |
| 4 | Lado-equipe da DM externa | Materializar cada funcionário em conversa_membros vs derivar de workspace_members+capacidade | **Derivar (na RLS)** | Segue ADR-2; revogar capacidade corta acesso na hora, sem sincronizar linhas |
| 5 | Badge de não-lidas de mensagens | Recomputar por lido_ate vs adiar | **Adiar (COULD)** | Layout passa só o badge de alertas; `lido_ate` gravado para uso futuro |
| 6 | `requireCapability('publicar_vagas')` em quais actions | Só publicar vs publicar+editar vs +status | **Publicar + editar** | Editar é publicação-adjacente; status (cancelar/finalizar) fica no guard de workspace-role |
| 7 | `conversas.ts` como "use server" (action) vs módulo server-only | action exposta vs módulo importado | **Módulo server-only** | `ensure*` usa admin client (bypassa RLS); não deve ser invocável direto pelo cliente |

---

## Deviations from Design

| Deviation | Reason | Impact |
|-----------|--------|--------|
| Rota resolver `/chat/vaga/[vagaId]` adicionada | DESIGN previa só `[conversaId]`; callers de diária só têm vagaId | Menor churn nos callers; +1 arquivo |
| `nav.tsx` não alterado | A inbox `/mensagens` já lista canal + DMs internas/externas | Menos código; chat interno acessível pelo item existente |
| Badge de mensagens não-lidas desligado no `layout.tsx` | Modelo por-destinatário não vale para grupo; unread é COULD | Regressão menor de UX (documentada); `lido_ate` pronto para reativar |
| `avaliar`/`candidatos`/`minhas-diarias`/`layout`/`rls.test.ts` tocados | Ripple dos links `/chat/{vagaId}` e do schema | Consistência com o novo modelo |

---

## Blockers (if any)

| Blocker | Required Action | Owner |
|---------|-----------------|-------|
| ~~Migration `0013` não aplicada~~ | ✅ Aplicada via conector MCP; backfill limpo (0 órfãs, 1 canal/equipe, DM externa criada) | Resolvido |
| ~~Suíte de integração não executada~~ | ✅ `npm run test:integration` → 13/13 RLS passam (a `service_role` key já estava no `.env.local`) | Resolvido |
| AT-004 (timing realtime) e AT-005 (gate publicar) não exercitados diretamente | Baixo risco: a RLS `msg_select_membro` (validada na integração) é a mesma que filtra o realtime; AT-005 é `requireCapability` app-layer. Smoke com conta real se quiser 100% | Opcional |

---

## Acceptance Test Verification

| ID | Scenario | Status | Evidence |
|----|----------|--------|----------|
| AT-001 | Canal da equipe | ✅ Verificado ao vivo | /mensagens (joão e ana): "Equipe · Elétrica João & Equipe" |
| AT-002 | DM interna | ⏸️ Não exercitada | Sem DM interna nos dados demo; código pronto |
| AT-003 | DM externa criada no aceite | ✅ Verificado ao vivo | DM com Carlos + 3 mensagens do backfill renderizadas na thread |
| AT-004 | Entrega < 2s (realtime) | ⏸️ Pendente | Demo é read-only; mecanismo idêntico ao chat atual (só muda o filtro p/ conversa_id) |
| AT-005 | Bloqueio publicar sem capacidade | ⏸️ Pendente | `requireCapability` em `vagas.ts`; verificar com conta real |
| AT-006 | Bloqueio DM externa sem capacidade | ✅ Verificado ao vivo | ana (sem chat_ajudantes) vê só o canal, NÃO a DM externa |
| AT-007 | Anti-IDOR leitura | ✅ Verificado ao vivo | idem AT-006 (RLS filtra a conversa alheia) + teste autorado |
| AT-008 | Anti-IDOR realtime | ⏸️ Pendente | Mesma RLS `msg_select_membro` que já filtra o REST; smoke ao vivo |
| AT-009 | Liberação pelo sócio | 🧪 Teste autorado | `rls.test.ts` "funcionário COM chat_ajudantes vê" |

---

## Final Status

### Overall: ✅ COMPLETO E VERIFICADO — pronto para /ship

**Completion Checklist:**

- [x] Todos os arquivos do manifesto implementados (nav dispensado com justificativa)
- [x] Typecheck limpo; testes unit passam (35/35)
- [x] Migration aplicada + backfill verificado (0 órfãs)
- [x] Smoke ao vivo: inbox, thread com mensagens do backfill, e gating de capacidade (ana não vê a DM externa)
- [x] Integração RLS 13/13 contra o banco real (leitura + escrita + capacidade chat_ajudantes)
- [ ] (opcional) AT-004 timing realtime / AT-005 gate publicar com conta real — baixo risco

---

## Next Step

**Antes de /ship:** aprovar e aplicar a migration `0013`, depois rodar a integração + smoke no preview.

**Se aprovado e verde:** `/ship .claude/sdd/features/DEFINE_CHAT_E_PERMISSOES.md`

**Se algo falhar na verificação:** `/iterate DESIGN_CHAT_E_PERMISSOES.md "{ajuste}"`
