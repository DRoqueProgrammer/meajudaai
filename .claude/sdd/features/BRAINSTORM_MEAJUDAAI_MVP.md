# BRAINSTORM: MeAjuda Aí — Protótipo MVP

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MEAJUDAAI_MVP |
| **Date** | 2026-07-23 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Protótipo do **MeAjuda Aí** — marketplace que conecta profissionais autônomos da construção civil e manutenção (eletricista, pedreiro, pintor, encanador…) com ajudantes disponíveis para trabalho por diária. Três papéis: Profissional (publica vagas, seleciona e avalia ajudantes), Ajudante (vê e se candidata, avalia profissionais) e Administrador (modera). Construir como web responsivo/PWA reaproveitando três codebases de referência.

**Context Gathered:**
- Spec completa em `ESPECIFICACOES_MeAjudaAi.md` (20 telas, 7 coleções, regras de segurança).
- Identidade visual definida em `REFERENCIA_VISUAL_MeAjudaAi.md` + `design/MeAjudaAi_styleguide.html` (azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, Poppins; mockup mobile com 10 telas a adaptar para web).
- Três repos-referência analisados (grafo em `refs/<repo>/.ua/knowledge-graph.json`): `petvarejo` (varejo/PDV multi-tenant+RBAC), `careconnect` (home-care: PII separada, escala, avaliações, equipe), `foco-contabil` (SaaS contábil, CRM, notificações, cron/webhooks, testes). Os três: Next.js (App Router) + Supabase + TS + Tailwind, arquitetura em camadas idêntica.
- KB `supabase` disponível com padrões de alta confiança: `rls-policies` (0.95), `multi-tenant-rls` (0.95), `realtime` (0.95), `edge-functions`, `webhook-edge-function`.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | `app/` (rotas + server actions), `components/`, `lib/` (domínio), `supabase/migrations/` (SQL) | Espelhar a estrutura em camadas das 3 refs |
| Relevant KB Domains | `supabase` (rls-policies, multi-tenant-rls, realtime, edge-functions), `data-modeling` (normalization, schema-evolution), `testing` (pytest→Vitest análogo) | Consultar na fase Design |
| IaC Patterns | Supabase gerenciado + deploy Vercel (como as refs) | Sem IaC próprio no protótipo |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Stack: reaproveitar refs (Next+Supabase) ou spec original (FlutterFlow+Firebase)? | **Next.js + Supabase** (web/PWA) | Reaproveita arquitetura, RLS, migrations e utilitários das 3 refs |
| 2 | Corte de MVP (9–10 telas do fluxo central) aprovado? | **Aprovado** | Foco no loop publicar→candidatar→aceitar→avaliar |
| 3 | Modelo de acesso: multi-tenant ou papéis simples? | **Multi-tenant por empresa** | Workspaces + RLS por tenant em todo o schema |
| 4 | O que "empresa/tenant" representa? | **Profissional = empresa com equipe** | Profissional é um workspace que pode ter funcionários/equipe |
| 5 | Método de login primário? | **Ambos** (telefone/OTP + e-mail/senha) | Supabase Auth com dois provedores; unicidade CPF/telefone/email |
| 6 | Como o ajudante encontra vagas próximas? | **Filtro por cidade/bairro** | Sem PostGIS; filtro texto + chips (como tela 7 do mockup) |
| 7 | Contato entre as partes no MVP? | **Chat in-app (Supabase Realtime)** | Entra a tela de Chat + tabela `mensagens` no MVP |
| 8 | Notificações no MVP? | **In-app + Realtime** | Tabela `notificacoes` + badge/toast; sem push/FCM |
| 9 | Monetização no MVP? | **Fora** | Premium/destaque/anúncios adiados |

**Minimum Questions:** 3 ✅ (9 registradas)

---

## Sample Data Inventory

> Samples improve LLM accuracy through in-context learning and few-shot prompting.

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Related code | `refs/petvarejo`, `refs/careconnect`, `refs/foco-contabil` | 3 repos | Padrões prontos: `lib/supabase/*`, `lib/actions`, `lib/auth`, migrations RLS, `workspaces`/`user_*_roles`, `profissional_feedback`, `ibge.ts`, `money.ts`/`phone.ts`/`masks` |
| Output examples (UI) | Mockup mobile (10 telas) + `design/MeAjudaAi_styleguide.html` | 10 telas | Ground truth visual: cores, Poppins, cards de vaga/pessoa, estrelas, selo verificado |
| Ground truth (regras) | `ESPECIFICACOES_MeAjudaAi.md` | 1 doc | Campos das entidades, status, regras de segurança |
| Dados de exemplo (vagas/serviços/cidades) | Não fornecidos | 0 | A coletar na fase Define (tipos de serviço, cidades-alvo, faixa de valor) |

**How samples will be used:**

- Reuso direto de módulos e migrations das 3 refs como andaime do protótipo.
- Mockup + style guide como referência de implementação de UI (tokens Tailwind já definidos).
- Spec como fonte das entidades, campos e status.

---

## Approaches Explored

### Approach A: Next.js + Supabase espelhando as refs ⭐ Recommended

**Description:** Web responsivo/PWA em Next.js (App Router) + Supabase (Postgres + Auth + Storage + Realtime) + TypeScript + Tailwind, copiando a arquitetura em camadas e os módulos das três refs. Multi-tenant (workspaces) + RBAC via RLS.

**Pros:**
- Máximo reuso: `lib/supabase/*`, `lib/actions`, `lib/auth`, migrations RLS, padrão de workspaces/equipe e avaliações já prontos para copiar.
- Alta confiança (KB `supabase` 0.95 + match nos 3 codebases → 0.95).
- Realtime nativo para chat e notificações; Storage para fotos de perfil/vaga.

**Cons:**
- Web/PWA, não app nativo (a spec original pedia mobile nativo).
- Multi-tenant + chat adicionam escopo vs. um protótipo mínimo.

**Why Recommended:** As três refs existem justamente para serem reaproveitadas e são idênticas em stack; a KB `supabase` reforça cada peça (RLS, multi-tenant, realtime). Caminho de maior alavancagem e menor risco.

---

### Approach B: FlutterFlow + Firebase (spec original)

**Description:** App mobile nativo Android/iOS conforme a especificação original.

**Pros:**
- Mobile nativo desde o início; FCM para push.

**Cons:**
- Zero reuso das três refs (stack diferente) — recomeço do domínio.
- Firestore (NoSQL) x regras relacionais/RLS que o produto pede (unicidade, papéis, moderação).

**Why not recommended:** Descarta o ativo principal (as refs) e o alinhamento com a KB `supabase`.

---

### Approach C: Stack web genérica do zero

**Description:** Web em Next.js porém sem espelhar as refs (bibliotecas/estrutura próprias).

**Pros:**
- Liberdade de arquitetura.

**Cons:**
- Perde o andaime pronto; reintroduz decisões já resolvidas nas refs.

**Why not recommended:** Custo sem benefício frente ao Approach A.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-07-23 (via formulário de decisões + esclarecimento de tenancy) |
| **Reasoning** | Reuso das 3 refs + KB `supabase`; web/PWA responsivo com identidade visual já definida |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Stack Next.js + Supabase (web/PWA) | Reuso das refs + KB supabase | FlutterFlow + Firebase |
| 2 | Multi-tenant: profissional = empresa com equipe | Escolha do usuário; padrão `workspaces`/`user_workspace_roles` (foco, petvarejo) + equipe (careconnect) | RBAC simples sem workspaces |
| 3 | Ajudante como participante global do marketplace | Candidata-se a vagas de qualquer workspace | Ajudante preso a um tenant |
| 4 | Login por telefone (OTP) **e** e-mail/senha | Cobre "validação SMS" da spec + fluxo clássico | Só telefone |
| 5 | PII separada (`profiles` + `profiles_pii`) | LGPD; padrão `paciente_pii` (careconnect) | CPF/telefone na tabela principal |
| 6 | Matching por cidade/bairro | Simplicidade; `ibge.ts` + chips (tela 7) | Raio geográfico (PostGIS) |
| 7 | Chat in-app via Supabase Realtime | Escolha do usuário; KB `realtime` 0.95 | Liberar WhatsApp após aceite |
| 8 | Notificações in-app + Realtime | Sem push no protótipo | Web Push/FCM |
| 9 | Avaliação 1–5 ⭐ + média automática | Padrão `profissional_feedback` (careconnect) | — |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Push/FCM | Realtime in-app cobre o MVP | Yes |
| Raio geográfico (PostGIS) | Filtro cidade/bairro basta para validar | Yes |
| Denúncias / moderação | Fora do loop central publicar→avaliar | Yes |
| Painel administrativo completo | Admin mínimo basta no protótipo | Yes |
| Configurações, Termos, Política (como features) | Páginas estáticas; não são fluxo | Yes |
| Recuperação de senha customizada | Nativo do Supabase Auth | Yes |
| Monetização (Premium, destaque, anúncios, parcerias) | Não valida o conceito | Yes |
| Gestão de equipe avançada | MVP só com convidar membro; gestão rica depois | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Modelo de dados & acesso | ✅ | Escolheu multi-tenant com equipe (vs. RBAC simples que eu sugeri) e chat in-app | Yes — schema com workspaces/equipe + tabela mensagens |
| Telas & fluxo do MVP | ✅ | Confirmado (10 telas + Equipe enxuta) | No |

**Minimum Validations:** 2 ✅

---

## Suggested Requirements for /define

### Problem Statement (Draft)
Conectar, de forma rápida e segura, profissionais autônomos da construção/manutenção que precisam de ajudantes por diária com ajudantes disponíveis na mesma região, cobrindo o ciclo publicar vaga → candidatar → aceitar → conversar → avaliar.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Profissional (dono de workspace, com equipe opcional) | Precisa de ajudante confiável para uma diária, rápido e perto da obra |
| Ajudante | Precisa encontrar diárias na sua região e construir reputação |
| Administrador | Precisa moderar usuários/vagas e manter a confiança da plataforma |

### Success Criteria (Draft)
- [ ] Profissional publica uma vaga de diária em < 1 min.
- [ ] Ajudante encontra vagas filtrando por cidade/bairro e se candidata.
- [ ] Profissional vê candidatos, aceita um e abre chat in-app.
- [ ] Após a diária, ambos se avaliam (1–5 ⭐) e a média atualiza no perfil.
- [ ] CPF/telefone/e-mail únicos; PII protegida por RLS.
- [ ] Multi-tenant: dados de cada workspace isolados por RLS.

### Constraints Identified
- Português (BR) em todo o produto.
- LGPD: dados sensíveis (CPF, telefone) em tabela PII separada com RLS estrita.
- Identidade visual fixa (tokens em `REFERENCIA_VISUAL_MeAjudaAi.md`, Poppins).
- Protótipo (não produção) — caminho mais curto para o fluxo central.
- Espelhar estrutura/módulos das 3 refs em `refs/`.

### Out of Scope (Confirmed)
- Push/FCM, PostGIS/raio, denúncias, painel admin completo, configurações, termos/política como features, monetização, gestão de equipe avançada.

---

## KB Domains for Define
`supabase` (rls-policies, multi-tenant-rls, realtime, edge-functions, webhook-edge-function), `data-modeling` (normalization, schema-evolution), `testing`.

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 9 (+1 esclarecimento de tenancy) |
| Approaches Explored | 3 |
| Features Removed (YAGNI) | 8 |
| Validations Completed | 2 |
| Duration | ~1 sessão |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_MEAJUDAAI_MVP.md`
