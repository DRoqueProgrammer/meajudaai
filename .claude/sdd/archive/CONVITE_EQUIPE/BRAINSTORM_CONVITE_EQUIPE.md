# BRAINSTORM: Convite por Link + Aprovação

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CONVITE_EQUIPE |
| **Date** | 2026-08-05 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Um link compartilhável para o sócio convidar profissionais e/ou outros sócios a se cadastrarem; ao finalizar o cadastro, o novo usuário entra na equipe de quem enviou o convite — mas só depois de o sócio **aprovar** (notificação de aprovação).

**Context Gathered:**
- Hoje `convidarMembroAction` (`lib/actions/workspace.ts`) adiciona um usuário **já existente** por e-mail, **direto como `membro`, sem aprovação**; não convida quem não tem conta nem convida sócio.
- `refs/petvarejo/supabase/migrations/0029_invite.sql` é o molde: tabela `invite` (token, email opcional, kind, tenant, role, `expires_at` 14d, accepted_by), manipulada só por service role (RLS on, sem policies).
- `workspace_members` tem `role owner|membro`; helpers `is_workspace_member`/`requireWorkspaceRole`; `notificacoes` existe; cadastro em `app/(auth)/cadastro`.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | `lib/actions/workspace.ts`, `app/(auth)/cadastro`, nova rota `app/(app)/convite/[token]` (ou `/c/[token]`), `components/convidar-form.tsx`, `app/(app)/equipe`, `supabase/migrations/*` | Portar o `invite` e plugar no fluxo de cadastro/aprovação |
| Relevant KB Domains | `supabase` → `rls-policies` | Convite manipulado por service role; aprovação no servidor |
| IaC Patterns | Migration nova (`invite`) via conector MCP; `database.types.ts` à mão | Tabela + índice de token |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | O link é compartilhável, por e-mail, ou os dois? | **(a) Compartilhável** — papel escolhido na criação; pendente + aprovação | Molde `invite` sem amarrar e-mail; aprovação protege contra link repassado |
| 2 | Como o novo usuário fica enquanto **pendente**? | **(a)** Conta normal, mas **não aparece/atua na equipe** até ser aprovado | Pendente fica no `invite` (aceito), não em `workspace_members` — helpers/RLS intactos |

**Minimum Questions:** 3 → 2 perguntas + forte grounding no código existente (o convite já existe parcialmente).

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Related code (reuso) | `lib/actions/workspace.ts` (`convidarMembroAction`), `components/convidar-form.tsx`, `app/(auth)/cadastro`, `workspace_members` | 4 | Convite e cadastro a evoluir |
| Referência de padrão | `refs/petvarejo/supabase/migrations/0029_invite.sql` | 1 | Tabela `invite` (token/role/expiry) |

**How samples will be used:**
- Portar a tabela `invite` do petvarejo e adaptar ao modelo `workspace_members`.
- Reaproveitar o cadastro existente para o fluxo pós-link.

---

## Approaches Explored

### Approach A: Tabela `invite` (petvarejo) + fluxo de aprovação ⭐ Recommended

**Description:**
- `invite` (token, workspace_id, `role` ∈ {membro, owner}, created_by, `expires_at` 14d, accepted_by, accepted_at). Sócio (owner) gera o link `/convite/{token}` já com o papel.
- Visitante abre o link → se não logado, cadastra (fluxo existente); se logado, direto → marca `accepted_by`. **Não entra em `workspace_members` ainda.**
- Sócio recebe notificação → na `/equipe`, aprova (ou recusa) → aí insere `workspace_members(role)` e marca o convite consumido.
- O `convidarMembroAction` atual (add por e-mail de quem já tem conta) permanece como atalho para usuários existentes.

**Pros:**
- Molde pronto no petvarejo; não toca em `is_workspace_member`/RLS (pendente vive no `invite`).
- Aprovação limpa contra link repassado; papel (funcionário/sócio) resolvido no convite.

**Cons:**
- Nova tabela + rota de convite + tela de aprovação.

**Why Recommended:** KB `rls-policies` + molde de codebase (petvarejo) + reuso do cadastro. Mantém a engrenagem de membership (recém-endurecida na feature CHAT_E_PERMISSOES) intocada.

### Approach B: Estender o convite-por-e-mail para criar contas

**Description:** Manter o fluxo por e-mail e, se o e-mail não tiver conta, disparar um convite de cadastro.

**Pros / Cons:** Reusa a UI atual · **não entrega link compartilhável** e mistura criação de conta com o add direto.

**Why not recommended:** Não atende o "link compartilhável" e o add-direto atual não tem aprovação.

---

## Data Engineering Context (if applicable)

N/A — feature de produto (convite/onboarding), sem pipelines.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-08-05 — "pode fechar" |
| **Reasoning** | Molde pronto; pendente isolado no `invite`; não mexe na RLS/membership shipada |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Link compartilhável com token, sem e-mail amarrado | Pergunta 1 (a) | Link por e-mail |
| 2 | Papel (`membro`/`owner`) escolhido na criação do link | Convida funcionário ou sócio | Papel decidido na aprovação |
| 3 | Pendente fica no `invite` (accepted, não aprovado); entra em `workspace_members` só na aprovação | Não mexe em membership/RLS | Inserir membro pendente com `status` |
| 4 | Expiry fixo de 14 dias (molde petvarejo) | Simples | Expiry configurável |
| 5 | `convidarMembroAction` atual vira atalho p/ usuários existentes | Reuso, sem retrabalho | Remover o fluxo por e-mail |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Expiry configurável do link | 14d fixo basta | Yes |
| Limite de usos por link | Aprovação já filtra | Yes |
| Revogar/expirar link manualmente | Fora do núcleo | Yes |
| Convite por SMS | Sem provedor SMS no protótipo | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Modelo do link (compartilhável) | ✅ | (a) | No |
| Comportamento do pendente | ✅ | (a) | No |
| Abordagem A | ✅ | "pode fechar" | No |

**Minimum Validations:** 2 → atingido (3).

---

## Suggested Requirements for /define

### Problem Statement (Draft)
O sócio não consegue trazer para a equipe quem ainda não tem conta, nem convidar outros sócios, nem controlar quem realmente entra — o convite atual só adiciona usuários já cadastrados, direto e sem aprovação.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Sócio (`admin`/owner) | Convidar funcionários e sócios por um link e aprovar quem entra |
| Novo usuário (convidado) | Cadastrar-se e pedir entrada na equipe pelo link |

### Success Criteria (Draft)
- [ ] Sócio gera um link com o papel escolhido; quem abre se cadastra e fica pendente.
- [ ] Sócio aprova/recusa; só após aprovar o usuário entra em `workspace_members`.
- [ ] Link expirado (14d) não permite entrada.
- [ ] Um usuário pendente não aparece nem atua na equipe.

### Constraints Identified
- Convite manipulado por service role (sem policies na `invite`), como no molde petvarejo.
- pt-BR; termo "equipe"; migration via MCP + `database.types.ts` à mão.

### Out of Scope (Confirmed)
- Itens YAGNI acima (expiry custom, limite de usos, revogar, SMS).

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 2 (+ grounding no código existente) |
| Approaches Explored | 2 |
| Features Removed (YAGNI) | 4 |
| Validations Completed | 3 |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_CONVITE_EQUIPE.md`
