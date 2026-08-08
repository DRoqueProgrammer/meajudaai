# BUILD REPORT: Painel de Demanda Reprimida

> Implementation report for DEMANDA_SERVICOS

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | DEMANDA_SERVICOS |
| **Date** | 2026-08-07 |
| **Author** | build-agent (execução direta) |
| **DEFINE** | [DEFINE_DEMANDA_SERVICOS.md](../features/DEFINE_DEMANDA_SERVICOS.md) |
| **DESIGN** | [DESIGN_DEMANDA_SERVICOS.md](../features/DESIGN_DEMANDA_SERVICOS.md) |
| **Status** | ✅ Shipped |

---

## Summary

| Metric | Value |
|--------|-------|
| **Files Created** | 7 | **Modified** | 5 |
| **Lines of Code** | ~330 |
| **Tests Passing** | 70/70 (48 unit incl. 4 novos de `agregarDemanda` + 22 RLS incl. 4 novos de demanda/banner) |
| **Nova dependência** | Nenhuma (barras em CSS) |
| **Agents Used** | 0 (execução direta) |

---

## Task Execution with Agent Attribution

| # | Task | Agent | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Migration `0017` (demanda_servico + home_banner + RLS) | (direct) | ✅ Aplicada | Aditiva; RLS com policies |
| 2 | `lib/demanda-agregada.ts` (`agregarDemanda`) | (direct) | ✅ | função pura |
| 3 | `lib/actions/demanda.ts` (registrar + banner) | (direct) | ✅ | upsert dedupe + guard sysadmin |
| 4 | `components/avisar-demanda.tsx` | (direct) | ✅ | botão do empty-state |
| 5 | `components/banner-form.tsx` | (direct) | ✅ | editor client |
| 6 | `app/(app)/admin/demanda/page.tsx` | (direct) | ✅ | painel: barras + form |
| 7 | `app/(app)/vagas/page.tsx` | (direct) | ✅ | botão no card-vazio + pré-check |
| 8 | `app/(app)/inicio/page.tsx` | (direct) | ✅ | banner ativo no topo |
| 9 | `components/nav.tsx` | (direct) | ✅ | link /admin/demanda (reusou ícone `chart` existente) |
| 10 | `lib/supabase/database.types.ts` | (direct) | ✅ | tipos das 2 tabelas |
| 11 | `tests/demanda-agregada.test.ts` | (direct) | ✅ | +4 unit |
| 12 | `tests/rls.test.ts` | (direct) | ✅ | +sysadmin D, +4 integração |

---

## Verification Results

### Type Check
```text
> tsc --noEmit
(sem erros — após remover ícone `chart` duplicado no nav)
```
**Status:** ✅ Pass

### Tests
```text
> vitest run                 # unit → 48 (incl. 4 de agregarDemanda)
> npm run test:integration   # RLS real → 22 (incl.):
    ✓ usuário só lê a própria demanda, não a de outro
    ✓ demanda é deduplicada por (user, categoria, cidade)
    ✓ não-sysadmin NÃO edita o banner da home
    ✓ sysadmin lê toda a demanda e edita o banner
Tests  70 passed (70)
```
**Status:** ✅ 70/70 Pass

### Live Smoke (preview)
```text
/inicio            → banner ativo renderiza no topo ("Falta encanador em Recife…")
/vagas?categoria=ajudante_gesseiro&cidade=Recife → empty-state mostra o botão
                     "Avise que você procura ajudante de gesseiro em Recife"
/admin/demanda (ajudante) → redirect (guard sysadmin), sem painel
console: 0 erros
```
**Status:** ✅ Banner + botão + guard confirmados ao vivo

### Migration / Advisors
```text
0017 aplicada · demanda_servico + home_banner (RLS on, COM policies)
Advisors (security): nenhum item novo referencia as 2 tabelas novas.
Restantes são pré-existentes (helpers SECURITY DEFINER, citext, INFO do invite, auth config).
```
**Status:** ✅ Pass (zero regressão)

---

## Autonomous Decisions

| # | Decision Point | Options | Chose | Rationale |
|---|----------------|---------|-------|-----------|
| 1 | Delegar vs direto | Task vs direto | Direto | App acoplado às convenções do repo; padrão das features anteriores |
| 2 | Ícone do link "Demanda" | adicionar SVG novo vs reusar | **Reusar `chart` existente** | Já havia `chart` no `NAV_ICONS` (eixo+barras) — meu SVG novo era duplicado e quebrou o typecheck; removido (Ponytail rung 2) |
| 3 | Classes do gráfico/form | `.input`/`btn-primary`/`bg-line/40` vs explícitas | Explícitas (`bg-black/5`, `border-line`, `bg-brand`) | Evita apostar em utilitário não confirmado; classes garantidas |
| 4 | Teste do sysadmin (positivo) | só negativos vs +positivo | +usuário sysadmin D | Prova o god-mode de leitura do agregado e escrita do banner no banco real — passou (auth hook está registrado) |
| 5 | Aplicar migration no build | gate vs aplicar | Aplicar | Aditiva/reversível; build pedido |

---

## Deviations from Design

| Deviation | Reason | Impact |
|-----------|--------|--------|
| Ícone `chart` reusado (não criado) | Já existia no `NAV_ICONS` | Nenhum — mesmo nome de ícone, sem SVG novo |
| Track da barra `bg-black/5` (design sugeria `bg-line/40`) | Opacidade sobre cor custom podia não existir no config | Visual equivalente, sem risco |
| Form usa classes explícitas (não `.input`/`btn-primary`) | Utilitários não confirmados no projeto | Visual consistente com tokens existentes |

---

## Acceptance Test Verification

| ID | Scenario | Status | Evidence |
|----|----------|--------|----------|
| AT-001 | Registrar demanda | ✅ | `registrarDemandaAction` + integração (insert) + smoke (botão renderiza) |
| AT-002 | Gráfico por categoria+cidade | ✅ | unit `agregarDemanda` (4 casos) + leitura do agregado provada na integração |
| AT-003 | Banner liga/desliga | ✅ | `salvarBannerAction` + smoke (`/inicio` mostra ativo) + integração (sysadmin escreve) |
| AT-004 | Não-sysadmin não lê agregado | ✅ integração | "usuário só lê a própria demanda, não a de outro" |
| AT-005 | Dedupe por usuário | ✅ | integração "demanda deduplicada" + unit (conta linhas) |
| AT-006 | Só sysadmin edita banner | ✅ integração | "não-sysadmin NÃO edita" + "sysadmin … edita" |

---

## Final Status

### Overall: ✅ COMPLETO E VERIFICADO — pronto para /ship

- [x] Manifesto implementado (12 arquivos)
- [x] Typecheck limpo; 70/70 testes (4 unit de `agregarDemanda` + 4 RLS de demanda/banner no banco real)
- [x] Migration aplicada; advisors sem item novo (as 2 tabelas têm policies)
- [x] Smoke ao vivo: banner na home + botão no empty-state + guard do painel; 0 erros
- [x] Caminho positivo do sysadmin (lê agregado + escreve banner) provado na integração

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_DEMANDA_SERVICOS.md`
