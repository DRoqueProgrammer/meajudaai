# DESIGN: Mapa de Vagas + Compartilhar Localização

> Mapa Leaflet/OSM das vagas por proximidade, com a coordenada exata numa tabela protegida por RLS (só contratado + equipe dona) e a aproximada na `vagas` (visível a todos).

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MAPA_VAGAS |
| **Date** | 2026-08-05 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_MAPA_VAGAS.md](./DEFINE_MAPA_VAGAS.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (PWA)                                 │
│  components/maps/*  ── next/dynamic({ ssr:false }) → Leaflet + OSM tiles    │
│    · AddressMapPicker (publicar)   · VagasMap (descoberta/equipe)          │
│    · CompartilharLocal (navigator.geolocation + maps-share)                │
│        │ lat/lng (hidden fields)            ▲ pinos                        │
│        ▼                                     │                             │
├────────┼──────────────────────────────────────┼──────────────────────────┤
│        │ SERVER ACTIONS / COMPONENTS           │                          │
│  lib/actions/geocode.ts   ── Nominatim (sem chave, User-Agent no servidor) │
│  lib/actions/vagas.ts     ── publicar: grava EXATO em vaga_local +         │
│                              APROX (arredondado) em vagas.local_aprox_*     │
│  app/(app)/mapa/page.tsx  ── role-aware (ajudante=descoberta, equipe=exato)│
├──────────────────────────────────────────────┼──────────────────────────┤
│                         SUPABASE (Postgres + RLS)                          │
│                                               │                          │
│  vagas.local_aprox_lat / _lng   ← APROX (~bairro), visível a quem vê a vaga│
│  vaga_local(vaga_id, lat, lng)  ← EXATO, RLS protegida:                    │
│     SELECT só se can_manage_vaga(vaga) OU is_ajudante_aceito(vaga,uid)      │
│  is_ajudante_aceito(v_vaga,v_user)  ← SECURITY DEFINER                     │
│  user_modules.module += 'mapa'  ← gating do funcionário                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ideia-chave:** a aproximação **não** é esconder no cliente — é **separação física de tabela**. O exato mora em `vaga_local` (RLS estrita, como `profiles_pii`); a `vagas` só carrega a coordenada aproximada. Assim o exato é inacessível via REST para quem não é contratado nem da equipe, mesmo pela URL direta.

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `vaga_local` (nova tabela) | Coordenada **exata** da obra, RLS estrita | Postgres (Supabase) |
| `vagas.local_aprox_lat/lng` | Coordenada **aproximada** (~bairro), pública | Postgres |
| `is_ajudante_aceito` | Helper SECURITY DEFINER — contratado da vaga | PL/pgSQL |
| `lib/actions/geocode.ts` | Geocoding Nominatim (sem chave) | Server Action (port CareConnect) |
| `lib/maps-share.ts` | Deep-links Google/Waze/`geo:`/share | Funções puras (port) |
| `components/maps/*` | Picker + mapa multi-pino + botão compartilhar | react-leaflet + Leaflet (dynamic ssr:false) |
| `app/(app)/mapa/page.tsx` | Mapa role-aware (descoberta / equipe) | Next.js Server Component |
| `mapa` em `PANEL_MODULES`/`user_modules` | Liberação do mapa por funcionário | TypeScript + Postgres CHECK |

---

## Key Decisions

### Decision 1: Coordenada exata em tabela separada (`vaga_local`), aproximada na `vagas`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O DEFINE exige que o ajudante não-contratado nunca receba a coordenada exata (AT-005), e a `vagas` (aberta) é legível por qualquer autenticado pela RLS `vagas_select`. RLS é row-level, não column-level — não dá pra esconder uma coluna da `vagas`.

**Choice:** Split de tabela, igual ao `profiles`/`profiles_pii` que já existe. `vagas` ganha `local_aprox_lat/lng` (arredondado, seguro); o exato vai em `vaga_local(vaga_id, lat, lng)` com RLS: SELECT só se `can_manage_vaga(vaga)` (membro da equipe) OU `is_ajudante_aceito(vaga, uid)` OU sysadmin.

**Rationale:** O exato fica fisicamente inacessível via REST para quem não tem direito — anti-IDOR real, não "esconde no cliente". Espelha o padrão de PII do próprio app.

**Alternatives Rejected:**
1. Coordenada exata direto na `vagas` + filtrar no server action — o cliente REST leria o exato direto (IDOR).
2. Column-level security — Supabase/Postgres RLS não faz isso nativamente.

**Consequences:**
- Publicar grava em dois lugares (aproximado na vaga, exato em `vaga_local`).
- A leitura do exato passa por `vaga_local` (join/segundo fetch) só quando autorizado.

---

### Decision 2: Leaflet/OSM portado do CareConnect via `next/dynamic({ssr:false})`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** Precisa de mapa interativo sem custo/chave; Leaflet precisa de `window` (quebra no SSR) — a A-005 do DEFINE.

**Choice:** Portar `AddressMapPicker`, o mapa multi-pino (molde `people-map`), `maps-share.ts` e `geocode.ts` do CareConnect, todos carregados com `next/dynamic(() => import(...), { ssr: false })`.

**Rationale:** Stack pronta e testada no repo irmão, grátis (OSM). O `ssr:false` resolve a hidratação de forma comprovada.

**Alternatives Rejected:**
1. Google Maps/Mapbox — chave + custo (rejeitado já no brainstorm).
2. Importar Leaflet direto (sem dynamic) — quebra o SSR do Next.

**Consequences:** Nova dependência (`leaflet` + `react-leaflet` + `@types/leaflet`); geocoding Nominatim tem rate-limit (aceitável no protótipo).

---

### Decision 3: Aproximação por arredondamento no servidor, no momento de publicar

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O DEFINE deixou em aberto a fórmula (arredondar vs centroide de bairro).

**Choice:** Arredondar o exato para 2 casas decimais (~1,1 km) e gravar em `local_aprox_*`, no server action de publicar. Sem pino, geocoda bairro/cidade e usa esse ponto (já é aproximado).

**Rationale:** Uma linha (`Math.round(n*100)/100`), esconde a casa exata mantendo o "perto de mim" útil. Centroide de bairro exigiria geocodar o bairro sempre — mais chamadas ao Nominatim.

**Alternatives Rejected:** Centroide de bairro geocodado — mais preciso como "área", mas mais I/O; guardado se o arredondamento ficar grosseiro demais.

**Consequences:** A aproximação revela um quadrante ~1 km — aceitável para "aproximado"; a precisão pode ser ajustada trocando o fator.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0014_vaga_local_e_mapa.sql` | Create | `vaga_local` + RLS; `is_ajudante_aceito`; `vagas.local_aprox_*`; `mapa` no CHECK do `user_modules` | @agentspec:cloud:supabase-specialist | None |
| 2 | `lib/supabase/database.types.ts` | Modify | Tipos de `vaga_local`, colunas novas de `vagas`, função `is_ajudante_aceito`, chave `mapa` | @agentspec:cloud:supabase-specialist | 1 |
| 3 | `package.json` | Modify | `leaflet`, `react-leaflet`, `@types/leaflet` | (general) | None |
| 4 | `lib/maps-share.ts` | Create | Deep-links Google/Waze/`geo:`/`coordLabel` (port) | (general) | None |
| 5 | `lib/actions/geocode.ts` | Create | `geocodeAddress` via Nominatim (port; User-Agent MeAjuda Aí) | (general) | None |
| 6 | `components/maps/address-map-picker.tsx` + `address-map-picker-dynamic.tsx` | Create | Picker de endereço (geocode + pino arrastável + "local atual") | (general) | 4,5 |
| 7 | `components/maps/vagas-map.tsx` + wrapper dynamic | Create | Mapa multi-pino (descoberta/equipe), molde `people-map` | (general) | 4 |
| 8 | `components/maps/compartilhar-local.tsx` | Create | Botão one-shot: `navigator.geolocation` + `navigator.share`/links | (general) | 4 |
| 9 | `lib/validation.ts` | Modify | `VagaSchema` + `local_lat`/`local_lng` opcionais | (general) | None |
| 10 | `lib/actions/vagas.ts` | Modify | Publicar/editar: grava exato em `vaga_local` + aprox arredondado em `vagas` | (general) | 1,9 |
| 11 | `components/publicar-form.tsx` | Modify | Integra `AddressMapPicker` (hidden `local_lat`/`local_lng`) | (general) | 6,9 |
| 12 | `app/(app)/mapa/page.tsx` | Create | Rota role-aware: ajudante=descoberta (aprox), equipe=exato | (general) | 7,1 |
| 13 | `lib/modules.ts` | Modify | `mapa` em `PANEL_MODULES` + `GRANTABLE_MODULES` | (general) | None |
| 14 | `components/nav.tsx` | Modify | Entrada "Mapa" (superfície do ajudante + painel da equipe) | (general) | 13 |
| 15 | `app/(app)/vagas/[id]/page.tsx` | Modify | Contratado/equipe veem o pino exato (via `vaga_local`) + compartilhar | (general) | 1,8 |

**Total Files:** 15 (7 criados, 8 modificados)

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1, 2 | Migration, RLS do split exato/aproximado, helper — núcleo de banco/segurança + acesso vivo via MCP |
| (general) | 3–15 | Next.js/React/Leaflet (UI, server actions, port). Sem especialista de TS/React no registro; port guiado pelo molde do CareConnect |

**Agent Discovery:** registro `agentspec:*`; casamento por tipo de arquivo (`.sql`/RLS → supabase-specialist) e domínio KB (`supabase`).

---

## Code Patterns

### Pattern 1: Migration — split exato/aproximado + gating (0014)

```sql
-- Coordenada aproximada (segura) na própria vaga
alter table public.vagas add column local_aprox_lat double precision;
alter table public.vagas add column local_aprox_lng double precision;

-- Coordenada EXATA, protegida (molde profiles_pii)
create table public.vaga_local (
  vaga_id uuid primary key references public.vagas(id) on delete cascade,
  lat double precision not null,
  lng double precision not null
);
alter table public.vaga_local enable row level security;

create or replace function public.is_ajudante_aceito(v_vaga uuid, v_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidaturas c
    where c.vaga_id = v_vaga and c.ajudante_id = v_user and c.status = 'aceito'
  )
$$;
revoke execute on function public.is_ajudante_aceito(uuid, uuid) from anon, public;
grant execute on function public.is_ajudante_aceito(uuid, uuid) to authenticated;

-- Só a equipe dona ou o ajudante contratado leem o exato. Escrita: service role (publicar).
create policy "vaga_local_select" on public.vaga_local for select to authenticated
  using (
    public.can_manage_vaga(vaga_id)
    or public.is_ajudante_aceito(vaga_id, auth.uid())
    or public.current_app_role() = 'sysadmin'
  );

-- Módulo 'mapa' (gating do funcionário)
alter table public.user_modules drop constraint if exists user_modules_module_check;
alter table public.user_modules add constraint user_modules_module_check
  check (module in ('vagas','equipe','financeiro','relatorios','publicar_vagas','chat_ajudantes','mapa'));
```

### Pattern 2: Publicar grava exato + aproximado (server, arredondando)

```typescript
// lib/actions/vagas.ts — dentro de publicarVagaAction, após inserir a vaga
const arred = (n: number) => Math.round(n * 100) / 100; // ~1,1 km
const lat = Number(campo(fd, "local_lat")) || null;
const lng = Number(campo(fd, "local_lng")) || null;
if (lat && lng) {
  await db.from("vaga_local").insert({ vaga_id: data.id, lat, lng });
  await db.from("vagas").update({ local_aprox_lat: arred(lat), local_aprox_lng: arred(lng) })
    .eq("id", data.id);
}
// Sem pino: fallback geocoda bairro/cidade e grava só o aprox (já é impreciso).
```

### Pattern 3: Geocoding Nominatim (port CareConnect)

```typescript
// lib/actions/geocode.ts
"use server";
import { requireUser } from "@/lib/auth/roles";
export interface GeoHit { label: string; lat: number; lng: number }

export async function geocodeAddress(query: string): Promise<GeoHit[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "br");
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MeAjudaAi/0.1 (marketplace de diárias)", "Accept-Language": "pt-BR" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  } catch { return []; }
}
```

### Pattern 4: Mapa client via dynamic (ssr:false) — resolve a hidratação

```typescript
// components/maps/vagas-map-dynamic.tsx
"use client";
import dynamic from "next/dynamic";
export const VagasMap = dynamic(() => import("./vagas-map").then((m) => m.VagasMap), {
  ssr: false,
  loading: () => <div className="grid h-[420px] place-items-center rounded-2xl border border-line text-sm text-muted">Carregando mapa…</div>,
});
```

### Pattern 5: Guard role-aware do `/mapa`

```typescript
// app/(app)/mapa/page.tsx — funcionário precisa do módulo; ajudante/sócio não
const user = await requireUser();
if (user.role === "funcionario") await guardModule("mapa"); // redireciona se não liberado
// ajudante → descoberta (vagas.local_aprox); admin/funcionário liberado → vagas da equipe (vaga_local exato)
```

---

## Data Flow

```text
PUBLICAR (sócio/funcionário liberado)
1. AddressMapPicker geocoda o endereço e fixa o pino → hidden local_lat/local_lng
   │
   ▼
2. publicarVagaAction: insert vaga → insert vaga_local(EXATO) + update vagas.local_aprox(ARRED)

DESCOBERTA (ajudante não-contratado)
1. /mapa lê vagas abertas com local_aprox_* (RLS vagas_select) → VagasMap com pinos aproximados
   │
   ▼
2. Abre a vaga → vaga_local é NEGADO (não é contratado) → vê só o aproximado

CONTRATADO / EQUIPE
1. Abre a vaga → vaga_local retorna o EXATO (RLS: is_ajudante_aceito / can_manage_vaga)
   │
   ▼
2. CompartilharLocal → maps-share (sócio manda a obra; ajudante manda "estou a caminho" via geolocation)
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| OpenStreetMap Nominatim | `fetch` server-side (geocoding) | Nenhuma (User-Agent obrigatório) |
| OpenStreetMap tiles | `<TileLayer>` client (Leaflet) | Nenhuma |
| `navigator.geolocation` / `navigator.share` | API do browser (one-shot "estou a caminho") | Permissão do usuário |
| Supabase Postgres | client de sessão (RLS) + admin (publicar grava `vaga_local`) | Cookie/JWT · service role |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage |
|-----------|-------|-------|-------|----------|
| RLS isolation | `vaga_local`: não-contratado NÃO lê; contratado e equipe leem | `tests/rls.test.ts` | 2+ JWTs (padrão do repo) | AT-004, AT-005 |
| Unit | `arred()` (arredondamento ~bairro); `maps-share` (URLs) | teste ao lado | assert | AT-001/002 |
| E2E (happy) | Publicar com pino; mapa de descoberta; compartilhar | manual/preview | — | AT-003/006/007 |
| Gating | Funcionário sem `mapa` → bloqueado; com → acessa | `tests/rls.test.ts` (via user_modules) | 2 JWTs | AT-008 |

O teste-âncora (Ponytail): **RLS de `vaga_local`** — não-contratado lê 0 linhas, contratado lê 1. É o que segura o AT-005.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Geocoding falha/rate-limit | `geocodeAddress` retorna `[]`; UI pede pra arrastar o pino manualmente | No |
| Geolocalização negada | Mensagem "não foi possível obter sua localização" (como no CareConnect) | No |
| Vaga sem pino nem geocode | `local_aprox` nulo → vaga não aparece no mapa (aparece na lista) | No |
| Não-contratado tenta ler `vaga_local` | RLS nega → UI mostra só o aproximado | No |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| Fator de arredondamento | number | `100` (2 casas, ~1,1 km) | Precisão da coordenada aproximada |
| `mapa` (`user_modules.module`) | enum | ausente = OFF p/ funcionário | Libera o mapa da equipe ao funcionário |
| Nominatim User-Agent | string | `MeAjudaAi/0.1` | Exigido pela política do OSM |

---

## Security Considerations

- **Exato em tabela protegida** (`vaga_local`) — RLS `is_ajudante_aceito`/`can_manage_vaga`; o exato nunca é legível via REST por não-contratado (anti-IDOR real).
- **Aproximado é o único dado de local na `vagas`** — arredondado no servidor no momento de publicar; o cliente nunca recebe o exato a menos que autorizado.
- **Escrita de `vaga_local` via service role** (publicar), nunca pelo cliente.
- **`mapa` gating** reusa `getAllowedModules`; ajudante tem a descoberta na própria superfície (não é gated por módulo — cuidado no guard: `guardModule('mapa')` só para funcionário).
- **Geocoding no servidor** (User-Agent + sem CORS/chave exposta), como no CareConnect.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Erros de geocode/geolocation tratados na UI; falhas de escrita logadas no server |
| Metrics | Nenhuma nova (COULD: volume de geocoding) |
| Tracing | N/A |

---

## Pipeline Architecture (if applicable)

N/A — feature de produto (mapa/geolocalização), sem pipelines de dados.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | design-agent | Versão inicial a partir de DEFINE_MAPA_VAGAS.md |
| 1.1 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_MAPA_VAGAS.md`
