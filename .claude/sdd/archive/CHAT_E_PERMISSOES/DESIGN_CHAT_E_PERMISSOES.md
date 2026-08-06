# DESIGN: Chat Duplo + Permissão Granular por Funcionário

> Design técnico para um motor de conversa único (canal da equipe + DMs internas e externas, em tempo real) com capacidades por funcionário — tudo apoiado em RLS participante-only.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CHAT_E_PERMISSOES |
| **Date** | 2026-08-05 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_CHAT_E_PERMISSOES.md](./DEFINE_CHAT_E_PERMISSOES.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (PWA)                                 │
│                                                                            │
│  components/chat/chat-thread.tsx  ──subscribe(postgres_changes,           │
│     (client, browser Supabase)      table=mensagens, filter=conversa_id)   │
│        │ envia via <form action>            ▲ evento INSERT (ao vivo)      │
│        ▼                                     │                             │
├────────┼─────────────────────────────────────┼────────────────────────────┤
│        │ SERVER ACTIONS ("use server")        │                            │
│  lib/actions/mensagens.ts   ──insert mensagens (client de SESSÃO, RLS on)  │
│  lib/actions/conversas.ts   ──ensure canal/dm_interna/dm_externa           │
│  lib/actions/candidaturas.ts──(aceite) → ensureDmExterna(ws, ajudante)     │
│  lib/auth/modules.ts        ──requireCapability('publicar_vagas'|'chat…')  │
├──────────────────────────────────────────────┼────────────────────────────┤
│                         SUPABASE (Postgres + Realtime)                     │
│                                               │                            │
│   conversas ──1:N── conversa_membros          │  publication               │
│      │  (tipo: canal_equipe|dm_interna|dm_externa, workspace_id,           │
│      │   ajudante_id?, vaga_origem_id?)        │  supabase_realtime         │
│      └──1:N── mensagens (conversa_id, remetente_id, conteudo) ─────────────►│
│                                                                            │
│   RLS (fronteira única de autorização, vale p/ REST *e* realtime):        │
│     is_conversa_membro(c)  ← SECURITY DEFINER                              │
│        = ajudante da dm_externa                                            │
│        OR membro explícito (dm_interna)                                    │
│        OR membro do workspace quando: canal_equipe                         │
│           | dm_externa E (role='owner' OU has_capability('chat_ajudantes'))│
│     has_capability(uid, ws, cap) ← lê user_modules (allowed=true)          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ideia-chave:** uma única RLS (`is_conversa_membro`) entrega três coisas de uma vez — quem vê/escreve na conversa (REST), o que o Realtime pode entregar, e a permissão `chat_ajudantes` (funcionário sem a capacidade não é membro da conversa externa).

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `conversas` / `conversa_membros` (novas tabelas) | Modelo genérico de conversa (canal + DMs) | Postgres (Supabase) |
| `mensagens` (estendida) | Mensagem agora aponta para `conversa_id` | Postgres + Realtime publication |
| `is_conversa_membro` / `has_capability` | Helpers de autorização (SECURITY DEFINER, sem recursão de RLS) | PL/pgSQL |
| `user_modules` (CHECK estendido) | Guarda capacidades `publicar_vagas` / `chat_ajudantes` | Postgres |
| `lib/actions/conversas.ts` | Find-or-create de canal/DM interna/DM externa | Next.js Server Actions |
| `lib/actions/mensagens.ts` (refactor) | Enviar mensagem por `conversa_id` | Server Actions (client de sessão, RLS) |
| `lib/auth/modules.ts` (+capacidades) | `getAllowedCapabilities` + `requireCapability` | TypeScript |
| `components/chat/chat-thread.tsx` (refactor) | Thread realtime por `conversa_id` | React client + Supabase Realtime |
| `components/modulos-funcionario.tsx` (+chips) | Toggle das capacidades pelo sócio | React client |

---

## Key Decisions

### Decision 1: Um motor de conversa único (generalizar `mensagens`)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** `mensagens` hoje é presa a `vaga_id` + `destinatario_id` (par fixo). O DEFINE pede canal de grupo, DM interna e DM externa persistente entre diárias.

**Choice:** Criar `conversas` (+ `conversa_membros`) e adicionar `mensagens.conversa_id`. `vaga_id`/`destinatario_id` em `mensagens` viram nullable (legado); a origem da conversa externa fica em `conversas.vaga_origem_id`.

**Rationale:** Um só caminho de código/RLS para os três tipos de chat; o chat de vaga atual vira um caso de `dm_externa`. Reaproveita o `chat-thread.tsx` e o Realtime já existentes.

**Alternatives Rejected:**
1. Dois sistemas separados (chat de vaga + chat interno novo) — duplica lógica e RLS (era a Abordagem B do brainstorm).
2. Tabela de mensagem nova do zero — descartar o Realtime/os componentes que já funcionam.

**Consequences:**
- Migration com backfill das mensagens atuais para conversas `dm_externa`.
- Ganho: uma RLS, um componente, um fluxo.

---

### Decision 2: `chat_ajudantes` é aplicada DENTRO da RLS de conversa

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** A feature 2 exige que só funcionários liberados falem com ajudantes; o requisito transversal exige que ninguém leia conversa alheia (anti-IDOR), inclusive via Realtime.

**Choice:** O lado-equipe de uma `dm_externa` **não** é materializado em `conversa_membros`; é derivado de `workspace_members` dentro de `is_conversa_membro`: `role='owner'` (sócio) sempre, `membro` só com `has_capability(chat_ajudantes)`. O ajudante é o único membro "externo" (via `conversas.ajudante_id`).

**Rationale:** Uma única checagem resolve leitura REST, entrega Realtime e a permissão da feature 2. Revogar `chat_ajudantes` remove o acesso na hora, sem sincronizar linhas de participante. Satisfaz AT-006, AT-007 e AT-008 no banco.

**Alternatives Rejected:**
1. Materializar cada funcionário como membro e sincronizar ao ligar/desligar a capacidade — bookkeeping frágil, janela de inconsistência.
2. Checar a capacidade só na server action — deixaria o Realtime/REST desprotegidos contra acesso direto.

**Consequences:**
- `is_conversa_membro` faz um `join` em `workspace_members`/`user_modules` (indexados) — custo por linha aceitável no protótipo.
- `publicar_vagas` (que não é sobre conversa) continua sendo guard de action (`requireCapability`).

---

### Decision 3: Realtime continua em `postgres_changes` + RLS (não private channels)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O DEFINE (A-001) pede validar se o Realtime respeita RLS. O KB `supabase/realtime` alerta que `postgres_changes` mal configurado entrega linhas sem RLS. O chat atual já usa `postgres_changes` com `mensagens` sob RLS.

**Choice:** Manter `postgres_changes` na `mensagens` (já na publication), com a nova RLS `is_conversa_membro`. O cliente autenticado só recebe as linhas que pode `SELECT`. **Verificação obrigatória no build** (ver Testing) com um usuário não-membro tentando subscrever.

**Rationale:** É o padrão que o app já usa e prova; menor superfície. RLS-first protege REST e Realtime com a mesma policy.

**Alternatives Rejected:**
1. Private channels + `realtime.messages` authorization — mais infra; guardado como hardening se a verificação do build falhar.
2. Broadcast manual — perde a persistência e reintroduz autorização no app.

**Consequences:**
- Depende de RLS estar habilitada (o modo de falha que o KB descreve). O teste de isolamento no build é o gate.
- Se a verificação falhar, plano B documentado (private channels).

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0013_conversas_e_capacidades.sql` | Create | Tabelas `conversas`/`conversa_membros`; helpers `is_conversa_membro`/`has_capability`; RLS; `ALTER publication`; `ALTER user_modules` CHECK (+capacidades); `ALTER mensagens` (+`conversa_id`, nullables); backfill; seed do canal da equipe | @agentspec:cloud:supabase-specialist | None |
| 2 | `lib/supabase/database.types.ts` | Modify | Tipos de `conversas`/`conversa_membros`, colunas novas de `mensagens`, chaves de capacidade | @agentspec:cloud:supabase-specialist | 1 |
| 3 | `lib/modules.ts` | Modify | `AppCapability`, `CAPABILITIES`, `isCapability`, labels | (general) | None |
| 4 | `lib/auth/modules.ts` | Modify | `getAllowedCapabilities(user, ws)`, `requireCapability(cap)` (default OFF) | (general) | 3 |
| 5 | `lib/actions/modules.ts` | Modify | `setModuloFuncionarioAction` aceita chave de capacidade (valida `isCapability`) | (general) | 3,4 |
| 6 | `lib/actions/conversas.ts` | Create | `ensureCanalEquipe(ws)`, `ensureDmInterna(a,b,ws)`, `ensureDmExterna(ws,ajudante)`, `listMinhasConversas()` | @agentspec:cloud:supabase-specialist | 1,2 |
| 7 | `lib/validation.ts` | Modify | `MensagemSchema`: `conversaId` no lugar de `vagaId`/`destinatarioId` | (general) | None |
| 8 | `lib/actions/mensagens.ts` | Modify | `enviarMensagemAction(conversaId, conteudo)`; insert com `conversa_id`; notifica os outros membros | (general) | 1,7 |
| 9 | `lib/actions/candidaturas.ts` | Modify | `responderCandidaturaAction`: no aceite, `ensureDmExterna` e link da notificação → `/chat/{conversaId}` | (general) | 6 |
| 10 | `lib/actions/leitura.ts` | Modify | Marcar lido por `conversa_id` (`conversa_membros.lido_ate`) | (general) | 1 |
| 11 | `components/chat/chat-thread.tsx` | Modify | `conversaId` no lugar de `vagaId`; filtro Realtime `conversa_id`; remove `destinatarioId` | (general) | 8 |
| 12 | `app/(app)/chat/[conversaId]/page.tsx` | Create (renomeia `[vagaId]`) | Carrega conversa + mensagens + valida membership; renderiza a thread | (general) | 6,11 |
| 13 | `app/(app)/mensagens/page.tsx` | Modify | Caixa de entrada lista canal da equipe + DMs internas + DMs externas | (general) | 6 |
| 14 | `components/modulos-funcionario.tsx` | Modify | Renderiza os chips das capacidades junto dos módulos | (general) | 3,5 |
| 15 | `lib/actions/vagas.ts` | Modify | `publicarVagaAction`: `requireCapability('publicar_vagas')` (para funcionário) | (general) | 4 |
| 16 | `components/nav.tsx` | Modify | Entrada de "Mensagens/Chat" (equipe + externo) na navegação | (general) | 13 |

**Total Files:** 16 (3 criados, 13 modificados)

---

## Agent Assignment Rationale

> Agentes vêm do registro do plugin (`agentspec:*`). O Build invoca o especialista casado.

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1, 2, 6 | Migrations, RLS, Realtime e acesso vivo ao Supabase via MCP — o núcleo de banco/segurança |
| (general) | 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 | Next.js App Router + React + TypeScript (server actions, componentes). Não há especialista de TS/React no registro; o Build cuida diretamente seguindo os padrões do repo |

**Agent Discovery:**
- Registro consultado: agentes `agentspec:*` disponíveis na sessão.
- Casamento por: tipo de arquivo (`.sql`/RLS → supabase-specialist), domínio KB (`supabase`), e ausência de especialista TS/React (→ general).

---

## Code Patterns

### Pattern 1: Migration — tabelas, helpers, RLS, capacidades (0013)

```sql
-- ─── Conversas (canal + DMs) ────────────────────────────────────────────────
create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tipo text not null check (tipo in ('canal_equipe','dm_interna','dm_externa')),
  ajudante_id uuid references auth.users(id) on delete cascade,   -- só dm_externa
  vaga_origem_id uuid references public.vagas(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Singletons: 1 canal por equipe; 1 DM externa por (equipe, ajudante) → persiste entre diárias
create unique index conversas_canal_uniq on public.conversas(workspace_id) where tipo = 'canal_equipe';
create unique index conversas_externa_uniq on public.conversas(workspace_id, ajudante_id) where tipo = 'dm_externa';
create index conversas_ws_idx on public.conversas(workspace_id);

create table public.conversa_membros (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lido_ate timestamptz,
  primary key (conversa_id, user_id)
);
create index conversa_membros_user_idx on public.conversa_membros(user_id);

-- ─── mensagens: aponta para conversa; campos de vaga viram legado ───────────
alter table public.mensagens add column conversa_id uuid references public.conversas(id) on delete cascade;
alter table public.mensagens alter column vaga_id drop not null;
alter table public.mensagens alter column destinatario_id drop not null;
create index mensagens_conversa_idx on public.mensagens(conversa_id);

-- ─── Helpers SECURITY DEFINER (não disparam RLS por dentro) ─────────────────
create or replace function public.has_capability(v_user uuid, v_ws uuid, v_cap text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_modules um
    where um.user_id = v_user and um.workspace_id = v_ws
      and um.module = v_cap and um.allowed = true
  )
$$;

create or replace function public.is_conversa_membro(v_conversa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    -- ajudante da DM externa
    exists (select 1 from public.conversas c
            where c.id = v_conversa and c.ajudante_id = auth.uid())
    -- membro explícito (DM interna)
    or exists (select 1 from public.conversa_membros cm
               where cm.conversa_id = v_conversa and cm.user_id = auth.uid())
    -- lado-equipe: canal (qualquer membro) | dm_externa (owner OU capacidade)
    or exists (
      select 1 from public.conversas c
      join public.workspace_members m on m.workspace_id = c.workspace_id
      where c.id = v_conversa and m.user_id = auth.uid()
        and (
          c.tipo = 'canal_equipe'
          or (c.tipo = 'dm_externa'
              and (m.role = 'owner'
                   or public.has_capability(auth.uid(), c.workspace_id, 'chat_ajudantes')))
        )
    )
$$;

revoke execute on function public.has_capability(uuid,uuid,text) from anon, public;
revoke execute on function public.is_conversa_membro(uuid) from anon, public;
grant execute on function public.has_capability(uuid,uuid,text) to authenticated;
grant execute on function public.is_conversa_membro(uuid) to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.conversas enable row level security;
alter table public.conversa_membros enable row level security;

create policy "conversas_select" on public.conversas for select to authenticated
  using (public.is_conversa_membro(id) or public.current_app_role() = 'sysadmin');

create policy "cmembros_select" on public.conversa_membros for select to authenticated
  using (user_id = auth.uid() or public.is_conversa_membro(conversa_id)
         or public.current_app_role() = 'sysadmin');

-- mensagens: leitura e escrita só para membro da conversa (substitui msg_select_parties / msg_insert_sender)
drop policy if exists "msg_select_parties" on public.mensagens;
drop policy if exists "msg_insert_sender" on public.mensagens;
create policy "msg_select_membro" on public.mensagens for select to authenticated
  using (public.is_conversa_membro(conversa_id) or public.current_app_role() = 'sysadmin');
create policy "msg_insert_membro" on public.mensagens for insert to authenticated
  with check (remetente_id = auth.uid() and public.is_conversa_membro(conversa_id));

-- Realtime: mensagens já está na publication (0003). conversa_id herda a mesma entrega RLS-filtrada.

-- ─── Capacidades no user_modules (estende o CHECK) ──────────────────────────
alter table public.user_modules drop constraint user_modules_module_check;
alter table public.user_modules add constraint user_modules_module_check
  check (module in ('vagas','equipe','financeiro','relatorios','publicar_vagas','chat_ajudantes'));

-- ─── Backfill: cada vaga com mensagens vira uma dm_externa; seed dos canais ──
-- (ver o corpo completo do backfill na migration; resumo:)
--  1. insert conversas(dm_externa) a partir de distinct mensagens.vaga_id + ajudante da candidatura
--  2. update mensagens.conversa_id
--  3. insert conversas(canal_equipe) para cada workspace existente
```

### Pattern 2: Guard de capacidade (TypeScript) — default OFF

```typescript
// lib/auth/modules.ts  (adição)
import type { AppCapability } from "@/lib/modules";

/** Capacidades liberadas ao usuário nesta empresa. Ausência de linha = NEGADO. */
export async function getAllowedCapabilities(
  user: CurrentUser, workspaceId: string,
): Promise<Set<AppCapability>> {
  if (user.role === "sysadmin" || user.role === "admin") {
    return new Set(CAPABILITIES); // sócio/sysadmin sempre
  }
  if (user.role !== "funcionario") return new Set();
  const sb = await createServerClient();
  const { data } = await sb.from("user_modules")
    .select("module, allowed").eq("user_id", user.id).eq("workspace_id", workspaceId);
  return new Set((data ?? [])
    .filter((r) => r.allowed && isCapability(r.module))
    .map((r) => r.module as AppCapability));
}

/** Lança se a capacidade não é permitida (chamar antes de publicar vaga / abrir DM externa). */
export async function requireCapability(cap: AppCapability, workspaceId: string): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = await getAllowedCapabilities(user, workspaceId);
  if (!allowed.has(cap)) throw new Error("Forbidden — capacidade não liberada para o seu perfil");
  return user;
}
```

### Pattern 3: Find-or-create da DM externa (no aceite da candidatura)

```typescript
// lib/actions/conversas.ts
export async function ensureDmExterna(workspaceId: string, ajudanteId: string): Promise<string> {
  const db = createAdminClient(); // service-role: cria a conversa; a RLS protege a leitura depois
  const { data: existente } = await db.from("conversas").select("id")
    .eq("workspace_id", workspaceId).eq("tipo", "dm_externa").eq("ajudante_id", ajudanteId).maybeSingle();
  if (existente) return existente.id; // persiste entre diárias (uma por equipe+ajudante)
  const { data, error } = await db.from("conversas")
    .insert({ workspace_id: workspaceId, tipo: "dm_externa", ajudante_id: ajudanteId })
    .select("id").single();
  if (error?.code === "23505") { // corrida: outro aceite criou agora
    const { data: r } = await db.from("conversas").select("id")
      .eq("workspace_id", workspaceId).eq("tipo", "dm_externa").eq("ajudante_id", ajudanteId).single();
    return r!.id;
  }
  if (error) throw error;
  return data.id;
}
```

### Pattern 4: Subscription Realtime generalizada (client)

```typescript
// components/chat/chat-thread.tsx  (troca de vagaId por conversaId)
useEffect(() => {
  const sb = createBrowserClient();
  const ch = sb.channel(`conversa:${conversaId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` },
      (p) => {
        const nova = p.new as Msg;
        setMsgs((m) => (m.some((x) => x.id === nova.id) ? m : [...m, nova]));
      })
    .subscribe();
  return () => { sb.removeChannel(ch); };
}, [conversaId]);
// A RLS msg_select_membro garante que só membros recebem o INSERT (mesma proteção do REST).
```

---

## Data Flow

```text
ACEITE DE CANDIDATURA → DM EXTERNA
1. Sócio/funcionário aceita candidatura (responderCandidaturaAction)
   │  requireWorkspaceRole(owner|membro)  [+ requireCapability('chat_ajudantes') p/ membro]
   ▼
2. ensureDmExterna(workspace_id, ajudante_id) → conversa_id (find-or-create)
   │
   ▼
3. notificacao(ajudante) link=/chat/{conversa_id}

ENVIO DE MENSAGEM (qualquer tipo)
1. Usuário envia <form action=enviarMensagemAction> {conversaId, conteudo}
   │  client de SESSÃO → insert mensagens{conversa_id, remetente_id=uid, conteudo}
   ▼  RLS msg_insert_membro: só passa se is_conversa_membro(conversa_id)
2. Postgres grava → WAL → publication supabase_realtime
   │
   ▼
3. Cada membro com a thread aberta recebe o INSERT (RLS msg_select_membro filtra) < 2s
   └─ notificacao aos outros membros (via admin client)
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase Postgres | `@supabase/ssr` client de sessão (RLS on) para escrita/leitura de mensagens | Cookie/JWT do usuário |
| Supabase Realtime | WebSocket `postgres_changes` (browser client) | JWT do usuário (RLS por linha) |
| Supabase (admin) | service-role para `ensure*` de conversa e notificações | `SUPABASE_SERVICE_ROLE_KEY` (server-only) |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| RLS isolation | `is_conversa_membro` / `has_capability` — membro vs não-membro, com/sem capacidade | `supabase/tests/rls_conversas.sql` (ou script MCP) | SQL com 2 JWTs (padrão do KB multi-tenant-rls) | AT-007, AT-008, AT-006 |
| Realtime authz | Não-membro subscreve `conversa:{id}` alheia → 0 eventos | verificação manual/script no build | browser client + 2 usuários | AT-004, AT-008 |
| Unit | `getAllowedCapabilities` (default OFF; sócio/sysadmin sempre) | teste ao lado de `lib/auth/modules` | assert simples | AT-005, AT-009 |
| E2E (happy) | Canal, DM interna, aceite→DM externa, envio ao vivo | manual | preview do app | AT-001, AT-002, AT-003 |

Cada teste de aceitação do DEFINE tem uma linha acima. O mínimo obrigatório (Ponytail): o **SQL de isolamento RLS** com dois usuários (membro/não-membro) — é o que falha se a segurança quebrar.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Envio por não-membro (RLS nega insert) | Action retorna "Você não participa desta conversa." | No |
| Capacidade negada (`requireCapability` lança) | Action retorna erro amigável; UI mantém o texto | No |
| Corrida no `ensureDmExterna` (unique 23505) | Captura e re-busca a conversa existente | Sim (1x, determinístico) |
| Conta demo (read-only) | `tryWriter` já barra antes do insert | No |
| Realtime cai/reconecta | Merge por id no `setMsgs` + revalidação no envio (padrão atual) | Auto (WebSocket) |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `conversas.tipo` | enum | — | `canal_equipe` \| `dm_interna` \| `dm_externa` |
| capacidades (`user_modules.module`) | enum | ausente = OFF | `publicar_vagas`, `chat_ajudantes` |
| `FUNCIONARIO_DEFAULT` (módulos painel) | lista | `['vagas']` | inalterado — capacidades são separadas e default OFF |

---

## Security Considerations

- **RLS é a única fronteira de autorização** e vale para REST *e* Realtime — nenhuma checagem só-no-app para leitura de conversa.
- **`chat_ajudantes` embutida na RLS** (Decision 2): revogar a capacidade corta acesso à DM externa imediatamente, inclusive a subscription ao vivo.
- **Escrita com client de sessão** (não service-role) em `mensagens` — a RLS `msg_insert_membro` valida participação; `ensure*` usa admin só para criar a conversa (nunca para ler/escrever mensagem em nome do usuário).
- **Habilitar RLS é o modo de falha do Realtime** (KB): a migration liga RLS nas tabelas novas e o teste de isolamento no build é o gate (Decision 3).
- **Helpers `SECURITY DEFINER` com `search_path=''`** — segue o padrão do repo, evita recursão de RLS e path hijacking.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Erros de action retornam mensagem ao usuário; falhas de insert logadas no server (padrão atual das actions) |
| Metrics | Nenhuma nova no protótipo (COULD: latência de entrega Realtime) |
| Tracing | N/A |

---

## Pipeline Architecture (if applicable)

N/A — feature de produto (mensageria + autorização), sem pipelines de dados.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | design-agent | Versão inicial a partir de DEFINE_CHAT_E_PERMISSOES.md |
| 1.1 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_CHAT_E_PERMISSOES.md` — após aplicar a migration `0013` e verificar ao vivo.
