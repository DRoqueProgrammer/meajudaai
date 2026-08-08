# BRAINSTORM: Painel de Demanda Reprimida

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | DEMANDA_SERVICOS |
| **Date** | 2026-08-05 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Quando um usuário procura um serviço e não há oferta (ex: encanador), ele clica que "precisa de X". Isso alimenta um gráfico de demanda por serviço para o sysadmin, que com o tempo pode divulgar na home ("avise seu amigo encanador que aqui tem gente precisando").

**Context Gathered:**
- `categorias_servico` já lista os serviços (`ajudante_eletricista`, `ajudante_encanador`, etc.) — a demanda é por uma dessas categorias.
- Vagas têm `cidade`; o app é orientado por cidade — a demanda ganha valor com a dimensão **categoria + cidade**.
- Não há lib de gráfico no app (CareConnect usa recharts; o app não). `notificacoes` e o painel de sysadmin (`app/(app)/admin/*`) existem. Home = `/inicio`.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | Botão na busca de vagas (`app/(app)/vagas`), painel `app/(app)/admin/*`, home `app/(app)/inicio`, `supabase/migrations/*` | Sinal contextual + agregação no sysadmin + banner na home |
| Relevant KB Domains | `supabase` → `rls-policies` | Quem insere demanda / quem lê o agregado |
| IaC Patterns | Migration: `demanda_servico` + `home_banner`; `database.types.ts` à mão | Sem lib de chart — barras server-rendered |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | De onde parte o sinal "preciso de X"? | **(a) Contextual** — na busca sem resultado, 1 clique registra categoria + cidade | Sinal de alta qualidade; sem tela nova de pedido |
| 2 | Como sai a informação para o sysadmin? | **(a)** Gráfico (categoria + cidade) **+ banner na home manual** (sysadmin escreve e liga/desliga) | Sysadmin decide o quê/quando divulgar; sem automação por limite |

**Minimum Questions:** 3 → 2 perguntas + grounding (`categorias_servico`, painel sysadmin).

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Related code (reuso) | `categorias_servico`, `app/(app)/vagas`, `app/(app)/admin/*`, `app/(app)/inicio` | 4 | Categorias + busca + painel + home |
| Referência de padrão | `refs/careconnect/components/charts/*` | 1 | Molde visual de gráfico (não a lib) |

**How samples will be used:**
- Categoria da demanda vem de `categorias_servico`.
- Gráfico segue o visual do CareConnect, mas server-rendered (sem dependência nova).

---

## Approaches Explored

### Approach A: Sinal contextual + agregação + banner manual ⭐ Recommended

**Description:**
- `demanda_servico` (categoria, cidade, user_id, created_at). Botão "avise que procura" aparece na **busca vazia** (categoria/cidade sem vaga) → 1 clique insere.
- Painel do sysadmin: contagem por **categoria + cidade** num **gráfico de barras server-rendered** (divs proporcionais) — sem lib.
- `home_banner` (texto, ativo, updated_by) editável só pelo sysadmin; quando ativo, aparece na home para todos.

**Pros:**
- Sinal capturado no momento da falta; agrega limpo por categoria estruturada.
- Zero dependência nova (barras em CSS); banner manual é simples e seguro.

**Cons:**
- Botão precisa aparecer nos pontos de busca vazia (vagas por categoria/cidade).

**Why Recommended:** KB `rls-policies` + reuso de `categorias_servico`; Ponytail no gráfico (sem recharts). Atende "sysadmin pode divulgar" com banner discricionário.

### Approach B: Demanda em texto livre + NLP

**Description:** Campo aberto "o que falta?" e clusterização depois.

**Pros / Cons:** Captura qualquer pedido · exige NLP/limpeza e não agrega limpo.

**Why not recommended:** Categoria estruturada (`categorias_servico`) já cobre o caso e agrega direto no gráfico.

---

## Data Engineering Context (if applicable)

N/A — sinal + agregação simples de contagem; não é pipeline de dados.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-08-05 — "pode fechar" |
| **Reasoning** | Sinal contextual limpo; gráfico sem dependência; banner manual |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Sinal contextual na busca vazia (1 clique) | Captura a falta no momento; sem tela nova | Botão/tela dedicada |
| 2 | Demanda por categoria (`categorias_servico`) + cidade | Agrega limpo; casa com o app city-centric | Texto livre |
| 3 | Gráfico de barras server-rendered | Evita nova dependência (Ponytail) | Portar recharts |
| 4 | Banner na home manual (sysadmin liga/desliga) | "Sysadmin pode divulgar" = discricionário | Banner automático por limite |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Banner automático por limite de pedidos | Sysadmin decide manualmente | Yes |
| Notificar profissionais da categoria demandada | Fora do núcleo | Yes |
| Tendência temporal no gráfico | Contagem simples basta | Yes |
| Demanda em texto livre / NLP | Categoria estruturada resolve | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Fonte do sinal (contextual) | ✅ | (a) | No |
| Saída do sysadmin (gráfico + banner manual) | ✅ | (a) | No |
| Abordagem A | ✅ | "pode fechar" | No |

**Minimum Validations:** 2 → atingido (3).

---

## Suggested Requirements for /define

### Problem Statement (Draft)
Quando falta oferta de uma categoria de serviço numa cidade, essa demanda reprimida hoje é invisível — não há como o usuário sinalizar "procuro X" nem como o sysadmin ver onde recrutar profissionais.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Usuário (ajudante/profissional) | Sinalizar que procura uma categoria sem oferta |
| Sysadmin | Ver onde há demanda reprimida e divulgar para recrutar |

### Success Criteria (Draft)
- [ ] Na busca sem resultado, 1 clique registra demanda (categoria + cidade).
- [ ] Sysadmin vê a contagem por categoria + cidade num gráfico.
- [ ] Sysadmin edita e liga/desliga um banner que aparece na home.

### Constraints Identified
- Sem lib de gráfico (barras server-rendered); pt-BR; migration via MCP.
- RLS: qualquer autenticado registra demanda; só sysadmin lê o agregado e edita o banner.

### Out of Scope (Confirmed)
- Itens YAGNI acima (automação, notificação, tendência, texto livre).

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 2 (+ grounding) |
| Approaches Explored | 2 |
| Features Removed (YAGNI) | 4 |
| Validations Completed | 3 |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_DEMANDA_SERVICOS.md`
