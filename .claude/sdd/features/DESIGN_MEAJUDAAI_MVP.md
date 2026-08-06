# DESIGN: MeAjuda Aí — Protótipo MVP

> Technical design for implementing MEAJUDAAI_MVP

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MEAJUDAAI_MVP |
| **Date** | 2026-07-23 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_MEAJUDAAI_MVP.md](./DEFINE_MEAJUDAAI_MVP.md) |
| **Status** | ✅ Complete (Built) |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         MeAjuda Aí — Next.js (App Router) PWA              │
├──────────────────────────────────────────────────────────────────────────┤
│  Browser (mobile-first, Poppins, tokens Tailwind)                          │
│    │  Server Components (leitura via RLS)   Client Components (Realtime)    │
│    ▼                                                                        │
│  app/  ──▶ middleware.ts (refresh de sessão + proteção de rota)            │
│    │                                                                        │
│    ├─ Server Actions ("use server")  ─── escrita ───┐                       │
│    │     guards: requireUser / requireWorkspaceRole │                       │
│    │     validação: zod                             ▼                       │
│    │                                        lib/supabase/admin (service)    │
│    └─ Server Components ─── leitura ───▶ lib/supabase/server (anon+RLS)      │
│                                                     │                        │
│                                                     ▼                        │
│  ┌───────────────────────── Supabase ─────────────────────────────────┐    │
│  │  Auth (telefone OTP + e-mail)  →  custom_access_token_hook          │    │
│  │      injeta app_role no JWT (app_metadata)                          │    │
│  │  Postgres + RLS  │  Realtime (mensagens, notificacoes)  │  Storage   │    │
│  │  Tabelas: workspaces, workspace_members, profiles, profiles_pii,    │    │
│  │           vagas, candidaturas, avaliacoes, mensagens, notificacoes  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
   Deploy: Vercel  ·  Provedor SMS (OTP) configurado no Supabase Auth
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| App Router UI | 10 telas + navegação (bottom-nav mobile / sidebar desktop) | Next.js 15, React, Tailwind, Poppins |
| Server Actions (`lib/actions/*`) | Caminho de escrita com guards + zod (publicar, candidatar, aceitar, avaliar, mensagem, equipe) | Next.js server actions + Supabase admin (service-role) |
| Auth & Tenancy | Sessão, papel via JWT claim, membership de workspace | Supabase Auth + `custom_access_token_hook` + `lib/auth/*` |
| Data layer | Esquema relacional + RLS por papel/tenant | Postgres (migrations SQL) |
| Realtime | Chat e notificações ao vivo | Supabase Realtime (`postgres_changes`) |
| Storage | Fotos de perfil/vaga (COULD) | Supabase Storage buckets |
| Domain utils (`lib/`) | IBGE (cidades/UF), money, phone, masks, validação | TypeScript, zod |

---

## Key Decisions

### Decision 1: Isolamento multi-tenant por `workspace_id` + RLS baseada em membership

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** Cada profissional é uma empresa (workspace) que pode ter equipe; os dados de um workspace não podem vazar para outro (AT-006). Ajudantes, porém, são participantes globais que enxergam vagas abertas de qualquer workspace.

**Choice:** Coluna `workspace_id` nas tabelas do lado-empresa (`vagas`, `workspace_members`). RLS decide acesso por **membership** via função `public.is_workspace_member(ws uuid)` (SECURITY DEFINER, checa `workspace_members` com `auth.uid()`), e o papel de plataforma vem do JWT (`public.current_app_role()`, injetado pelo `custom_access_token_hook`, exatamente como em `refs/foco-contabil/supabase/migrations/0006_jwt_role_claim.sql`). Vagas com `status='aberta'` são legíveis por qualquer autenticado (browse do marketplace).

**Rationale:** Autorização no banco (RLS) é a rede de segurança independente da camada de aplicação — padrão KB `supabase/multi-tenant-rls` (0.95) e presente nas 3 refs. Membership por `EXISTS` evita depender de um `active_workspace_id` no JWT e cobre times com múltiplos membros.

**Alternatives Rejected:**
1. Filtragem só na aplicação (WHERE no código) — rejeitada: um bug de query vaza dados entre tenants.
2. Claim `org_id` fixo no JWT (padrão da KB) — adiada: um usuário pode pertencer a mais de um workspace; membership por tabela é mais flexível para o protótipo.
3. Schema/DB por tenant — rejeitada: complexidade desnecessária para protótipo.

**Consequences:**
- (+) Isolamento garantido no banco; testável com dois usuários (AT-006).
- (−) Índices obrigatórios em `workspace_id`/`user_id` para performance das policies.

---

### Decision 2: Modelo híbrido — tabelas workspace-scoped vs. marketplace (row-owner)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** `vagas`/equipe pertencem a um workspace; `candidaturas`, `mensagens`, `avaliacoes`, `notificacoes` cruzam a fronteira do workspace (envolvem um ajudante global).

**Choice:** Dois grupos de RLS. **Workspace-scoped:** acesso por `is_workspace_member`. **Marketplace/row-owner:** acesso pelas partes envolvidas — ex.: `candidaturas` visíveis ao `ajudante_id = auth.uid()` OU a membros do workspace da vaga; `mensagens` só a `remetente_id`/`destinatario_id`; `notificacoes` só ao `user_id`.

**Rationale:** Reflete o padrão `profissional_feedback`/`deals` das refs e mantém cada linha protegida por quem legitimamente participa dela.

**Alternatives Rejected:**
1. Tratar tudo como workspace-scoped — rejeitada: ajudante não pertence a workspace, não conseguiria ver a própria candidatura.

**Consequences:**
- (+) Cada entidade tem dono claro; chat/avaliação funcionam entre tenants.
- (−) Policies um pouco mais elaboradas (subquery em `vagas` para candidaturas).

---

### Decision 3: Escrita por Server Actions com service-role + guards explícitos; leitura por cliente anon (RLS)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** Precisamos de validação forte, autorização e efeitos colaterais (ex.: mudar status da vaga ao aceitar, criar notificação) de forma atômica.

**Choice:** Mutações passam por `lib/actions/*` (`"use server"`) que rodam `requireUser()`/`requireWorkspaceRole()`, validam com **zod** e escrevem via `lib/supabase/admin` (service-role). Leituras usam `lib/supabase/server` (anon + RLS). Espelha `refs/foco-contabil/lib/actions/*` e a nota das migrations ("INSERT/UPDATE/DELETE: somente via server action (service-role) — RLS bloqueia").

**Rationale:** Guard na aplicação = checagem primária; RLS = rede de segurança. Consistente com as 3 refs, menor superfície de erro.

**Alternatives Rejected:**
1. Escrita direta do cliente via RLS `WITH CHECK` — adiada: efeitos colaterais multi-tabela ficam melhores no servidor.

**Consequences:**
- (+) Regras de negócio centralizadas e testáveis (Vitest).
- (−) `SUPABASE_SERVICE_ROLE_KEY` só pode existir no servidor (nunca no cliente).

---

### Decision 4: Chat e notificações via Supabase Realtime sobre tabelas com RLS

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** AT-003 (mensagem < 2 s) e AT-008 (notificação ao vivo).

**Choice:** `mensagens` e `notificacoes` entram na publicação Realtime; client components assinam `postgres_changes` filtrando por `vaga_id`/`user_id`. RLS continua valendo na assinatura.

**Rationale:** KB `supabase/realtime` (0.95); nativo, sem infra extra.

**Alternatives Rejected:**
1. Polling — rejeitada: latência e custo maiores (fica como fallback da premissa A-001).

**Consequences:**
- (+) Tempo real com pouco código.
- (−) Cuidar de limpeza de subscription e de RLS na tabela publicada.

---

### Decision 5: PII separada (`profiles` público vs. `profiles_pii` restrito)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** LGPD; CPF/telefone não podem ser lidos por outros usuários, mas o perfil público (nome, foto, nota) precisa aparecer nos cards de candidato.

**Choice:** `profiles` (público, legível por autenticados) e `profiles_pii` (`user_id` PK; CPF/telefone/e-mail) com RLS `user_id = auth.uid() OR current_app_role()='admin'`. Espelha `paciente_pii` do careconnect.

**Rationale:** Minimiza exposição de dados sensíveis; separa o que é público do que é sigiloso.

**Alternatives Rejected:**
1. Tudo em `profiles` com policies por coluna — rejeitada: RLS é por linha, não por coluna; separar tabelas é mais simples e seguro.

**Consequences:**
- (+) Conformidade LGPD por construção.
- (−) Um JOIN a mais quando o próprio usuário edita seus dados.

---

### Decision 6: Auth por telefone (OTP) e e-mail; unicidade por constraint

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-23 |

**Context:** Spec pede validação SMS e CPF/telefone/e-mail únicos (AT-005).

**Choice:** Habilitar provedores **phone (OTP)** e **email** no Supabase Auth. Unicidade via colunas `citext UNIQUE` em `profiles_pii` (cpf, telefone, email) + verificação amigável na server action de cadastro antes do insert.

**Rationale:** Reaproveita Supabase Auth; constraint garante integridade mesmo com corrida.

**Alternatives Rejected:**
1. Só telefone — rejeitada: usuário pediu ambos.

**Consequences:**
- (+) Dois caminhos de login; integridade garantida no banco.
- (−) Depende de provedor SMS configurado (premissa A-004).

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0001_profiles.sql` | Create | `profiles` + `profiles_pii` + unicidade + RLS | @supabase-specialist | None |
| 2 | `supabase/migrations/0002_auth_hook_role.sql` | Create | `custom_access_token_hook` + `current_app_role()` | @supabase-specialist | 1 |
| 3 | `supabase/migrations/0003_workspaces.sql` | Create | `workspaces`, `workspace_members`, `is_workspace_member()` + RLS | @supabase-specialist | 1,2 |
| 4 | `supabase/migrations/0004_vagas.sql` | Create | `vagas` + RLS (browse aberta / membership) | @supabase-specialist | 3 |
| 5 | `supabase/migrations/0005_candidaturas.sql` | Create | `candidaturas` + RLS row-owner | @supabase-specialist | 4 |
| 6 | `supabase/migrations/0006_avaliacoes.sql` | Create | `avaliacoes` + trigger recalcula `nota_media` | @supabase-specialist | 4 |
| 7 | `supabase/migrations/0007_mensagens.sql` | Create | `mensagens` + RLS + publicação Realtime | @supabase-specialist | 4 |
| 8 | `supabase/migrations/0008_notificacoes.sql` | Create | `notificacoes` + RLS + Realtime | @supabase-specialist | 1 |
| 9 | `supabase/migrations/0009_seed.sql` | Create | Categorias de serviço + cidades demo | @supabase-specialist | 1-8 |
| 10 | `lib/supabase/server.ts` | Create | Cliente SSR (anon + cookies) | @supabase-specialist | None |
| 11 | `lib/supabase/browser.ts` | Create | Cliente browser | @supabase-specialist | None |
| 12 | `lib/supabase/admin.ts` | Create | Cliente service-role (server-only) | @supabase-specialist | None |
| 13 | `lib/supabase/database.types.ts` | Create | Tipos gerados do schema | @supabase-specialist | 1-9 |
| 14 | `lib/auth/roles.ts` | Create | `requireUser`, `roleFromJwt`, `getCurrentUser` | @supabase-specialist | 10 |
| 15 | `lib/auth/workspace.ts` | Create | `requireWorkspaceRole`, `getMyWorkspaces` | @supabase-specialist | 10,14 |
| 16 | `lib/actions/auth.ts` | Create | Cadastro (unicidade) + login OTP/e-mail | @supabase-specialist | 12,14 |
| 17 | `lib/actions/workspace.ts` | Create | Criar workspace, convidar membro | @supabase-specialist | 12,15 |
| 18 | `lib/actions/vagas.ts` | Create | Publicar/editar/mudar status de vaga | @supabase-specialist | 12,15 |
| 19 | `lib/actions/candidaturas.ts` | Create | Candidatar, aceitar/recusar (+notif, +status) | @supabase-specialist | 12,15 |
| 20 | `lib/actions/avaliacoes.ts` | Create | Enviar avaliação | @supabase-specialist | 12,14 |
| 21 | `lib/actions/mensagens.ts` | Create | Enviar mensagem | @supabase-specialist | 12,14 |
| 22 | `lib/actions/profile.ts` | Create | Editar perfil / PII | @supabase-specialist | 12,14 |
| 23 | `lib/{ibge,money,phone,masks,validation}.ts` | Create | Utilitários BR + schemas zod | (general) | None |
| 24 | `middleware.ts` | Create | Refresh de sessão + proteção de rota | (general) | 10 |
| 25 | `app/(auth)/login/page.tsx`, `app/(auth)/cadastro/page.tsx` | Create | Login + cadastro (telas 1) | (general) | 16 |
| 26 | `app/(app)/layout.tsx` + `components/nav/*` | Create | Shell + nav responsiva | (general) | 14 |
| 27 | `app/(app)/inicio/page.tsx` | Create | Home + escolha de papel (tela 2) | (general) | 26 |
| 28 | `app/(app)/publicar/page.tsx` | Create | Publicar diária (tela 3) | (general) | 18,23 |
| 29 | `app/(app)/vagas/page.tsx` + `vagas/[id]/page.tsx` | Create | Buscar vagas + detalhes/candidatar (telas 7,8) | (general) | 18,19 |
| 30 | `app/(app)/minhas-vagas/page.tsx` + `[id]/candidatos/page.tsx` | Create | Minhas vagas + candidatos/aceitar (telas 4,5) | (general) | 18,19 |
| 31 | `app/(app)/minhas-diarias/page.tsx` | Create | Minhas diárias (tela 9) | (general) | 19 |
| 32 | `app/(app)/perfil/[id]/page.tsx` | Create | Perfil do usuário (tela 6) | (general) | 22 |
| 33 | `app/(app)/equipe/page.tsx` | Create | Equipe (convidar membro) | (general) | 17 |
| 34 | `app/(app)/chat/[vagaId]/page.tsx` + `components/chat/*` | Create | Chat Realtime (tela 14) | (general) | 21,11 |
| 35 | `app/(app)/avaliar/[vagaId]/page.tsx` | Create | Avaliar (tela 10) | (general) | 20 |
| 36 | `app/(app)/notificacoes/*` + `components/nav/notification-bell.tsx` | Create | Notificações Realtime | (general) | 11 |
| 37 | `components/{vaga-card,pessoa-card,status-tabs,status-badge,star-rating,search-filters}.tsx` | Create | Componentes recorrentes (identidade visual) | (general) | None |
| 38 | `tailwind.config.ts` + `app/globals.css` | Create | Tokens (brand/accent/action…) + Poppins | (general) | None |
| 39 | `tests/rls.test.ts` | Create | Isolamento multi-tenant (dois usuários) | @supabase-specialist | 1-9 |
| 40 | `tests/actions/*.test.ts` | Create | Unit das server actions | (general) | 16-22 |

**Total Files:** 40 (grupos)

---

## Agent Assignment Rationale

> Agents descobertos em `${CLAUDE_PLUGIN_ROOT}/agents/`.

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1-22, 39 | Especialista em Supabase: RLS, Auth hooks, Realtime, migrations, service-role, geração de tipos e teste de isolamento |
| (general) | 23-38, 40 | Next.js App Router / React / Tailwind e Vitest de server actions — sem agente dedicado de frontend no catálogo; Build trata direto |

**Agent Discovery:**
- Scanned: `${CLAUDE_PLUGIN_ROOT}/agents/**/*.md`
- Matched by: tipo de arquivo (`.sql`/Supabase → supabase-specialist), keywords (RLS, auth, realtime), path (`app/`,`components/` → general)

---

## Code Patterns

### Pattern 1: Cliente Supabase server (anon + cookies) — leitura via RLS

```typescript
// lib/supabase/server.ts  (padrão de refs/foco-contabil)
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* server component context — no-op */ }
        },
      },
    },
  );
}
```

### Pattern 2: Auth hook — injeta `app_role` no JWT + helpers

```sql
-- supabase/migrations/0002_auth_hook_role.sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_claims jsonb;
begin
  select tipo_base into v_role from public.profiles where user_id = (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims','{}'::jsonb);
  v_claims := jsonb_set(v_claims,'{app_metadata}',coalesce(v_claims->'app_metadata','{}'::jsonb));
  v_claims := jsonb_set(v_claims,'{app_metadata,app_role}',to_jsonb(coalesce(v_role,'ajudante')));
  return jsonb_set(event,'{claims}',v_claims);
end $$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

create or replace function public.current_app_role() returns text language sql stable as $$
  select coalesce(auth.jwt()->'app_metadata'->>'app_role','ajudante') $$;
```

### Pattern 3: Tenancy helper + RLS de `vagas`

```sql
-- supabase/migrations/0003_workspaces.sql (helper) + 0004_vagas.sql (RLS)
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid()) $$;

alter table public.vagas enable row level security;

-- Ajudante navega vagas abertas; membros veem as do seu workspace; admin vê tudo
create policy "vagas_select" on public.vagas for select to authenticated using (
  status = 'aberta'
  or public.is_workspace_member(workspace_id)
  or public.current_app_role() = 'admin'
);
-- Escrita apenas via server action (service-role); RLS bloqueia o resto
create index vagas_workspace_id_idx on public.vagas(workspace_id);
create index vagas_cidade_idx on public.vagas(cidade);
```

### Pattern 4: Server action com guard + zod (aceitar candidato)

```typescript
// lib/actions/candidaturas.ts
"use server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { requireWorkspaceRole } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";

const AceitarSchema = z.object({ candidaturaId: z.string().uuid() });

export async function aceitarCandidaturaAction(input: unknown) {
  const { candidaturaId } = AceitarSchema.parse(input);
  const user = await requireUser();
  const db = createAdminClient();

  const { data: c } = await db.from("candidaturas")
    .select("id, vaga_id, ajudante_id, vagas(workspace_id)").eq("id", candidaturaId).single();
  if (!c) throw new Error("Candidatura não encontrada");
  await requireWorkspaceRole(c.vagas.workspace_id, ["owner", "membro"]); // autorização

  await db.from("candidaturas").update({ status: "aceito" }).eq("id", candidaturaId);
  await db.from("vagas").update({ status: "em_andamento" }).eq("id", c.vaga_id);
  await db.from("notificacoes").insert({
    user_id: c.ajudante_id, tipo: "candidatura_aceita",
    titulo: "Você foi aceito!", mensagem: "Abra o chat para combinar a diária.",
  });
  return { ok: true };
}
```

### Pattern 5: Assinatura Realtime do chat (client component)

```typescript
// components/chat/chat-thread.tsx (trecho)
"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

export function useMensagens(vagaId: string, initial: Msg[]) {
  const [msgs, setMsgs] = useState(initial);
  useEffect(() => {
    const sb = createBrowserClient();
    const ch = sb.channel(`chat:${vagaId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `vaga_id=eq.${vagaId}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [vagaId]);
  return msgs;
}
```

### Pattern 6: Tokens de identidade visual (Tailwind)

```typescript
// tailwind.config.ts (theme.extend.colors)
colors: {
  brand:   { DEFAULT: "#0D47A1", dark: "#0A3A85" },
  accent:  { DEFAULT: "#FFC107" },
  action:  { DEFAULT: "#43A047", dark: "#388E3C" },
  surface: "#F5F7FA", ink: "#212121", muted: "#5B6472", line: "#E2E6EC", danger: "#E53935",
}
```

---

## Data Flow

```text
1. Profissional cria workspace e publica vaga (publicarVagaAction)  → vagas.status='aberta'
   │
   ▼
2. Ajudante filtra por cidade/bairro (RLS: vagas abertas) e se candidata (candidatarAction)
   │                                                             → candidaturas.status='aguardando'
   ▼
3. Profissional vê candidatos (RLS: membership) e aceita (aceitarCandidaturaAction)
   │   → candidaturas='aceito', vagas='em_andamento', notificacao ao ajudante (Realtime)
   ▼
4. Chat liberado entre as partes (mensagens + Realtime)  →  combinam a diária
   │
   ▼
5. Diária concluída → cada parte avalia (avaliarAction) → trigger recalcula profiles.nota_media
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase Auth (phone OTP + email) | SDK `@supabase/ssr` | Provedor SMS + chaves anon/service-role |
| Supabase Postgres/Realtime/Storage | SDK | RLS + JWT; service-role só no servidor |
| Vercel | Deploy/hosting | Tokens de projeto |
| WhatsApp (deep link `wa.me`, opcional pós-aceite) | Link | N/A |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| Unit | Server actions (validação, guards, efeitos) | `tests/actions/*.test.ts` | Vitest | Ações MUST |
| Integration (RLS) | Isolamento multi-tenant + row-owner | `tests/rls.test.ts` | Vitest + 2 clientes JWT | AT-005, AT-006 |
| Realtime | Entrega de mensagem/notificação | `tests/realtime.test.ts` | Vitest + canal | AT-003, AT-008 |
| E2E | Fluxo publicar→candidatar→aceitar→chat→avaliar | `e2e/fluxo.spec.ts` | Playwright (ou manual) | AT-001..AT-004, AT-007 |

**Cobertura dos acceptance tests:** AT-001 publicar (unit+E2E) · AT-002 aceite/status (unit) · AT-003 chat<2s (realtime) · AT-004 avaliação/média (unit+trigger) · AT-005 unicidade (integration) · AT-006 RLS (integration) · AT-007 filtro cidade (E2E) · AT-008 notificação (realtime).

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Validação (zod) falha | Retorna `{ ok:false, erros }` para o form; mensagem PT-BR | No |
| Duplicidade CPF/telefone/e-mail | Captura violação de UNIQUE → mensagem amigável (AT-005) | No |
| Autorização (guard/RLS) nega | `throw Forbidden`; UI redireciona/mostra aviso | No |
| Falha de rede Supabase | Toast de erro; leitura reexecutável | Sim (leitura) |
| Subscription Realtime cai | Reassina no `useEffect`; fallback polling (A-001) | Sim |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | — | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | — | Chave anon (cliente, RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | string | — | Service-role (somente server actions) |
| `NEXT_PUBLIC_APP_NAME` | string | `MeAjuda Aí` | Nome exibido |

---

## Security Considerations

- RLS habilitada em **todas** as tabelas; escrita só via server action (service-role) com guard explícito.
- PII isolada em `profiles_pii` (RLS: dono + admin); nunca exposta em cards públicos.
- `SUPABASE_SERVICE_ROLE_KEY` jamais no bundle do cliente (só em `lib/supabase/admin.ts`).
- Unicidade CPF/telefone/e-mail por constraint `citext UNIQUE` (não confiar só na app).
- `custom_access_token_hook` com `security definer` e `execute` revogado de anon/authenticated.
- LGPD: coletar o mínimo; PII acessível apenas ao titular e ao admin.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | `lib/observability/logger.ts` (JSON estruturado, padrão das refs) nas server actions |
| Metrics | Contagem básica de eventos (vaga publicada, candidatura, aceite) via logs no protótipo |
| Tracing | N/A no protótipo |

---

## Pipeline Architecture (if applicable)

N/A — aplicação transacional (OLTP), não pipeline de dados/ETL.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-23 | design-agent | Versão inicial a partir de DEFINE_MEAJUDAAI_MVP.md |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_MEAJUDAAI_MVP.md`
