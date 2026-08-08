# DESIGN: Agenda de Diárias do Ajudante

> Evolui a `/agenda` existente com um calendário mensal (grid React), aviso de conflito por dia e blocos de disponibilidade numa tabela `bloqueio_agenda` protegida por RLS de dono.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AGENDA_AJUDANTE |
| **Date** | 2026-08-05 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_AGENDA_AJUDANTE.md](./DEFINE_AGENDA_AJUDANTE.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (PWA)                                 │
│  components/agenda/agenda-view.tsx  ── toggle: Lista (atual) | Calendário   │
│  components/agenda/agenda-calendar.tsx ── grid do mês (React puro, SSR-safe)│
│     · marca dias com diária · sombreia dias bloqueados                     │
│     · destaca CONFLITO (diasEmConflito: 2+ diárias OU diária+bloqueio)      │
│     · clicar no dia → alternarBloqueioAction                               │
│        │                                     ▲ router.refresh              │
│        ▼                                     │                             │
├────────┼─────────────────────────────────────┼──────────────────────────┤
│  app/(app)/agenda/page.tsx (server)          │                          │
│     carrega diárias aceitas (query atual) + meus bloqueios → passa props   │
│  lib/actions/agenda.ts ── alternarBloqueioAction (client de sessão, RLS)   │
│  lib/agenda-conflitos.ts ── diasEmConflito() [função pura, testável]       │
├──────────────────────────────────────────────┼──────────────────────────┤
│                         SUPABASE (Postgres + RLS)                          │
│  bloqueio_agenda(ajudante_id, data)  ← RLS: ajudante_id = auth.uid()       │
│  candidaturas(aceito) → vagas(data_servico)   ← fonte das diárias (atual)  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ideia-chave:** a fonte das diárias já existe (a `/agenda` lê candidaturas `aceito`). A feature adiciona (1) uma visão de calendário sobre esses mesmos dados, (2) `bloqueio_agenda` (dias indisponíveis, privados por RLS de dono) e (3) uma função pura `diasEmConflito` que marca os dias problemáticos.

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `bloqueio_agenda` (nova tabela) | Dias indisponíveis do ajudante; RLS por dono | Postgres (Supabase) |
| `lib/agenda-conflitos.ts` | `diasEmConflito(diarias, blocos)` — 2+ diárias/dia OU diária em dia bloqueado | TypeScript (função pura) |
| `lib/actions/agenda.ts` | `alternarBloqueioAction(data)` (cria/remove bloqueio) | Next.js Server Action |
| `components/agenda/agenda-calendar.tsx` | Grid do mês (molde escala-calendar, simplificado) | React client (SSR-safe) |
| `components/agenda/agenda-view.tsx` | Toggle Lista/Calendário | React client |
| `app/(app)/agenda/page.tsx` | Carrega diárias + bloqueios; passa props | Next.js Server Component |

---

## Key Decisions

### Decision 1: `bloqueio_agenda` privado por RLS de dono (sem PII split)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** Os blocos são dados pessoais do ajudante; ninguém mais deve lê-los (AT-005). Diferente das coordenadas da vaga, não há caso de "outro papel também lê" — é só o dono.

**Choice:** `bloqueio_agenda(ajudante_id, data, PK(ajudante_id,data))` com RLS simples: SELECT/INSERT/DELETE só onde `ajudante_id = auth.uid()`. Sem tabela-split (não é PII compartilhada com ninguém).

**Rationale:** É o padrão de RLS de dono do KB `rls-policies` (`auth.uid() = user_id`). PK composta impede bloqueio duplicado no mesmo dia.

**Alternatives Rejected:**
1. Bloqueio com faixa de horário — YAGNI (dia inteiro basta; vaga nem tem `hora_fim`).
2. Guardar no perfil como JSON — não dá pra consultar/indexar por dia.

**Consequences:** Uma tabela pequena; escrita pelo client de sessão (RLS valida o dono).

---

### Decision 2: Calendário é React puro (SSR-safe), sem `dynamic`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O mapa (feature 3) precisou de `dynamic ssr:false` porque o Leaflet usa `window`. O calendário é só um grid de datas.

**Choice:** `agenda-calendar` é um `"use client"` normal (grid computado com `Date` — sem `window`). O `hoje` (BRT) vem como prop do servidor para evitar mismatch de hidratação na marcação do dia atual.

**Rationale:** Um grid de datas é SSR-safe; `dynamic` seria complexidade desnecessária. Passar `hoje` do servidor elimina o único ponto de divergência servidor/cliente.

**Alternatives Rejected:**
1. Lib de calendário (react-day-picker etc.) — nova dependência para um grid de 42 células (YAGNI).
2. `dynamic ssr:false` — desnecessário sem dependência de `window`.

**Consequences:** Zero dependência nova; o grid é ~40 linhas de layout (molde escala-calendar simplificado).

---

### Decision 3: Conflito numa função pura testável (`diasEmConflito`)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** A regra de conflito (2+ diárias no dia; diária em dia bloqueado) é o núcleo lógico e precisa de teste (AT-002, AT-004).

**Choice:** Extrair `diasEmConflito(diarias: {data}[], blocos: string[]): Set<string>` num módulo plano (`lib/agenda-conflitos.ts`), importado pelo componente e por um teste unitário.

**Rationale:** Lógica pura = teste rápido e determinístico, sem DB nem browser. Sem `hora_fim`, conflito é por dia (A-002 do DEFINE).

**Alternatives Rejected:** Computar inline no componente — não testável isoladamente.

**Consequences:** Um módulo extra pequeno; a regra fica coberta por unit test.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0015_bloqueio_agenda.sql` | Create | `bloqueio_agenda` + RLS de dono | @agentspec:cloud:supabase-specialist | None |
| 2 | `lib/supabase/database.types.ts` | Modify | Tipos de `bloqueio_agenda` | @agentspec:cloud:supabase-specialist | 1 |
| 3 | `lib/agenda-conflitos.ts` | Create | `diasEmConflito()` (função pura) | (general) | None |
| 4 | `lib/actions/agenda.ts` | Create | `alternarBloqueioAction(data)` | (general) | 1 |
| 5 | `components/agenda/agenda-calendar.tsx` | Create | Grid do mês (diárias, blocos, conflito, toggle) | (general) | 3,4 |
| 6 | `components/agenda/agenda-view.tsx` | Create | Toggle Lista/Calendário | (general) | 5 |
| 7 | `app/(app)/agenda/page.tsx` | Modify | Carrega bloqueios; envolve a lista atual no `AgendaView` | (general) | 6 |
| 8 | `tests/agenda-conflitos.test.ts` | Create | Unit de `diasEmConflito` | (general) | 3 |
| 9 | `tests/rls.test.ts` | Modify | Bloqueio é privado (dono lê, outro não) | (general) | 1 |
| 10 | `components/candidatar-button.tsx` | Modify (SHOULD) | Aviso ao candidatar em dia bloqueado | (general) | 4 |

**Total Files:** 10 (6 criados, 4 modificados; #10 é SHOULD)

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1, 2 | Migration + RLS de dono + acesso vivo via MCP |
| (general) | 3–10 | React/TypeScript (calendário, action, teste). Sem especialista de TS/React no registro |

---

## Code Patterns

### Pattern 1: Migration — bloqueio_agenda + RLS de dono (0015)

```sql
create table public.bloqueio_agenda (
  ajudante_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  primary key (ajudante_id, data)
);
alter table public.bloqueio_agenda enable row level security;

create policy "bloqueio_select_own" on public.bloqueio_agenda
  for select to authenticated using (ajudante_id = auth.uid());
create policy "bloqueio_insert_own" on public.bloqueio_agenda
  for insert to authenticated with check (ajudante_id = auth.uid());
create policy "bloqueio_delete_own" on public.bloqueio_agenda
  for delete to authenticated using (ajudante_id = auth.uid());
```

### Pattern 2: Regra de conflito (função pura, testável)

```typescript
// lib/agenda-conflitos.ts
export function diasEmConflito(
  diarias: { data: string | null }[],
  blocos: string[],
): Set<string> {
  const porDia = new Map<string, number>();
  for (const d of diarias) {
    if (!d.data) continue;
    porDia.set(d.data, (porDia.get(d.data) ?? 0) + 1);
  }
  const bloco = new Set(blocos);
  const conflito = new Set<string>();
  for (const [dia, n] of porDia) {
    if (n >= 2) conflito.add(dia);          // 2+ diárias no mesmo dia
    if (bloco.has(dia)) conflito.add(dia);   // diária num dia bloqueado
  }
  return conflito;
}
```

### Pattern 3: Toggle de bloqueio (server action, client de sessão)

```typescript
// lib/actions/agenda.ts
"use server";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function alternarBloqueioAction(data: string): Promise<ActionResult> {
  const w = await tryWriter();               // conta demo é read-only
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();     // RLS garante ajudante_id = auth.uid()
  const { data: existe } = await sb
    .from("bloqueio_agenda").select("data").eq("ajudante_id", w.user.id).eq("data", data).maybeSingle();
  if (existe) {
    await sb.from("bloqueio_agenda").delete().eq("ajudante_id", w.user.id).eq("data", data);
  } else {
    await sb.from("bloqueio_agenda").insert({ ajudante_id: w.user.id, data });
  }
  revalidatePath("/agenda");
  return { ok: true };
}
```

### Pattern 4: Grid do mês (molde escala-calendar, simplificado)

```typescript
// components/agenda/agenda-calendar.tsx (trecho do cálculo do grid)
const firstWeekday = new Date(year, month - 1, 1).getDay();
const daysInMonth = new Date(year, month, 0).getDate();
const cells: (number | null)[] = [
  ...Array(firstWeekday).fill(null),
  ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
];
while (cells.length % 7 !== 0) cells.push(null);
const iso = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// navegação: router.push(`/agenda?mes=YYYY-MM`)
// cada célula: nº diárias + sombra se bloco.has(iso) + destaque se conflito.has(iso)
// + botão "bloquear/liberar" → alternarBloqueioAction(iso)
```

---

## Data Flow

```text
1. /agenda (server): candidaturas aceito → vagas(data_servico)  [query ATUAL]
   + bloqueio_agenda (meus) → datas[]
   │  passa { year, month, hoje, diarias, blocos } ao AgendaView
   ▼
2. AgendaView: Lista (children server) | Calendário (AgendaCalendar)
   ▼
3. AgendaCalendar: diasEmConflito(diarias, blocos) → destaca dias
   · clicar num dia → alternarBloqueioAction(iso) → RLS grava/remove → router.refresh
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase Postgres | client de sessão (RLS) para bloqueios e leitura de diárias | Cookie/JWT do usuário |

Sem serviço externo — feature 100% interna.

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage |
|-----------|-------|-------|-------|----------|
| Unit | `diasEmConflito` (2+ diárias; diária+bloqueio; sem conflito) | `tests/agenda-conflitos.test.ts` | vitest | AT-002, AT-004 |
| RLS isolation | Bloqueio privado: dono lê, outro lê 0 | `tests/rls.test.ts` | 2 JWTs (padrão do repo) | AT-005 |
| E2E (happy) | Toggle lista/calendário; criar/remover bloqueio | manual/preview | — | AT-001, AT-003, AT-006 |

Teste-âncora (Ponytail): o **unit de `diasEmConflito`** — é a lógica que falha silenciosa se a regra quebrar.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Conta demo tenta bloquear | `tryWriter` barra; UI mostra o aviso demo | No |
| Toggle falha (rede) | Action retorna erro; UI mantém o estado anterior | No |
| Mês inválido no `?mes=` | Cai no mês atual | No |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `?mes=YYYY-MM` | query | mês atual | Mês exibido no calendário |
| Fonte das diárias | — | candidaturas `aceito` | Igual à `/agenda` atual (A-001) |

---

## Security Considerations

- **Bloqueios privados por RLS de dono** (`ajudante_id = auth.uid()`) — outro usuário não lê nem escreve (AT-005).
- **Escrita pelo client de sessão** (não admin) — a RLS valida o dono; `tryWriter` mantém a conta demo read-only.
- Sem exposição de dado de terceiros: a agenda só lê as próprias diárias (as policies de candidaturas/vagas já limitam isso) e os próprios bloqueios.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Erros de action tratados na UI |
| Metrics | Nenhuma nova |
| Tracing | N/A |

---

## Pipeline Architecture (if applicable)

N/A — feature de produto (agenda/calendário), sem pipelines de dados.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | design-agent | Versão inicial a partir de DEFINE_AGENDA_AJUDANTE.md |
| 1.1 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_AGENDA_AJUDANTE.md`
