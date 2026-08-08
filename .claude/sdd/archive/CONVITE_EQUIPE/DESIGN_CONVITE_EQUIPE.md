# DESIGN: Convite por Link + Aprovação

> Tabela `invite` (molde petvarejo) com ciclo pendente→aceito→aprovado. O pendente vive no `invite` (nunca em `workspace_members` antes da aprovação), então a RLS de membership já shipada fica intocada. O convite é o mecanismo que cria contas `funcionario`.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CONVITE_EQUIPE |
| **Date** | 2026-08-05 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_CONVITE_EQUIPE.md](./DEFINE_CONVITE_EQUIPE.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  SÓCIO (owner)                     CONVIDADO                    SÓCIO       │
│  ─────────────                     ─────────                    ─────       │
│  criarConviteAction(role)                                                  │
│    → invite(token, role, ws)                                               │
│    → link /convite/{token}  ──compartilha──►                               │
│                                    abre /convite/{token} (rota PÚBLICA)     │
│                                    (server lê o invite via ADMIN por token) │
│                                      ├─ sem conta → cadastro c/ convite     │
│                                      │    tipo_base = f(role); SEM workspace │
│                                      └─ logado → aceitarConviteAction       │
│                                    → invite.status='aceito', accepted_by    │
│                                    → notifica o sócio                       │
│                                                        aprovarConviteAction │
│                                                          → workspace_members │
│                                                             (role do convite)│
│                                                          → status='aprovado' │
│                                                          → notifica convidado│
├──────────────────────────────────────────────────────────────────────────┤
│  SUPABASE: invite (RLS on, SEM policies → só service role)                 │
│  Pendente = status 'aceito' e NÃO está em workspace_members                │
│    → is_workspace_member=false → não aparece/atua na equipe (AT-005 grátis) │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ideia-chave:** o convidado só entra em `workspace_members` na **aprovação**. Antes disso ele é, no máximo, uma conta com um `invite` `aceito` — invisível para a equipe pela própria ausência de membership. Nada de RLS nova de "membro pendente".

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `invite` (nova tabela) | Convite: token, workspace, role, ciclo de status, expiry | Postgres (Supabase), RLS on sem policies |
| `lib/convite-status.ts` | `podeAceitar(invite, agora)` — válido e não expirado (função pura) | TypeScript |
| `lib/actions/convite.ts` | criar / aceitar / aprovar / recusar convite | Next.js Server Actions |
| `lib/actions/auth.ts` (refactor) | `cadastrarAction` ciente de convite (força tipo_base, pula workspace) | Server Action |
| `app/convite/[token]/page.tsx` | Rota **pública**: preview + aceitar/cadastrar | Next.js Server Component |
| `middleware.ts` (edit) | `/convite` em `PUBLIC_PREFIXES` | Next.js middleware |
| `components/convidar-form.tsx` (edit) | Gerar link + seletor de papel | React client |
| `components/convites-pendentes.tsx` | Aprovar/recusar na `/equipe` | React client |

---

## Key Decisions

### Decision 1: Pendente vive no `invite`, entra em `workspace_members` só na aprovação

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O DEFINE exige que o pendente não apareça nem atue na equipe (AT-005), sem mexer na RLS de membership recém-endurecida (chat/mapa dependem de `is_workspace_member`).

**Choice:** Ciclo no `invite`: `pendente` (criado) → `aceito` (convidado aceitou) → `aprovado` (sócio) / `recusado`. `workspace_members` só ganha a linha na aprovação.

**Rationale:** "Pendente" = conta sem membership → `is_workspace_member=false` → invisível para a equipe de graça. Zero RLS nova; a segurança da feature 1/2/3 continua valendo sem ajuste.

**Alternatives Rejected:**
1. `workspace_members` com coluna `status='pendente'` — obrigaria a filtrar pendentes em `is_workspace_member`, `getMyWorkspaces`, e em toda a RLS que já shipamos. Frágil e amplo.

**Consequences:** Uma tabela `invite` com estados; a aprovação faz o insert de membership.

---

### Decision 2: `invite` é service-role only; `/convite` lê via admin no servidor

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O convite precisa ser lido por quem abre o link (talvez sem sessão). Uma policy de SELECT por token não dá: RLS não parametriza o token, e `using(true)` exporia todos os convites.

**Choice:** `invite` com RLS **on e sem policies** (molde petvarejo). A rota `/convite/[token]` é um Server Component que lê o convite pelo token via **admin client** (service role) e mostra o preview. Todas as escritas (criar/aceitar/aprovar) são server actions via admin.

**Rationale:** O **token é a credencial**; quem o tem vê o convite (via servidor), quem não tem não enumera a tabela. Nenhuma linha de `invite` é legível pelo cliente REST.

**Alternatives Rejected:**
1. Policy `for select using (true)` — vazaria todos os convites de todas as equipes.
2. Policy por token — RLS não recebe o token do cliente como parâmetro seguro.

**Consequences:** Toda leitura/escrita de convite passa por código de servidor (admin), nunca pelo cliente.

---

### Decision 3: Papel do convite define o `tipo_base`; convite `membro` cria conta `funcionario`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-05 |

**Context:** O cadastro atual só cria `admin`/`ajudante` e auto-cria uma equipe para `admin`. Não há como nascer `funcionario` — o `convidarMembroAction` só adiciona quem já existe como `membro`, sem mudar `tipo_base`.

**Choice:** No cadastro-com-convite: `role='membro'` → `tipo_base='funcionario'`; `role='owner'` → `tipo_base='admin'`. **Não** auto-cria workspace (o convidado entra na equipe de quem convidou, na aprovação). Usuário já existente que aceita: `tipo_base` intacto; só ganha a membership (com o papel do convite) na aprovação.

**Rationale:** É exatamente o mecanismo que faltava para criar funcionários. O `workspace_members.role` (owner/membro) é o papel de equipe; o `tipo_base` é o papel de conta — o convite alinha os dois para contas novas.

**Alternatives Rejected:**
1. Deixar o convidado escolher o papel no cadastro — contraria "o sócio escolhe o papel do convite".

**Consequences:** `cadastrarAction` ganha um caminho ciente de convite; o form esconde o seletor de papel quando há convite.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0016_convites.sql` | Create | Tabela `invite` (RLS on, sem policies) + índice de token | @agentspec:cloud:supabase-specialist | None |
| 2 | `lib/supabase/database.types.ts` | Modify | Tipos de `invite` | @agentspec:cloud:supabase-specialist | 1 |
| 3 | `lib/convite-status.ts` | Create | `podeAceitar(invite, agora)` (função pura) | (general) | None |
| 4 | `lib/actions/convite.ts` | Create | criar / aceitar / aprovar / recusar convite | (general) | 1,3 |
| 5 | `lib/actions/auth.ts` | Modify | `cadastrarAction` ciente de convite (tipo_base, sem workspace, marca aceito) | (general) | 1,3 |
| 6 | `app/(auth)/cadastro/page.tsx` | Modify | Lê `?convite=token`; carrega o convite (admin) e passa ao form | (general) | 4 |
| 7 | `app/(auth)/cadastro/form.tsx` | Modify | Esconde o seletor de papel quando há convite; hidden `convite_token` | (general) | 6 |
| 8 | `app/convite/[token]/page.tsx` | Create | Rota pública: preview + aceitar (logado) / link de cadastro (sem conta) | (general) | 4 |
| 9 | `middleware.ts` | Modify | `/convite` em `PUBLIC_PREFIXES` | (general) | None |
| 10 | `components/convidar-form.tsx` | Modify | Gerar link de convite + seletor de papel | (general) | 4 |
| 11 | `components/convites-pendentes.tsx` | Create | Aprovar/recusar convites aceitos | (general) | 4 |
| 12 | `app/(app)/equipe/page.tsx` | Modify | Lista convites `aceito` + render de `ConvitesPendentes` | (general) | 4,11 |
| 13 | `tests/rls.test.ts` | Modify | `invite` não é legível pelo cliente (service-role only) | (general) | 1 |
| 14 | `tests/convite-status.test.ts` | Create | Unit de `podeAceitar` (expiry, status) | (general) | 3 |

**Total Files:** 14 (6 criados, 8 modificados)

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @agentspec:cloud:supabase-specialist | 1, 2 | Migration + RLS (service-role only) + acesso vivo via MCP |
| (general) | 3–14 | Next.js/React/TypeScript (actions, rota, cadastro, aprovação) |

---

## Code Patterns

### Pattern 1: Migration — invite (RLS on, sem policies) (0016)

```sql
create table public.invite (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('owner','membro')),
  created_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  status text not null default 'pendente' check (status in ('pendente','aceito','aprovado','recusado')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
create index invite_token_idx on public.invite(token);
create index invite_ws_idx on public.invite(workspace_id, status);
-- RLS on, SEM policies: só o service role (as actions) manipula convites.
alter table public.invite enable row level security;
```

### Pattern 2: Validade do convite (função pura, testável)

```typescript
// lib/convite-status.ts
export interface ConviteMin { status: string; expires_at: string; }
/** Pode ser aceito? Só um convite ainda 'pendente' e não expirado. */
export function podeAceitar(c: ConviteMin, agora: Date): boolean {
  return c.status === "pendente" && new Date(c.expires_at) > agora;
}
```

### Pattern 3: Criar e aprovar (server actions, admin)

```typescript
// lib/actions/convite.ts
export async function criarConviteAction(role: "owner" | "membro"): Promise<{ ok: boolean; link?: string; erro?: string }> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const ws = await getActiveWorkspace();
  if (!ws) return { ok: false, erro: "Você não tem equipe." };
  await requireWorkspaceRole(ws.workspace_id, ["owner"]);
  const db = createAdminClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await db.from("invite").insert({ token, workspace_id: ws.workspace_id, role, created_by: w.user.id });
  if (error) return { ok: false, erro: "Não foi possível gerar o convite." };
  return { ok: true, link: `/convite/${token}` };
}

export async function aprovarConviteAction(inviteId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: inv } = await db.from("invite").select("*").eq("id", inviteId).single();
  if (!inv || inv.status !== "aceito" || !inv.accepted_by) return { ok: false, erro: "Convite inválido." };
  await requireWorkspaceRole(inv.workspace_id, ["owner"]);
  await db.from("workspace_members").insert({ workspace_id: inv.workspace_id, user_id: inv.accepted_by, role: inv.role });
  await db.from("invite").update({ status: "aprovado" }).eq("id", inviteId);
  await db.from("notificacoes").insert({ user_id: inv.accepted_by, tipo: "convite_aprovado", titulo: "Você entrou na equipe", mensagem: "Seu acesso foi aprovado.", link: "/equipe" });
  revalidatePath("/equipe");
  return { ok: true };
}
```

### Pattern 4: Cadastro ciente de convite (trecho de `cadastrarAction`)

```typescript
// Se veio convite_token: força o tipo_base pelo papel do convite e NÃO cria workspace.
const conviteToken = campo(fd, "convite_token");
let tipoBase = d.tipo_base;
let inviteId: string | null = null;
if (conviteToken) {
  const { data: inv } = await admin.from("invite").select("id, role, status, expires_at").eq("token", conviteToken).maybeSingle();
  if (!inv || !podeAceitar(inv, new Date())) return { erro: "Convite inválido ou expirado.", valores: preserva };
  tipoBase = inv.role === "owner" ? "admin" : "funcionario";
  inviteId = inv.id;
}
// ... cria user + profile(tipo_base = tipoBase) ...
if (conviteToken && inviteId) {
  await admin.from("invite").update({ status: "aceito", accepted_by: userId, accepted_at: new Date().toISOString() }).eq("id", inviteId);
  // notifica o sócio (created_by) que há alguém para aprovar
} else if (tipoBase === "admin") {
  // ... auto-cria workspace (comportamento atual) ...
}
```

### Pattern 5: Middleware — liberar /convite

```typescript
// middleware.ts — adicionar à lista
const PUBLIC_PREFIXES = [ "/login", "/cadastro", "/recuperar-senha", "/termos", "/privacidade", "/auth", "/convite", "/_next", "/favicon", "/api/health", "/api/demo" ];
```

---

## Data Flow

```text
GERAR → criarConviteAction(role) → invite(pendente) → link /convite/{token}
ABRIR → /convite/{token} (server, admin lê por token) → preview
  sem conta → /cadastro?convite={token} → cadastrarAction (tipo_base=f(role), sem workspace, invite→aceito)
  logado    → aceitarConviteAction(token) → invite→aceito, accepted_by
  → notifica o sócio
APROVAR → aprovarConviteAction(id) → workspace_members(role) + invite→aprovado + notifica convidado
RECUSAR → recusarConviteAction(id) → invite→recusado
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase (admin) | service role para todo o ciclo do convite + criação de conta | `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase Auth | `admin.auth.admin.createUser` (cadastro via convite) | service role |

Sem serviço externo novo.

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage |
|-----------|-------|-------|-------|----------|
| Unit | `podeAceitar` (pendente/expirado/já aceito) | `tests/convite-status.test.ts` | vitest | AT-006 |
| RLS isolation | `invite` não é legível pelo cliente (service-role only) | `tests/rls.test.ts` | 2 JWTs | Decision 2 |
| Integration | Aprovar insere membership; pendente não é membro | `tests/rls.test.ts` (via admin + client) | 2 JWTs | AT-004, AT-005 |
| E2E (happy) | Gerar link → cadastrar → aprovar → entra na equipe | manual/preview | — | AT-001/002/003/007 |

Teste-âncora (Ponytail): o **unit de `podeAceitar`** (expiry/status) — a regra que barra convite velho.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Token inexistente/expirado | `/convite` mostra "Convite inválido ou expirado" | No |
| Convite já aceito (single-use) | `podeAceitar` = false → recusa novo aceite | No |
| Conta demo tenta gerar/aprovar | `tryWriter` barra | No |
| Aprovar convite não-`aceito` | Action retorna "Convite inválido" | No |
| E-mail já cadastrado no convite-cadastro | Mesma checagem de duplicidade do cadastro atual | No |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `expires_at` | interval | now()+14 dias | Validade do link |
| `invite.role` | enum | — | `owner` (sócio) \| `membro` (funcionário) |
| Uso do link | — | único (single-use) | 1 aceite por convite; para vários, gera vários links |

---

## Security Considerations

- **`invite` é service-role only** (RLS on, sem policies): nenhuma linha legível pelo cliente REST; o token é a credencial, lido só por código de servidor.
- **Pendente não é membro**: sem linha em `workspace_members` → invisível/inerte na equipe até a aprovação (AT-005), sem RLS nova.
- **Só owner gera/aprova**: `requireWorkspaceRole(ws, ["owner"])` em criar e aprovar.
- **Aprovação valida o estado**: só aprova convite `aceito` com `accepted_by`.
- **Rota `/convite` pública mas inerte**: sem token válido, não faz nada; o cadastro-via-convite força o papel (o convidado não escolhe ser sócio).

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Erros de action retornam mensagem; falhas de criação de conta logadas |
| Metrics | Nenhuma nova |
| Tracing | N/A |

---

## Pipeline Architecture (if applicable)

N/A — feature de produto (onboarding/convite), sem pipelines.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | design-agent | Versão inicial a partir de DEFINE_CONVITE_EQUIPE.md |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_CONVITE_EQUIPE.md`
