# BRAINSTORM: Chat Duplo + Permissão Granular por Funcionário

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CHAT_E_PERMISSOES |
| **Date** | 2026-08-05 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Duas features priorizadas do MeAjuda Aí, tratadas juntas por compartilharem a mesma engrenagem de papéis/permissão:

1. **Chat duplo** — um chat **interno** (sócio ↔ funcionários da própria equipe) e um chat **externo** (sócio ou funcionário ↔ ajudantes contratados).
2. **Permissão granular por funcionário** — o sócio libera individualmente quais funcionários podem (a) **publicar vagas** de diária e (b) **trocar mensagens com ajudantes**, espelhando o mecanismo de "liberação de módulos" já existente.

**Context Gathered:**
- O app **já tem um chat por vaga** (`mensagens`: `vaga_id, remetente_id, destinatario_id, conteudo`) em `app/(app)/chat/[vagaId]`, com a policy `msg_insert_sender` exigindo que remetente e destinatário sejam partes da diária. Na prática, é o embrião do chat externo — mas preso a uma vaga.
- O app **já tem liberação de módulos por funcionário** (`user_modules`: `user_id, module, allowed`) via `lib/auth/modules.ts` (`getAllowedModules`/`requireModule`/`guardModule`) e o toggle de chips em `components/modulos-funcionario.tsx`. É o molde exato da feature 2.
- Papéis vêm de `profiles.tipo_base`: `admin` (=sócio), `funcionario`, `ajudante`, `sysadmin`. Equipe = `workspace_members` (multi-equipe já suportado).
- O chat atual usa **POST + `revalidatePath`** (funciona sem JS); não há realtime hoje. Nenhum dos repos de referência (careconnect, foco-contabil, petvarejo) implementa chat nem realtime — são 100% server-rendered.
- Arquitetura de dois clients já existe: `lib/supabase/server.ts` (RLS) e `lib/supabase/admin.ts` (service-role).

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | `app/(app)/chat/*`, `app/(app)/mensagens`, `lib/actions/mensagens.ts`, `lib/auth/modules.ts`, `lib/modules.ts`, `components/chat/*`, `supabase/migrations/*` | Evoluir o chat e o `user_modules` existentes, não criar do zero |
| Relevant KB Domains | `supabase` → `rls-policies` (0.95), `realtime` (0.95), `multi-tenant-rls` (0.95) | RLS governa entrega do realtime e o anti-IDOR; capacidades por usuário seguem multi-tenant-rls |
| IaC Patterns | Migrations SQL aplicadas via conector Supabase MCP (sem CLI local) | Nova migration numerada + atualizar `lib/supabase/database.types.ts` à mão |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Chat interno (sócio ↔ equipe): canal de grupo, DMs 1-a-1, os dois, ou só sócio↔funcionário? | **(c) Os dois** — canal do grupo + DMs 1-a-1 | Exige modelo de conversa genérico (canal + pares de DM), não a `mensagens` presa a `vaga_id` |
| 2 | Chat externo (sócio/funcionário ↔ ajudante): sempre na vaga, livre, ou nasce na vaga e persiste? | **(c)** Nasce na vaga, vira **DM persistente** ao contratar | Chat externo também precisa de conversa persistente — os dois chats convergem num só motor |
| 3 | O quanto o chat precisa ser "ao vivo"? | **(a) Tempo real** via Supabase Realtime | Client subscription + RLS na subscription; peça inédita nos refs (confiança ~0.85) |
| 4 | Referência para o design + padrão de permissão? | **(a)** careconnect como molde **+ default bloqueado** | careconnect **não tem chat**: serve de molde só para permissões/RLS/estilo. Capacidades default OFF (menor privilégio) |

**Minimum Questions:** 3 → atingido (4 perguntas).

---

## Sample Data Inventory

> Samples improve LLM accuracy through in-context learning and few-shot prompting.

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Input files | N/A | — | Feature de produto, não de dados |
| Output examples | N/A | — | — |
| Ground truth | N/A | — | — |
| Related code (reuso) | `lib/actions/mensagens.ts`, `lib/auth/modules.ts`, `lib/modules.ts`, `components/modulos-funcionario.tsx`, `components/chat/chat-thread.tsx`, `app/(app)/chat/[vagaId]/page.tsx` | 6 | Motor de chat e de permissão a serem **generalizados**, não recriados |
| Referência de padrão | `refs/careconnect` (`lib/auth/modules.ts`, RLS, "Ver como", estilo pt-BR) | 1 | **Sem chat** — molde apenas para permissões, RLS e estilo |

**How samples will be used:**

- Reaproveitar o toggle de chips (`ModulosFuncionario`) e a server action de liberação para as novas capacidades.
- Generalizar `mensagens`/`chat-thread` em vez de escrever um chat novo.
- Seguir a arquitetura de dois clients (RLS + service-role) do careconnect/MeAjuda Aí para as policies.

---

## Approaches Explored

### Approach A: Motor de conversa único + capacidades no `user_modules` ⭐ Recommended

**Description:** Um só modelo de mensagens para os dois chats, e as duas permissões reaproveitando a tabela de liberação que já existe.

- **Conversas** — `conversas` (`id`, `workspace_id`, `tipo`: `canal_equipe` | `dm`, `created_at`) + `conversa_membros` (`conversa_id`, `user_id`, unique par). `mensagens` ganha `conversa_id` (FK); `vaga_id` vira **opcional** (referência de origem). Canal da equipe (1 por workspace, todos os membros), DM interna (par de membros da equipe) e DM externa (par sócio/funcionário ↔ ajudante) são todas linhas de `conversas`.
- **Chat externo** — a DM externa é criada/garantida **quando a candidatura é aceita** (contratação), semeada pelo contexto da vaga; persiste entre diárias.
- **Realtime** — `postgres_changes` em `mensagens` filtrado por participação. A **RLS em `conversa_membros`/`mensagens`** (participante-only) é o que impede escutar conversa alheia — a mesma regra serve o realtime **e** o requisito anti-IDOR.
- **Permissões** — estender `user_modules` com as chaves de **capacidade** `publicar_vagas` e `chat_ajudantes` (separadas dos módulos de painel), **default OFF** para funcionário. Guards `requireCapability('chat_ajudantes')` antes de abrir/enviar em DM externa e `requireCapability('publicar_vagas')` antes de criar vaga. Sócio (`admin`) e `sysadmin` sempre liberados, como já faz `getAllowedModules`.

**Pros:**
- Menor diff: generaliza chat e permissão existentes; UI de liberação reaproveitada.
- Uma RLS resolve realtime + anti-IDOR de uma vez.
- Converge os dois chats, como validado (perguntas 1 e 2).

**Cons:**
- Migration de `mensagens` (adicionar `conversa_id`, popular para as diárias atuais).
- Realtime é peça nova no repo — exige subscription no cliente + cuidado com RLS na subscription.

**Why Recommended:** Casa com KB `multi-tenant-rls`/`rls-policies` (0.95) **e** com o código que já existe (permissões, dois clients). Só o realtime é inédito (KB `realtime` 0.95, sem precedente no repo → ~0.85). Confiança combinada alta.

---

### Approach B: Dois chats separados + tabela de capacidade dedicada

**Description:** Manter o chat de vaga como está e criar um chat interno à parte; criar uma tabela `user_capabilities` separada do `user_modules`.

**Pros:**
- Não mexe na `mensagens` atual.
- Separação conceitual "acesso a painel" vs "capacidade de ação".

**Cons:**
- Duplica lógica de chat (dois motores, duas RLS, duas UIs) — contraria a convergência já validada.
- Sistema de permissão paralelo ao que já funciona (mais código, mais superfície de bug).

**Why not recommended:** Mais código para o mesmo resultado; vai contra a decisão do usuário de que os dois chats são a mesma conversa persistente.

---

## Data Engineering Context (if applicable)

N/A — feature de produto (mensageria + autorização), não envolve pipelines/ETL/analytics.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-08-05 — "pode fechar com a abordagem A" |
| **Reasoning** | Menor diff sobre o que já existe; uma RLS cobre realtime + anti-IDOR; converge os dois chats |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Um motor de conversa (`conversas` + `conversa_membros`) para interno e externo | Os dois chats são conversa persistente (perguntas 1 e 2) | Dois motores separados |
| 2 | `mensagens` ganha `conversa_id`; `vaga_id` opcional | Reaproveita a tabela; preserva o chat de vaga como origem | Tabela de mensagem nova |
| 3 | Realtime via `postgres_changes` com RLS participante-only | Mesma regra serve entrega ao vivo + anti-IDOR | Polling; broadcast sem RLS |
| 4 | Capacidades `publicar_vagas` e `chat_ajudantes` no `user_modules`, default OFF | Espelha a liberação de módulos; menor privilégio | Tabela `user_capabilities` dedicada |
| 5 | Canal da equipe: 1 por workspace, todos os membros; DM interna entre membros | Formato (c) escolhido | Só canal, ou só DM |
| 6 | DM externa criada ao aceitar candidatura | "Nasce na vaga, persiste ao contratar" | Criar DM antes da contratação |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Indicador de "digitando…" | Enfeite; não prova o conceito | Yes |
| Confirmação de leitura ("visto") | Idem | Yes |
| Status online / presença | Idem | Yes |
| Anexos / foto no chat | Texto basta para o MVP (a RLS/estrutura não muda) | Yes |
| Editar / apagar mensagem | Fora do núcleo | Yes |
| Push notification nativo | Já existe `notificacoes` in-app | Yes |
| Grupos arbitrários (além do canal da equipe) | Escopo (c) = canal + DM 1-a-1 | Yes |
| Busca no histórico de conversa | Não bloqueia o conceito | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Formato dos dois chats (descoberta 1–2) | ✅ | Confirmou canal+DM e vaga→DM persistente | No |
| Correção "careconnect não tem chat" + conceito de arquitetura | ✅ | Seguiu com a premissa corrigida | Yes (molde vira "padrões", não "chat") |
| Abordagem A (motor único + capacidades) | ✅ | "pode fechar com a abordagem A" | No |

**Minimum Validations:** 2 → atingido (3).

---

## Suggested Requirements for /define

### Problem Statement (Draft)
O MeAjuda Aí precisa de conversas persistentes em dois contextos — dentro da equipe e com ajudantes contratados — e de um controle, por funcionário, de quem pode publicar vagas e falar com ajudantes, sem que ninguém acesse conversas ou dados fora da sua permissão.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Sócio (`admin`) | Coordenar a equipe e falar com ajudantes; decidir quem da equipe representa a empresa para fora |
| Funcionário | Conversar com a equipe e, se liberado, publicar vagas e falar com ajudantes |
| Ajudante | Conversar com quem o contratou, de forma contínua entre diárias |

### Success Criteria (Draft)
- [ ] Canal da equipe + DMs internas funcionando entre membros do workspace.
- [ ] DM externa criada ao aceitar candidatura e persistente entre diárias.
- [ ] Mensagens novas aparecem ao vivo (realtime) sem recarregar.
- [ ] Funcionário sem `chat_ajudantes` não abre nem envia em DM externa; sem `publicar_vagas` não cria vaga.
- [ ] Um usuário não lê nem "escuta" (realtime) conversa da qual não é membro — verificado por acesso direto à URL/canal.
- [ ] Sócio libera/revoga as duas capacidades no mesmo toggle de chips já existente.

### Constraints Identified
- Next.js App Router + Supabase + TypeScript + Tailwind; migrations via conector MCP; tipos em `database.types.ts` à mão.
- RLS é a fronteira de autorização (inclusive para a subscription de realtime).
- pt-BR; termo de UI "equipe" (não "empresa").
- Sem provedor SMS/serviço externo novo para esta feature.

### Out of Scope (Confirmed)
- Todos os itens da seção YAGNI acima (typing, leitura, presença, anexos, editar/apagar, push nativo, grupos arbitrários, busca).
- Feature 4 (convite por link) — compartilha a engrenagem de papéis, mas é outro documento.

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 4 |
| Approaches Explored | 2 |
| Features Removed (YAGNI) | 8 |
| Validations Completed | 3 |
| Duration | ~1 sessão |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_CHAT_E_PERMISSOES.md`
