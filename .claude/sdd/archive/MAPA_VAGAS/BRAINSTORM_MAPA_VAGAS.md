# BRAINSTORM: Mapa de Vagas + Compartilhar Localização

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MAPA_VAGAS |
| **Date** | 2026-08-05 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Mapa marcando as vagas disponíveis, marcador de localização e um botão para compartilhar localização — disponível para sócios (e para a equipe se o módulo estiver liberado) e para os ajudantes contratados (para mostrar que estão chegando ao local).

**Context Gathered:**
- A vaga hoje guarda **só endereço textual** (`cidade`, `bairro`, `cep`) — **sem lat/lng** (visto em `lib/actions/vagas.ts#publicarVagaAction`). Precisa ganhar coordenadas para ir ao mapa.
- O **careconnect tem a stack de mapa pronta**: `components/maps/address-map-picker.tsx` (react-leaflet + Leaflet 1.9 sobre OpenStreetMap, **sem API key**), `components/map/people-map-client.tsx` (multi-pino), `lib/maps-share.ts` (Google/Waze/`geo:`/`navigator.share`), a action `geocodeAddress` (`lib/actions/geocode.ts`) e a migration `0014_empresa_geo.sql` (lat/lng como `double precision`).
- O `AddressMapPicker` **já implementa** o botão "Colocar local atual" via `navigator.geolocation` e os botões de compartilhar — ou seja, a primitiva de "compartilhar localização" já existe no molde.
- MeAjuda Aí é PWA responsivo; Leaflet funciona bem. A liberação por funcionário usa `user_modules` (mesmo mecanismo da feature CHAT_E_PERMISSOES).

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | Novo `app/(app)/mapa` (ou visão de mapa em `/vagas`); `AddressMapPicker` em `components/publicar-form.tsx`; `components/maps/*`, `lib/maps-share.ts`, `lib/actions/geocode.ts`; migration + `database.types.ts` | Portar do careconnect e adaptar, não criar do zero |
| Relevant KB Domains | `supabase` → `rls-policies` (0.95), `multi-tenant-rls` (0.95) | Coordenada exata é campo protegido; RLS/servidor decide quem recebe |
| IaC / Dependências | Migration numerada (colunas na `vagas`); nova dep `leaflet` + `react-leaflet`; geocoding via Nominatim/OSM (política de uso: rate-limit + User-Agent) | Reusar a action `geocode` do careconnect que já respeita isso |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | "Estou chegando" do ajudante: one-shot, ao vivo, ou one-shot agora? | **(c)** One-shot agora, ao vivo depois | Reusa o share do careconnect; sem realtime de GPS no MVP |
| 2 | Mapa de "vagas disponíveis" é pra quem? | **(c) Os dois** — ajudante descobre por perto; sócio vê as da equipe | Duas visões: descoberta (ajudante) e equipe (sócio) |
| 3 | Ajudante não-contratado vê endereço exato? | **(a)** Aproximado até contratar; exato só pro contratado | Aproximação **no servidor**; exato é campo protegido (anti-IDOR) |
| 4 | Referência/samples? | careconnect (map stack completa) | Port quase direto; sample inventory abaixo |

**Minimum Questions:** 3 → atingido (4).

---

## Sample Data Inventory

> Samples improve LLM accuracy through in-context learning and few-shot prompting.

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Input files | N/A | — | Feature de produto |
| Output examples | N/A | — | — |
| Ground truth | N/A | — | — |
| Related code (reuso) | `refs/careconnect/components/maps/address-map-picker.tsx`, `refs/careconnect/components/map/people-map-client.tsx`, `refs/careconnect/lib/maps-share.ts`, `refs/careconnect/lib/actions/geocode.ts`, `refs/careconnect/supabase/migrations/0014_empresa_geo.sql` | 5 | Stack de mapa a portar |
| Alvo no MeAjuda Aí | `lib/actions/vagas.ts`, `components/publicar-form.tsx`, `app/(app)/vagas/page.tsx`, `lib/modules.ts` | 4 | Onde plugar coordenadas, picker, visão e gating |

**How samples will be used:**

- Portar `AddressMapPicker` para o formulário de publicar vaga (captura lat/lng).
- Portar `people-map-client` para a visão de descoberta/equipe (multi-pino).
- Reusar `maps-share` + `geocode` sem reescrever.

---

## Approaches Explored

### Approach A: Portar a stack de mapa do careconnect (Leaflet/OSM) ⭐ Recommended

**Description:**
- **Stack:** `leaflet` + `react-leaflet` sobre OpenStreetMap (sem chave/custo), `maps-share`, action `geocode`, `AddressMapPicker`, `people-map-client`.
- **Coordenadas da vaga:** `vagas` ganha `local_lat`/`local_lng` (`double precision`). `AddressMapPicker` no `publicar-form`: geocode marca o pino, sócio arrasta pra ajustar; sem pino, fallback pro geocode de bairro/cidade.
- **Mapa de descoberta (ajudante):** vagas abertas por proximidade, com **coordenada aproximada calculada no servidor** (arredondada / centroide do bairro). O exato **nunca é enviado** a quem não é contratado.
- **Mapa da equipe (sócio):** vagas da própria equipe com pino exato.
- **Compartilhar localização (one-shot):** reusa `maps-share`/`navigator.share`. Ajudante contratado manda o pin atual ("a caminho"); sócio/equipe manda o local da obra.
- **Liberação:** sócio sempre; funcionário precisa do módulo `mapa` liberado (`user_modules`); ajudante tem o mapa de descoberta na superfície dele.

**Pros:**
- Menor diff: ~80% já existe e é testado no repo irmão.
- Sem custo/chave de API; sem serviço externo novo (só geocoding OSM, já resolvido).
- A regra de aproximação no servidor entrega o anti-IDOR de graça.

**Cons:**
- Nova dependência de front (`leaflet`/`react-leaflet`).
- Geocoding Nominatim tem rate-limit — ok pro protótipo, atenção em escala.

**Why Recommended:** KB `multi-tenant-rls`/`rls-policies` (0.95) + **match forte de codebase** no careconnect (stack pronta). É o caminho mais curto que atende os dois públicos e a privacidade.

---

### Approach B: Google Maps / Mapbox

**Description:** Usar um provedor hospedado (Google Maps ou Mapbox) para mapa e geocoding.

**Pros:**
- Geocoding e tiles de qualidade superior; menos rate-limit.

**Cons:**
- Exige **API key + billing** e configuração de conta.
- Custo por uso; contraria o "protótipo enxuto".

**Why not recommended:** Adiciona custo e setup de conta para um ganho que o protótipo não precisa — o careconnect já provou que OSM/Leaflet basta.

---

### Approach C: Só link de localização, sem mapa interativo (Optional)

**Description:** Não plotar vagas; apenas mostrar endereço + link "abrir no Maps/Waze" na página da vaga.

**Pros:**
- Diff mínimo; nem precisa de biblioteca de mapa.

**Cons:**
- Não atende "marcar as vagas disponíveis no mapa" nem a descoberta por proximidade.

**Why not recommended:** Não entrega o valor central pedido (vagas no mapa para os dois públicos).

---

## Data Engineering Context (if applicable)

N/A — feature de produto (mapa + geolocalização), sem pipelines/ETL/analytics.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-08-05 — "pode fechar" |
| **Reasoning** | Stack pronta no careconnect; sem custo/chave; aproximação no servidor cobre a privacidade |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Leaflet/OSM (portar do careconnect) | Grátis, sem chave, já testado no repo irmão | Google/Mapbox (custo/key) |
| 2 | `vagas` ganha `local_lat`/`local_lng`; picker no publicar + geocode fallback | Precisão boa com pouco atrito | Só geocode do texto (impreciso) |
| 3 | Coordenada aproximada **no servidor** para não-contratado; exato só pro contratado + equipe dona | Segurança/privacidade da obra; anti-IDOR | Esconder no cliente (vazaria o exato) |
| 4 | Compartilhar localização one-shot (reusa `maps-share`); ao vivo adiado | Atende "estou chegando" sem realtime de GPS | Rastreamento ao vivo agora |
| 5 | Dois públicos: descoberta (ajudante) + equipe (sócio) | Escolha (c) | Só um público |
| 6 | Acesso da equipe gated por módulo `mapa` (`user_modules`); sócio sempre | Espelha a liberação de módulos | Sistema de permissão novo |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Rastreamento de localização ao vivo | Escolhido one-shot para o MVP | Yes |
| Rotas/navegação dentro do app | Delega pro Google/Waze via link | Yes |
| Clustering de pinos | Só importa com muitas vagas | Yes |
| Filtros avançados no mapa (categoria, valor, raio) | A lista de vagas já filtra | Yes |
| Geofencing / check-in automático por chegada | Depende do rastreamento ao vivo | Yes |
| Histórico de localização | Não faz parte do "estou chegando" one-shot | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Reuso da stack de mapa do careconnect | ✅ | Seguiu com o molde | No |
| Descoberta: público e privacidade (perguntas 2–3) | ✅ | Dois públicos + aproximado até contratar | No |
| Abordagem A (port + aplicação às vagas) | ✅ | "pode fechar" | No |

**Minimum Validations:** 2 → atingido (3).

---

## Suggested Requirements for /define

### Problem Statement (Draft)
Ajudantes precisam achar diárias por proximidade e sócios precisam ver/compartilhar o local das vagas, sem expor o endereço exato da obra a quem ainda não foi contratado.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Ajudante | Descobrir diárias perto de onde está; sinalizar que está a caminho |
| Sócio (`admin`) | Ver as vagas da equipe no mapa e mandar o local da obra pro contratado |
| Funcionário (se liberado) | Usar o mapa/compartilhar local em nome da equipe |

### Success Criteria (Draft)
- [ ] Vaga guarda `local_lat`/`local_lng`; sócio fixa o pino ao publicar (com geocode + arrastar).
- [ ] Mapa de descoberta mostra vagas abertas por proximidade com localização **aproximada**.
- [ ] Ajudante não-contratado nunca recebe a coordenada exata (verificado por payload/URL direta).
- [ ] Ajudante contratado e a equipe dona veem o pino exato.
- [ ] Botão de compartilhar localização (one-shot) abre o share do celular / manda o pin.
- [ ] Sócio sempre acessa; funcionário só com o módulo `mapa` liberado.

### Constraints Identified
- Nova dep `leaflet`/`react-leaflet` (OSM, sem chave). Geocoding Nominatim: respeitar rate-limit/User-Agent (reusar action do careconnect).
- Aproximação **obrigatoriamente no servidor** (RLS/action) — nunca enviar o exato ao cliente não autorizado.
- pt-BR; termo de UI "equipe"; migration via conector MCP + `database.types.ts` à mão.

### Out of Scope (Confirmed)
- Todos os itens YAGNI acima (ao vivo, rotas no app, clustering, filtros, geofencing, histórico).

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 4 |
| Approaches Explored | 3 |
| Features Removed (YAGNI) | 6 |
| Validations Completed | 3 |
| Duration | ~1 sessão |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_MAPA_VAGAS.md`
