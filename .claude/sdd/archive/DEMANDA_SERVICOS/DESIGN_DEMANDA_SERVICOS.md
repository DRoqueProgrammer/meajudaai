# DESIGN: Painel de Demanda Reprimida

> Technical design for implementing DEMANDA_SERVICOS

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | DEMANDA_SERVICOS |
| **Date** | 2026-08-07 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_DEMANDA_SERVICOS.md](./DEFINE_DEMANDA_SERVICOS.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        DEMANDA_SERVICOS                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  SINAL (qualquer autenticado)          AGREGADO (só sysadmin)          │
│  ┌────────────────────────┐            ┌──────────────────────────┐    │
│  │ /vagas  (busca vazia)  │            │ /admin/demanda           │    │
│  │  card-vazio + categoria│            │  agregarDemanda() → barras│   │
│  │  → <AvisarDemanda>     │            │  (divs proporcionais)     │   │
│  └───────────┬────────────┘            └───────────┬──────────────┘    │
│              │ registrarDemandaAction              │ select categoria, │
│              │ (upsert ignoreDuplicates)           │ cidade (RLS)      │
│              ▼                                      ▼                   │
│        ┌─────────────────────────────────────────────────┐            │
│        │  demanda_servico (RLS)                           │            │
│        │  insert: user_id = auth.uid()                    │            │
│        │  select: own OR sysadmin                         │            │
│        │  UNIQUE (user_id, categoria, cidade)  ← dedupe   │            │
│        └─────────────────────────────────────────────────┘            │
│                                                                        │
│  BANNER                                                                │
│  ┌──────────────────────┐  salvarBannerAction   ┌──────────────────┐  │
│  │ /admin/demanda        │ ────upsert id=1────►  │ home_banner (RLS)│  │
│  │  <BannerForm> texto+  │                       │ write: sysadmin  │  │
│  │  liga/desliga         │                       │ read: ativo OR   │  │
│  └──────────────────────┘                        │       sysadmin   │  │
│                                                   └────────┬─────────┘  │
│  /inicio (todos) ── select where id=1 and ativo ──────────┘            │
│     banner no topo quando ativo                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `demanda_servico` (tabela) | Sinal "procuro {categoria} em {cidade}"; 1 por (user,categoria,cidade) | Postgres + RLS |
| `home_banner` (tabela singleton) | Texto + on/off do banner da home; 1 linha (`id=1`) | Postgres + RLS |
| `lib/demanda-agregada.ts` | `agregarDemanda(rows)` → contagem por categoria+cidade, ordenada desc (pura, testável) | TS |
| `lib/actions/demanda.ts` | `registrarDemandaAction` (upsert dedupe) + `salvarBannerAction` (sysadmin) | Server Actions |
| `components/avisar-demanda.tsx` | Botão no empty-state da busca → registra; vira "avisado" | Client component |
| `components/banner-form.tsx` | Editor do banner (textarea + toggle) no painel | Client component |
| `app/(app)/admin/demanda/page.tsx` | Painel do sysadmin: barras server-rendered + form do banner | Server component |
| `/inicio` (mod) | Renderiza o banner ativo no topo | Server component |
| `/vagas` (mod) | Renderiza `<AvisarDemanda>` no `card-vazio` quando há categoria | Server component |

---

## Key Decisions

### Decision 1: RLS de 3 públicos — sinal aberto, agregado só-sysadmin, banner público-quando-ativo

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-07 |

**Context:** A feature tem três públicos com direitos diferentes sobre os mesmos dados: qualquer autenticado **registra** demanda, só o **sysadmin** vê o **agregado**, e **todos** veem o banner **quando ativo** (mas só o sysadmin o edita e o vê quando desligado). RLS é por linha, então cada direito vira uma policy.

**Choice:**
- `demanda_servico`: `insert` com `check (user_id = auth.uid())`; `select` com `using (user_id = auth.uid() or current_app_role() = 'sysadmin')`.
- `home_banner`: `select` com `using (ativo or current_app_role() = 'sysadmin')`; `insert`/`update` com `current_app_role() = 'sysadmin'`.

**Rationale:** O `select own-or-sysadmin` da demanda dá duas coisas de uma vez: o usuário lê **a própria** linha (pra saber que já avisou — AT-001) e o sysadmin lê **todas** (pro agregado — AT-002), enquanto um usuário comum **não consegue** montar o agregado (só vê a própria linha — AT-004). O banner `ativo or sysadmin` deixa o sysadmin editar com `ativo=false` sem vazar o rascunho para os demais. Usa o mesmo `current_app_role() = 'sysadmin'` já consagrado nas policies de `denuncias`/`vagas` (migration 0008) — zero mecanismo novo.

**Alternatives Rejected:**
1. Agregar por RPC/view com `security definer` — rejeitado: mais superfície e uma função a manter; o `select own-or-sysadmin` + contagem no servidor resolve sem isso.
2. `demanda_servico` service-role-only (molde `invite`) — rejeitado: aqui o **próprio usuário** precisa ler a dele (estado "avisado") e o insert é dele; não é credencial-por-token.

**Consequences:**
- (+) Nenhum helper/policy novo; reusa `current_app_role()`.
- (+) Privacidade do agregado sai da mesma policy do "já avisou".
- (−) O agregado é montado lendo as linhas (não um `count` no banco) — aceitável no volume do protótipo (ver Decision 3).

---

### Decision 2: Dedupe por `UNIQUE (user_id, categoria, cidade)` + upsert `ignoreDuplicates`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (confirmado pelo usuário 2026-08-07) |
| **Date** | 2026-08-07 |

**Context:** A contagem deve refletir **quantas pessoas** procuram, não quantos cliques — senão uma pessoa recarregando infla o sinal (AT-005).

**Choice:** Constraint `unique (user_id, categoria, cidade)` na tabela; a action insere com `upsert(..., { onConflict: "user_id,categoria,cidade", ignoreDuplicates: true })`.

**Rationale:** O banco garante 1 linha por (pessoa, categoria, cidade); `ignoreDuplicates` faz o 2º clique virar no-op **sem erro** (não precisa capturar 23505). A contagem = linhas = usuários distintos interessados.

**Alternatives Rejected:**
1. Contar cliques brutos (sem unique) — rejeitado pelo usuário: infla o sinal.
2. `insert` + try/catch do 23505 — rejeitado: `ignoreDuplicates` é a mesma coisa em 1 chamada.

**Consequences:**
- (+) Anti-spam de graça, no banco.
- (−) Não guarda "quantas vezes" alguém procurou (fora de escopo).

---

### Decision 3: Gráfico server-rendered (divs) + agregação em JS — sem lib, sem RPC

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-07 |

**Context:** O app não tem lib de gráfico (o CareConnect usa recharts; aqui não). Precisamos de barras por categoria+cidade.

**Choice:** Função pura `agregarDemanda(rows)` conta e ordena em JS; o painel renderiza cada barra como uma `<div>` com `style={{ width: '{pct}%' }}` proporcional ao maior total. Sem dependência, sem RPC, sem view.

**Rationale:** Ponytail — barra é largura proporcional, CSS puro resolve. A agregação numa função pura vira o **teste-âncora** (como `podeAceitar`/`diasEmConflito`): rápido, determinístico, sem DB nem browser. No volume do protótipo (dezenas de linhas), ler as linhas e contar em JS é mais barato que criar+manter uma view/RPC com a própria RLS.

**Alternatives Rejected:**
1. Portar recharts — rejeitado: dependência nova para 1 gráfico de barras.
2. View/RPC `count group by` — rejeitado: mais superfície e RLS extra; JS agrega o mesmo.

**Consequences:**
- (+) Zero dependência; lógica testável isolada.
- (−) Recontagem a cada load (aceitável; `ponytail:` se o volume crescer muito, trocar por `count` no banco).

---

### Decision 4: Banner singleton (`id=1`) + gatilho contextual só com categoria

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (gatilho confirmado pelo usuário 2026-08-07) |
| **Date** | 2026-08-07 |

**Context:** O banner é um único texto global; e o botão de sinal só faz sentido quando o usuário buscou **uma categoria** e não achou.

**Choice:**
- `home_banner` com `id smallint primary key default 1 check (id = 1)` — uma linha, sempre; a action faz `upsert({ id: 1, ... })`.
- `<AvisarDemanda>` só renderiza no `card-vazio` quando `categoria && cidadeAtiva` (categoria escolhida **e** cidade específica).

**Rationale:** Singleton evita acumular linhas de banner e simplifica o read (`where id = 1`). O gatilho só-com-categoria mantém o sinal de alta qualidade: um feed vazio sem categoria não diz "falta encanador", diz só "não há nada hoje". Busca em "todas as cidades" (`cidadeAtiva = null`) também não gera sinal — sem cidade não há onde recrutar.

**Alternatives Rejected:**
1. Banner multi-linha com histórico — rejeitado: YAGNI, um texto global basta.
2. Botão em qualquer busca vazia — rejeitado pelo usuário: dilui o sinal.

**Consequences:**
- (+) Read do banner trivial; sinal limpo.
- (−) Demanda sem cidade específica não é capturada (alinhado ao Out of Scope).

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0017_demanda_e_banner.sql` | Create | `demanda_servico` + `home_banner` + RLS (3 públicos) | @supabase-specialist | None |
| 2 | `lib/demanda-agregada.ts` | Create | `agregarDemanda(rows)` — contagem por categoria+cidade, ordenada (pura) | (general) | None |
| 3 | `lib/actions/demanda.ts` | Create | `registrarDemandaAction` (upsert dedupe) + `salvarBannerAction` (sysadmin) | (general) | 1 |
| 4 | `components/avisar-demanda.tsx` | Create | Botão client no empty-state → registra; vira "avisado" | (general) | 3 |
| 5 | `components/banner-form.tsx` | Create | Editor client do banner (textarea + toggle) | (general) | 3 |
| 6 | `app/(app)/admin/demanda/page.tsx` | Create | Painel sysadmin: barras + `<BannerForm>` | (general) | 2, 3, 5 |
| 7 | `app/(app)/vagas/page.tsx` | Modify | Renderiza `<AvisarDemanda>` no `card-vazio` quando há categoria + pré-check `jaAvisou` | (general) | 4 |
| 8 | `app/(app)/inicio/page.tsx` | Modify | Banner ativo no topo (read `home_banner` where id=1 and ativo) | (general) | 1 |
| 9 | `components/nav.tsx` | Modify | Link `/admin/demanda` no `meio` do sysadmin (`nav.tsx:174`) | (general) | 6 |
| 10 | `lib/supabase/database.types.ts` | Modify | Tipos `demanda_servico` + `home_banner` (molde `invite`) | (general) | 1 |
| 11 | `tests/demanda-agregada.test.ts` | Create | Unit de `agregarDemanda` (import relativo) | (general) | 2 |
| 12 | `tests/rls.test.ts` | Modify | Integração RLS: não-sysadmin não lê agregado; só sysadmin escreve banner; dedupe | (general) | 1 |

**Total Files:** 12 (7 novos, 5 modificados)

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1 | Migration + RLS por papel; melhor match para a policy de 3 públicos |
| (general) | 2–12 | App Next.js/TS+React fortemente acoplado às convenções do próprio repo (tryWriter, createServerClient, tokens Tailwind, padrão de action) |

**Nota de execução:** as 3 features anteriores desta sessão foram buildadas em **execução direta** (o build-agent escreve seguindo os padrões do repo), com o supabase-specialist como referência de RLS. O mesmo se aplica aqui — o manifesto nomeia o especialista da migration, mas a integração TS/React roda direto.

**Agent Discovery:** Scanned `${CLAUDE_PLUGIN_ROOT}/agents/**/*.md`; matched by file type (`.sql`→supabase) e KB domain (`supabase/rls-policies`).

---

## Code Patterns

### Pattern 1: Migration — demanda_servico + home_banner + RLS (0017)

```sql
-- 0017: demanda reprimida + banner da home

-- Sinal: qualquer autenticado registra a própria demanda por (categoria, cidade).
create table public.demanda_servico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null,
  cidade text not null,
  created_at timestamptz not null default now(),
  unique (user_id, categoria, cidade)   -- dedupe: 1 por pessoa/categoria/cidade
);
create index demanda_servico_cat_cidade_idx on public.demanda_servico (categoria, cidade);

alter table public.demanda_servico enable row level security;

create policy "demanda_insert_own" on public.demanda_servico
  for insert to authenticated
  with check (user_id = auth.uid());

-- lê a PRÓPRIA (estado "já avisou") ou TUDO se sysadmin (agregado)
create policy "demanda_select_own_or_sysadmin" on public.demanda_servico
  for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'sysadmin');

-- Banner singleton: uma linha (id=1), editada só pelo sysadmin.
create table public.home_banner (
  id smallint primary key default 1 check (id = 1),
  texto text not null default '',
  ativo boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.home_banner enable row level security;

-- todos leem quando ativo; sysadmin lê sempre (pra editar com ativo=false)
create policy "banner_select_active_or_sysadmin" on public.home_banner
  for select to authenticated
  using (ativo or public.current_app_role() = 'sysadmin');

create policy "banner_insert_sysadmin" on public.home_banner
  for insert to authenticated
  with check (public.current_app_role() = 'sysadmin');

create policy "banner_update_sysadmin" on public.home_banner
  for update to authenticated
  using (public.current_app_role() = 'sysadmin')
  with check (public.current_app_role() = 'sysadmin');
```

### Pattern 2: Agregação pura (testável)

```ts
// lib/demanda-agregada.ts
export interface DemandaRow {
  categoria: string;
  cidade: string;
}
export interface DemandaAgregada {
  categoria: string;
  cidade: string;
  total: number;
}

/** Conta linhas por (categoria, cidade) e ordena da maior demanda para a menor. */
export function agregarDemanda(rows: DemandaRow[]): DemandaAgregada[] {
  const m = new Map<string, DemandaAgregada>();
  for (const r of rows) {
    const k = `${r.categoria} ${r.cidade}`;
    const cur = m.get(k);
    if (cur) cur.total += 1;
    else m.set(k, { categoria: r.categoria, cidade: r.cidade, total: 1 });
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
```

### Pattern 3: Server Actions (registrar + banner)

```ts
// lib/actions/demanda.ts
"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/** Usuário sinaliza que procura uma categoria numa cidade (busca sem resultado). */
export async function registrarDemandaAction(categoria: string, cidade: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { error } = await sb.from("demanda_servico").upsert(
    { user_id: w.user.id, categoria, cidade },
    { onConflict: "user_id,categoria,cidade", ignoreDuplicates: true },
  );
  if (error) return { ok: false, erro: "Não foi possível registrar." };
  revalidatePath("/vagas");
  return { ok: true };
}

/** Sysadmin edita o texto e liga/desliga o banner da home. */
export async function salvarBannerAction(texto: string, ativo: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "sysadmin") return { ok: false, erro: "Sem permissão." };
  const sb = await createServerClient();
  const { error } = await sb
    .from("home_banner")
    .upsert({ id: 1, texto, ativo, updated_by: w.user.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/inicio");
  revalidatePath("/admin/demanda");
  return { ok: true };
}
```

### Pattern 4: Botão no empty-state (`app/(app)/vagas/page.tsx`)

```tsx
// No topo da page (server): pré-check "já avisou" só quando faz sentido.
let jaAvisou = false;
if (lista.length === 0 && categoria && cidadeAtiva) {
  const { data } = await sb
    .from("demanda_servico")
    .select("id")
    .eq("user_id", user!.id)
    .eq("categoria", categoria)
    .eq("cidade", cidadeAtiva)
    .maybeSingle();
  jaAvisou = !!data;
}

// Dentro do <div className="card-vazio"> ... </div>, após as saídas existentes:
{categoria && cidadeAtiva ? (
  <AvisarDemanda categoria={categoria} cidade={cidadeAtiva} jaAvisou={jaAvisou} />
) : null}
```

```tsx
// components/avisar-demanda.tsx
"use client";
import { useState } from "react";
import { nomeCategoria } from "@/lib/categorias";
import { registrarDemandaAction } from "@/lib/actions/demanda";

export function AvisarDemanda({
  categoria,
  cidade,
  jaAvisou,
}: {
  categoria: string;
  cidade: string;
  jaAvisou: boolean;
}) {
  const [feito, setFeito] = useState(jaAvisou);
  const [carregando, setCarregando] = useState(false);

  if (feito) {
    return <p className="mt-4 text-sm font-medium text-action-dark">✓ Avisaremos quando aparecer alguém.</p>;
  }
  return (
    <button
      type="button"
      disabled={carregando}
      onClick={async () => {
        setCarregando(true);
        const r = await registrarDemandaAction(categoria, cidade);
        setCarregando(false);
        if (r.ok) setFeito(true);
      }}
      className="btn-ghost mt-4 disabled:opacity-60"
    >
      Avise que procura {nomeCategoria(categoria).toLowerCase()} em {cidade}
    </button>
  );
}
```

### Pattern 5: Painel do sysadmin (barras server-rendered)

```tsx
// app/(app)/admin/demanda/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { nomeCategoria } from "@/lib/categorias";
import { agregarDemanda } from "@/lib/demanda-agregada";
import { BannerForm } from "@/components/banner-form";

export default async function AdminDemandaPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const sb = await createServerClient();
  const { data: rows } = await sb.from("demanda_servico").select("categoria, cidade");
  const agg = agregarDemanda(rows ?? []);
  const max = agg[0]?.total ?? 1;
  const { data: banner } = await sb
    .from("home_banner")
    .select("texto, ativo")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Demanda reprimida</h1>
        <p className="text-sm text-muted">Onde há gente procurando sem oferta.</p>
      </div>

      <div className="flex flex-col gap-2">
        {agg.map((d) => (
          <div key={`${d.categoria}-${d.cidade}`} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <p className="text-sm font-medium">{nomeCategoria(d.categoria)}</p>
              <p className="text-xs text-muted">{d.cidade}</p>
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded bg-line/40">
              <div className="h-6 rounded bg-brand" style={{ width: `${(d.total / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-sm font-semibold tabular-nums">{d.total}</span>
          </div>
        ))}
        {agg.length === 0 ? <p className="card-vazio">Nenhuma demanda registrada ainda.</p> : null}
      </div>

      <BannerForm texto={banner?.texto ?? ""} ativo={banner?.ativo ?? false} />
    </div>
  );
}
```

```tsx
// components/banner-form.tsx
"use client";
import { useState } from "react";
import { salvarBannerAction } from "@/lib/actions/demanda";

export function BannerForm({ texto, ativo }: { texto: string; ativo: boolean }) {
  const [t, setT] = useState(texto);
  const [a, setA] = useState(ativo);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold">Banner da home</p>
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={2}
        placeholder="Ex.: Falta encanador em Recife — avise seu amigo que aqui tem trabalho."
        className="input"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} />
        Mostrar na home para todos
      </label>
      <button
        type="button"
        disabled={salvando}
        onClick={async () => {
          setSalvando(true);
          const r = await salvarBannerAction(t, a);
          setSalvando(false);
          setMsg(r.ok ? "Salvo." : r.erro ?? "Erro.");
        }}
        className="btn-primary self-start disabled:opacity-60"
      >
        Salvar
      </button>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
```

### Pattern 6: Banner na home (`app/(app)/inicio/page.tsx`)

```tsx
// Após carregar o perfil, ler o banner (RLS: só volta se ativo — ou se sysadmin):
const { data: banner } = await sb
  .from("home_banner")
  .select("texto")
  .eq("id", 1)
  .eq("ativo", true)
  .maybeSingle();

// No JSX, como primeiro filho do container, antes do cabeçalho de saudação:
{banner?.texto ? (
  <div className="rounded-2xl border border-accent bg-accent/15 px-4 py-3 text-sm text-[#3a2f00]">
    {banner.texto}
  </div>
) : null}
```

> Nota de tokens: `text-action-dark`, `bg-accent`, `bg-line/40`, `input`, `btn-ghost`, `btn-primary`, `card`, `card-vazio` são classes já usadas no app (ver `/inicio`, `/vagas`, `convidar-form`). O build usa as existentes; se algum utilitário (`bg-line/40`, `bg-accent/15`) não existir no config do Tailwind, cair para o equivalente presente.

---

## Data Flow

```text
1. Usuário busca /vagas?categoria=ajudante_encanador&cidade=Recife → 0 resultados
   │
   ▼
2. card-vazio mostra <AvisarDemanda> (categoria + cidade presentes) → clique
   │
   ▼
3. registrarDemandaAction → upsert demanda_servico (ignoreDuplicates) → RLS check user_id=auth.uid()
   │
   ▼
4. Sysadmin abre /admin/demanda → select categoria,cidade (RLS: sysadmin lê tudo)
   │
   ▼
5. agregarDemanda(rows) → barras proporcionais; sysadmin escreve banner (upsert id=1)
   │
   ▼
6. /inicio de todos → select home_banner where id=1 and ativo → banner no topo
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase Postgres (`demanda_servico`, `home_banner`) | supabase-js (RLS, sessão) | Cookie de sessão (`createServerClient`) |
| Conector Supabase MCP | Aplicar migration 0017 + advisors | service_role (fora do app) |

Sem dependência nova. Sem serviço externo.

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| Unit | `agregarDemanda` (contagem/ordenação) | `tests/demanda-agregada.test.ts` | vitest (import relativo) | AT-002, AT-005 (lógica) |
| Integration (RLS, banco real) | Isolamento do agregado + escrita do banner + dedupe | `tests/rls.test.ts` | vitest + service_role/JWTs | AT-004, AT-005, AT-006 |
| E2E / smoke | Registrar no empty-state · barras no painel · banner on/off na home | preview (manual) | Browser pane | AT-001, AT-002, AT-003 |

**Mapa AT → verificação:**

| AT | Cenário | Como é coberto |
|----|---------|----------------|
| AT-001 | Registrar demanda | `registrarDemandaAction` + insert de integração + smoke no empty-state |
| AT-002 | Gráfico por categoria+cidade | Unit `agregarDemanda` + smoke do painel |
| AT-003 | Banner liga/desliga | `salvarBannerAction` + smoke `/inicio` |
| AT-004 | Não-sysadmin não lê agregado | Integração: JWT comum só vê a própria linha |
| AT-005 | Dedupe por usuário | Integração: 2º insert (user,cat,cidade) não cria 2ª linha + unit conta linhas |
| AT-006 | Só sysadmin edita banner | Integração: JWT `admin` recebe erro no insert/update de `home_banner` |

**Casos unit de `agregarDemanda`:** (1) `[]` → `[]`; (2) 3 linhas mesma cat+cidade → total 3; (3) cat+cidade distintas → itens separados; (4) ordenação: maior total primeiro.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Conta demo grava (read-only) | `tryWriter` → `{ erro }` → action retorna `{ ok:false, erro }` | No |
| Clique repetido (dedupe) | `upsert ignoreDuplicates` → no-op silencioso | No |
| Não-sysadmin tenta salvar banner | Guarda `w.user.role !== "sysadmin"` na action **+** RLS (defesa em profundidade) | No |
| Não-sysadmin abre `/admin/demanda` | `redirect("/inicio")` na page (como `/admin/usuarios`) | No |
| Insert/upsert falha | `{ ok:false, erro }`; UI mostra a mensagem | No |

---

## Security Considerations

- **Privacidade do agregado:** a policy `select own-or-sysadmin` impede que um usuário comum leia demanda alheia ou monte a contagem — ele só enxerga a própria linha.
- **Banner só-sysadmin:** escrita barrada por RLS **e** por guarda na action; rascunho (`ativo=false`) invisível para não-sysadmin.
- **Sem PII no sinal:** `demanda_servico` guarda categoria+cidade+user_id — nada sensível; a cidade é a mesma granularidade já pública nas vagas.
- **Página do painel:** `redirect` server-side antes de qualquer render para não-sysadmin.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Erros de action retornam `{ ok:false, erro }` (padrão do app); sem logger dedicado |
| Metrics | O próprio painel É a métrica de produto (demanda por categoria+cidade) |
| Tracing | N/A (protótipo) |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-07 | design-agent | Versão inicial a partir de DEFINE_DEMANDA_SERVICOS.md; grounding no `card-vazio` de `/vagas`, RLS `current_app_role()='sysadmin'` (0008), nav do sysadmin (`nav.tsx:174`) |
| 1.1 | 2026-08-07 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_DEMANDA_SERVICOS.md`
