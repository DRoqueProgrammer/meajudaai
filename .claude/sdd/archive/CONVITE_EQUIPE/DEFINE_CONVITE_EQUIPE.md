# DEFINE: Convite por Link + Aprovação

> Link compartilhável para o sócio convidar profissionais/outros sócios; ao se cadastrar pelo link o novo usuário fica pendente até o sócio aprovar, quando então entra na equipe.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CONVITE_EQUIPE |
| **Date** | 2026-08-05 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

O sócio não consegue trazer para a equipe quem ainda não tem conta, nem convidar outros sócios, nem controlar quem realmente entra — o convite atual (`convidarMembroAction`) só adiciona usuários já cadastrados, direto e sem aprovação.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Sócio | `admin` / owner do workspace | Convidar funcionários e sócios por um link e aprovar quem entra na equipe |
| Novo usuário (convidado) | ainda sem conta ou usuário existente | Cadastrar-se e pedir entrada na equipe abrindo o link |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Tabela `invite` (token, workspace_id, `role` ∈ {membro, owner}, created_by, `expires_at` 14d, accepted_by/at, aprovado). Sócio (owner) gera o link |
| **MUST** | Rota `/convite/{token}` — visitante abre → cadastra (se sem conta) ou entra (se logado) → marca `accepted_by`; **NÃO** entra em `workspace_members` ainda |
| **MUST** | Aprovação: sócio recebe notificação; ao aprovar, insere `workspace_members(role)`; recusar descarta o convite |
| **MUST** | Pendente = conta normal, mas **não aparece nem atua na equipe** até ser aprovado |
| **MUST** | Papel (funcionário/sócio) escolhido na criação do link |
| **MUST** | Link **expirado** (>14d) não permite entrada |
| **SHOULD** | O convite por e-mail atual (`convidarMembroAction`) permanece como atalho para usuários já existentes |
| **COULD** | Lista de convites pendentes na tela da equipe |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] O sócio gera um link com o papel escolhido; quem abre sem conta se cadastra e fica **pendente** (accepted_by marcado, sem linha em `workspace_members`).
- [ ] Ao **aprovar**, o usuário entra em `workspace_members` com o papel do convite; antes disso **não está** na equipe.
- [ ] Um usuário **pendente** não aparece na lista da equipe nem atua (não publica vaga nem acessa os módulos da equipe).
- [ ] Link com `expires_at` no passado **não** permite aceitar.
- [ ] Recusar um convite descarta-o e o usuário não entra.

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Gerar link | Sócio owner do workspace | Gera um convite escolhendo o papel | Token/link criado com o papel e `expires_at` = agora+14d |
| AT-002 | Aceitar (novo usuário) | Link válido | Visitante sem conta abre e completa o cadastro | Vira **pendente** (accepted_by marcado), sem entrar em `workspace_members` |
| AT-003 | Aceitar (usuário existente) | Link válido | Usuário logado abre o link | Vira pendente, sem re-cadastro |
| AT-004 | Aprovar | Convite pendente | Sócio aprova | O usuário entra em `workspace_members` com o papel do convite |
| AT-005 | Pendente não atua | Usuário aceito, não aprovado | Acessa a equipe/ações | Não aparece na equipe nem atua até ser aprovado |
| AT-006 | Link expirado | Convite com `expires_at` no passado | Alguém tenta aceitar | É recusado |
| AT-007 | Recusar | Convite pendente | Sócio recusa | O convite é descartado; o usuário não entra |

---

## Out of Scope

- Expiry configurável do link (14d fixo).
- Limite de usos por link.
- Revogar/expirar link manualmente.
- Convite por SMS (sem provedor).
- Feature 4 não redefine o cadastro além de forçar o papel via convite.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | `invite` manipulada só por service role (sem policies), como o molde petvarejo `0029_invite.sql` | Aceitar/aprovar no servidor via admin client |
| Technical | Pendente vive no `invite` (não em `workspace_members`) | Não mexe em `is_workspace_member`/RLS já shipada |
| Technical | Rota `/convite/{token}` acessível **sem login** (o convidado pode não ter conta) | O middleware/layout precisa liberar essa rota |
| Technical | Reusar o cadastro existente (`app/(auth)/cadastro`) para o fluxo pós-link | Convite carregado por cookie/param |
| Product/Locale | pt-BR; termo "equipe"; migration via MCP + `database.types.ts` à mão | Copy + tipos |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | Nova rota `app/.../convite/[token]`; `lib/actions/convite.ts` (ou estender `lib/actions/workspace.ts`); `app/(auth)/cadastro` (integração); `components/convidar-form.tsx` (gerar link); `app/(app)/equipe` (aprovação); `supabase/migrations/*` | Portar o `invite` e plugar no cadastro/aprovação |
| **KB Domains** | `supabase` → `rls-policies` | invite via service role; aprovação no servidor |
| **IaC Impact** | New resources | Tabela `invite` (token + índice) |

**Why This Matters:**
- **Location** → Reaproveita o cadastro e a tela da equipe.
- **KB Domains** → invite manipulada por service role, aprovação server-side.
- **IaC Impact** → Migration da tabela `invite` entra no plano.

---

## Data Contract (if applicable)

N/A — feature de produto (onboarding/convite), sem pipelines.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | `invite` manipulada só por service role (sem policies), como petvarejo | Se o cliente precisar ler o convite (preview antes de logar), abrir uma policy de select por token ou ler via rota server admin | [ ] |
| A-002 | Pendente vive no `invite` (accepted, não aprovado); entra em `workspace_members` só na aprovação | Se precisar de "membro pendente" com status, muda a membership | [ ] |
| A-003 | O papel do convite define o `tipo_base` do novo usuário (owner → `admin`, membro → `funcionario`) | Se o convidado já tem conta com outro `tipo_base`, decidir manter ou ajustar | [ ] |
| A-004 | Expiry fixo de 14 dias (molde petvarejo) | Trivial de mudar | [ ] |
| A-005 | O cadastro pós-link reusa `app/(auth)/cadastro`, com o convite em cookie/param | Se o cadastro não aceitar o contexto do convite, adaptar o fluxo | [ ] |

**Note:** Validar A-003 no /design — o mapeamento papel-do-convite ↔ `tipo_base` afeta a criação da conta.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Dor clara sobre o convite atual (só usuário existente, sem aprovação) |
| Users | 3 | Sócio + novo convidado, com dores |
| Goals | 3 | MoSCoW derivado das decisões validadas no brainstorm |
| Success | 3 | Critérios testáveis (pendente não atua, expiry, aprovação) |
| Scope | 3 | Fora-de-escopo explícito (expiry custom, usos, revogar, SMS) |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15**

---

## Open Questions

- **Papel do convite ↔ `tipo_base` do convidado (A-003):** owner → `admin`, membro → `funcionario`. E se o convidado já tem conta com `tipo_base` diferente (ex: um `ajudante` abre um convite de funcionário)? O /design decide (recomendação: o convite força o papel de workspace; o `tipo_base` do usuário existente é decidido no design).
- **Preview do convite** antes de logar ("Você foi convidado para a equipe X") — precisa ler o `invite` sem sessão: policy de select por token OU rota server que lê via admin. O /design decide.

Fora isso: **pronto para Design.**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | define-agent | Versão inicial a partir de BRAINSTORM_CONVITE_EQUIPE.md |
| 1.1 | 2026-08-07 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_CONVITE_EQUIPE.md`
