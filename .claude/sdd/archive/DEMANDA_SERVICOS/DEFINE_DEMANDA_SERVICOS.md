# DEFINE: Painel de Demanda Reprimida

> Na busca de vaga sem resultado, 1 clique registra "procuro {categoria} em {cidade}"; o sysadmin vê a contagem por categoria+cidade num gráfico e liga/desliga um banner na home para recrutar.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | DEMANDA_SERVICOS |
| **Date** | 2026-08-07 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

Quando falta oferta de uma categoria de serviço numa cidade, essa demanda reprimida é invisível: o usuário que buscou e não achou nada não tem como sinalizar "procuro isto", e o sysadmin não tem como ver onde há gente precisando para recrutar profissionais ou divulgar.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Usuário logado (ajudante ou profissional) | `ajudante` / `admin` / `funcionario` | Buscou uma categoria sem oferta na cidade e não tem como dizer "procuro isto aqui" |
| Sysadmin | `sysadmin` | Não enxerga onde a demanda existe sem oferta, então não sabe onde recrutar nem o que divulgar |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | `demanda_servico` (categoria, cidade, user_id, created_at). Botão "avise que procura" no **empty-state da busca** (`card-vazio`), quando há categoria escolhida → 1 clique insere |
| **MUST** | Painel do sysadmin: contagem por **categoria + cidade** num **gráfico de barras server-rendered** (divs proporcionais, sem lib de chart) |
| **MUST** | `home_banner` (texto, ativo, updated_by) editável **só pelo sysadmin**; quando `ativo`, aparece na home (`/inicio`) para todos |
| **MUST** | RLS: qualquer autenticado **insere** demanda; **só sysadmin** lê o agregado e edita o banner; banner **ativo** é legível por todos |
| **SHOULD** | 1 demanda por (user, categoria, cidade) — a contagem reflete **usuários distintos interessados**, não cliques repetidos (anti-inflação) |
| **COULD** | Confirmação visual no botão após registrar ("avisaremos quando aparecer") |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] Na busca com categoria escolhida e **0 resultados**, 1 clique registra uma linha em `demanda_servico` (categoria + cidade + user_id) e o botão confirma.
- [ ] O sysadmin abre o painel e vê a contagem por **categoria + cidade** como barras proporcionais (maior demanda no topo).
- [ ] O sysadmin escreve um texto de banner e liga (`ativo=true`) → aparece na `/inicio` para todos; desliga (`ativo=false`) → some.
- [ ] Um usuário **não-sysadmin** não lê o agregado de `demanda_servico` nem edita o banner (negado pela RLS).
- [ ] Clicar 2× na mesma categoria+cidade **não** infla a contagem (conta 1 por usuário).

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Registrar demanda (happy) | Usuário logado em `/vagas?categoria=encanador&cidade=Recife` com 0 vagas | Clica "avise que procura" no empty-state | Insere `demanda_servico(categoria='encanador', cidade='Recife', user_id)`; botão vira estado "avisado" |
| AT-002 | Gráfico do sysadmin | Existem demandas em várias categorias/cidades | Sysadmin abre o painel de demanda | Contagem por categoria+cidade renderizada como barras proporcionais |
| AT-003 | Banner liga/desliga | Sysadmin no painel | Escreve texto e marca `ativo=true`; depois `ativo=false` | Com `ativo`, banner aparece na `/inicio` p/ todos; sem, não aparece |
| AT-004 | RLS — leitura do agregado | Usuário **não-sysadmin** autenticado | Tenta ler `demanda_servico` (agregado) ou abrir o painel | Negado (0 linhas / sem acesso ao painel) |
| AT-005 | Dedupe por usuário | Usuário já registrou `encanador`+`Recife` | Clica de novo na mesma categoria+cidade | Não cria 2ª linha; contagem permanece 1 para esse usuário |
| AT-006 | Só sysadmin edita banner | Usuário `admin` (não sysadmin) | Tenta gravar `home_banner` | Negado pela RLS |

---

## Out of Scope

- Banner **automático** por limite de pedidos (o sysadmin liga/desliga manualmente).
- Notificar profissionais da categoria demandada.
- Tendência temporal / série histórica no gráfico (contagem simples basta).
- Demanda em **texto livre** / NLP (só categoria estruturada).
- Tela/fluxo dedicado de "pedir serviço" — o sinal é **contextual** (só no empty-state da busca).
- Demanda sem cidade específica (busca em "todas as cidades" não gera sinal — sem cidade não há onde recrutar).

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | **Sem lib de gráfico** — barras server-rendered (divs proporcionais em CSS) | O app não tem recharts; Ponytail no visual |
| Technical | Categoria = mesma taxonomia da busca: slug de `lib/categorias` (coluna `vagas.categoria`), **não** uma tabela `categorias_servico` | O agregado casa com o filtro de busca; sem tabela nova de categorias |
| Technical | RLS: `authenticated` insere demanda; só `sysadmin` lê o agregado e escreve o banner; banner `ativo` world-readable | Molde de RLS por papel (`current_app_role()`, migration 0008) |
| Technical | `sysadmin` é papel distinto com painel próprio (`app/(app)/admin/*` já existe) | Nova página de painel sob o admin |
| Product/Locale | pt-BR; migration via conector MCP + `database.types.ts` à mão | Copy + tipos |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `supabase/migrations/*` (`demanda_servico` + `home_banner`); botão no empty-state de `app/(app)/vagas/page.tsx`; `lib/actions/demanda.ts` (registrar) + banner action; nova página `app/(app)/admin/demanda/page.tsx`; banner em `app/(app)/inicio`; `lib/supabase/database.types.ts` | Sinal contextual + agregação no painel + banner na home |
| **KB Domains** | `supabase` → `rls-policies` | Quem insere demanda / quem lê o agregado / quem edita o banner |
| **IaC Impact** | New resources | Tabelas `demanda_servico` (+ índice categoria,cidade; unique user+categoria+cidade) e `home_banner` |

**Why This Matters:**
- **Location** → Ancora o botão no `card-vazio` já existente e reusa o painel admin.
- **KB Domains** → 3 públicos distintos (insere / lê agregado / lê banner) = 3 regras de RLS.
- **IaC Impact** → 2 tabelas novas entram no plano da migration.

---

## Data Contract (if applicable)

N/A — sinal + agregação simples de contagem (SQL `count ... group by categoria, cidade`); não é pipeline de dados.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | A busca de vagas tem um empty-state por categoria+cidade onde ancorar o botão | Precisaria criar o ponto de captura | [x] Confirmado — `card-vazio` em `app/(app)/vagas/page.tsx:183` |
| A-002 | Categoria vem de `lib/categorias` (slug), igual a `vagas.categoria` — não de `categorias_servico` | Se a taxonomia divergir, o agregado não casa com a busca | [x] Confirmado — `vagas.page.tsx` filtra `.eq("categoria", categoria)` com slugs de `CATEGORIAS` |
| A-003 | `sysadmin` é papel distinto (via `current_app_role()`) com acesso ao painel admin | Se não houver o papel, mudar o gate do painel/RLS | [x] Confirmado — RBAC em `0008`; painel em `app/(app)/admin/*` |
| A-004 | 1 demanda por (user, categoria, cidade) via unique — contagem = usuários distintos | Se quiserem cliques brutos, remover o unique | [x] Confirmado pelo usuário (2026-08-07): dedupe |
| A-005 | Cidade da demanda = `cidadeAtiva` da busca (cidade do perfil por padrão, ou a escolhida); "todas" não gera demanda | Se quiserem demanda sem cidade, permitir cidade nula | [x] Alinhado ao Out of Scope (sem cidade não há sinal) |

**Note:** A-004 confirmada pelo usuário (2026-08-07): dedupe por (user, categoria, cidade).

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Demanda reprimida invisível; dono da dor (usuário sem oferta + sysadmin sem visão) e impacto claros |
| Users | 3 | Usuário logado + sysadmin, com dores distintas |
| Goals | 3 | MoSCoW derivado das 4 decisões validadas no brainstorm |
| Success | 3 | Critérios testáveis (1-clique insere, gráfico por cat+cidade, banner toggle, RLS, dedupe) |
| Scope | 3 | Out-of-scope explícito (automação, notificação, tendência, texto livre, tela dedicada) |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15**

---

## Open Questions

- ~~**Dedupe vs cliques brutos (A-004):**~~ **Resolvido (usuário, 2026-08-07): dedupe** por (user, categoria, cidade) via `unique`.
- ~~**Gatilho do botão:**~~ **Resolvido (usuário, 2026-08-07): o botão só aparece quando há categoria escolhida** no empty-state (feed vazio sem categoria não gera sinal).

Ambas viram ADR no /design. **Pronto para Design.**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-07 | define-agent | Versão inicial a partir de BRAINSTORM_DEMANDA_SERVICOS.md; correção da taxonomia (`lib/categorias`, não `categorias_servico`) após grounding no código |
| 1.1 | 2026-08-07 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_DEMANDA_SERVICOS.md`
