# DEFINE: Mapa de Vagas + Compartilhar Localização

> Mapa de vagas por proximidade (Leaflet/OSM) com localização aproximada até a contratação, pino exato só para o ajudante contratado e a equipe dona, e botão de compartilhar localização one-shot.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MAPA_VAGAS |
| **Date** | 2026-08-05 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

Ajudantes não conseguem achar diárias por proximidade e sócios não têm como ver/compartilhar o local das vagas — e expor o endereço exato da obra a qualquer ajudante que navega o app é um risco de segurança para o cliente. Falta um mapa que mostre as vagas por perto de forma **aproximada** e revele o ponto exato só a quem foi contratado.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Ajudante | `ajudante` | Achar diárias perto de onde está e sinalizar que está a caminho da obra |
| Sócio | `admin` | Ver as vagas da equipe no mapa e mandar o local exato da obra para o ajudante contratado |
| Funcionário | `funcionario` | Usar o mapa / compartilhar localização em nome da equipe, quando o módulo estiver liberado |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Vaga ganha `local_lat`/`local_lng`; `AddressMapPicker` no formulário de publicar (geocode marca o pino, sócio arrasta pra ajustar), com fallback de geocode de bairro/cidade |
| **MUST** | Mapa de descoberta (ajudante): vagas abertas por proximidade com **coordenada aproximada vinda do servidor** |
| **MUST** | Pino **exato** só para o ajudante **contratado** + a equipe dona — o exato **nunca sai do servidor** para não-contratado (anti-IDOR) |
| **MUST** | Compartilhar localização **one-shot** (reusa `maps-share`/`navigator.share`): ajudante "estou a caminho"; sócio manda o local da obra |
| **MUST** | Stack **Leaflet/OSM** portada do CareConnect — sem API key, sem custo |
| **SHOULD** | Mapa da equipe (sócio): as vagas da própria equipe com pino exato |
| **SHOULD** | Acesso do funcionário ao mapa gated por módulo `mapa` (`user_modules`); sócio sempre; ajudante tem a descoberta na superfície dele |
| **COULD** | Ordenar/filtrar vagas do mapa por distância aproximada |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] Ao publicar com o pino fixado, a vaga guarda `local_lat`/`local_lng`; sem pino, o geocode de bairro/cidade preenche uma coordenada aproximada.
- [ ] O mapa de descoberta mostra vagas **abertas** por proximidade com precisão ~bairro (aproximada).
- [ ] **0** vazamentos da coordenada exata para ajudante não-contratado (verificado no payload da API/URL direta).
- [ ] Ajudante **contratado** e a equipe dona veem o **pino exato** da obra.
- [ ] O botão "compartilhar localização" abre o share do SO / gera o link do pin (one-shot), no celular.
- [ ] Funcionário **sem** o módulo `mapa` não acessa a tela do mapa; **com** o módulo, acessa. Sócio sempre acessa.

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Captura de coordenada (happy) | Sócio publicando uma vaga | Digita o endereço, geocoda e arrasta o pino | A vaga guarda `local_lat`/`local_lng` do ponto fixado |
| AT-002 | Fallback sem pino | Sócio publica sem tocar no mapa | Salva a vaga | O geocode de bairro/cidade preenche uma coordenada aproximada |
| AT-003 | Descoberta aproximada | Ajudante **não** contratado | Abre o mapa de descoberta | Vê a vaga numa localização **aproximada**, sem o endereço/pino exato |
| AT-004 | Exato para contratado | Ajudante **contratado** naquela vaga | Abre a vaga | Vê o **pino exato** da obra |
| AT-005 | Anti-IDOR da coordenada | Ajudante não-contratado | Pede a coordenada da vaga direto (API/URL) | Recebe só a aproximada — o exato nunca é entregue |
| AT-006 | "Estou a caminho" | Ajudante contratado, a caminho | Toca em compartilhar localização | O share do SO abre com a localização atual (pin/link) |
| AT-007 | Sócio manda o local da obra | Sócio com um ajudante contratado | Compartilha o local da vaga | O ajudante recebe o link/pin exato da obra |
| AT-008 | Gating por módulo | Funcionário sem o módulo `mapa` | Tenta acessar a tela do mapa | É bloqueado/redirecionado; com `mapa` liberado, acessa |

---

## Out of Scope

- Rastreamento de localização **ao vivo** (posição do ajudante atualizando sozinha no mapa) — one-shot no MVP.
- Rotas/navegação **dentro** do app — delega pro Google/Waze via link.
- Clustering de pinos, filtros avançados no mapa, geofencing/check-in automático por chegada, histórico de localização.
- Provedor de mapa pago (Google/Mapbox) — OSM/Leaflet basta.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | Nova dependência de front: `leaflet` + `react-leaflet` (OSM, sem chave) | Portar a stack do CareConnect; sem custo de API |
| Technical | Geocoding via Nominatim/OSM tem rate-limit e exige User-Agent | Reusar a action `geocode` do CareConnect que respeita a política |
| Technical | Aproximação da coordenada **obrigatoriamente no servidor** | O exato nunca é enviado a cliente não autorizado (RLS/server action) |
| Technical | Migration via conector MCP; `database.types.ts` mantido à mão | Colunas novas em `vagas`; atualizar tipos após DDL |
| Product/Locale | pt-BR; termo de UI "equipe" | Copy e rótulos |
| Resource | Sem serviço externo pago | Tudo em OSM/Supabase |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | Novo `app/(app)/mapa` (ou visão de mapa em `/vagas`); `AddressMapPicker` em `components/publicar-form.tsx`; `components/maps/*`; `lib/maps-share.ts`; `lib/actions/geocode.ts`; migration + `database.types.ts` | Portar do CareConnect e adaptar às vagas |
| **KB Domains** | `supabase` → `rls-policies`, `multi-tenant-rls` | Coordenada exata é campo protegido; servidor decide quem recebe |
| **IaC Impact** | New resources | Colunas `local_lat`/`local_lng` em `vagas`; nova dep `leaflet`/`react-leaflet`; possível módulo `mapa` em `user_modules`/`PANEL_MODULES` |

**Why This Matters:**
- **Location** → Reaproveita a stack de mapa pronta do CareConnect em vez de recriar.
- **KB Domains** → Design puxa os padrões de RLS para a regra exato-vs-aproximado.
- **IaC Impact** → Migration + nova dependência + tipos à mão entram no plano.

---

## Data Contract (if applicable)

N/A — feature de produto (mapa + geolocalização), sem pipelines/ETL/analytics.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | Geocoding Nominatim/OSM é suficiente e dentro da política de uso para o volume do protótipo | Precisaria de provedor pago (Google/Mapbox) — muda a stack e adiciona custo/chave | [ ] |
| A-002 | Aproximar por arredondamento / centroide de bairro esconde o exato sem quebrar o "perto de mim" | Fórmula de aproximação precisa de ajuste (raio/precisão) | [ ] |
| A-003 | "Contratado" = candidatura com status `aceito` (mesma relação usada no chat) | Regra exato-vs-aproximado muda se a granularidade for outra | [ ] |
| A-004 | `mapa` como módulo de painel (`getAllowedModules`) cobre a liberação por funcionário | Se precisar granularidade "ver vs compartilhar", usar o esquema de capacidade de CHAT_E_PERMISSOES | [ ] |
| A-005 | Leaflet roda em client component no Next 15/PWA (CareConnect usa `dynamic` com `ssr:false`) | Se a hidratação quebrar, envolver em `dynamic import` sem SSR | [ ] |

**Note:** Validar A-001 e A-002 no /design — definem a viabilidade e a fórmula de privacidade.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Dor clara (descoberta por proximidade + compartilhar) com o risco de segurança explícito |
| Users | 3 | Três personas com papel e dor |
| Goals | 3 | MoSCoW derivado das decisões validadas no brainstorm |
| Success | 3 | Critérios testáveis (0 vazamentos, precisão ~bairro, gating) |
| Scope | 3 | Fora-de-escopo explícito (YAGNI + provedor pago) |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15**

---

## Open Questions

- **Fórmula da aproximação:** arredondar N casas decimais vs centroide do bairro geocodado — o /design decide (afeta o quanto o exato fica escondido).
- **Superfície do mapa de descoberta:** tela nova `/mapa` ou uma aba/visão em `/vagas` — decisão de /design, baixa importância.

Fora isso: **pronto para Design.**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | define-agent | Versão inicial a partir de BRAINSTORM_MAPA_VAGAS.md |
| 1.1 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_MAPA_VAGAS.md`
