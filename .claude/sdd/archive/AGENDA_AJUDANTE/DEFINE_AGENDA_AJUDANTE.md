# DEFINE: Agenda de Diárias do Ajudante

> Evoluir a agenda-lista existente do ajudante com visão de calendário, aviso de conflito (mesmo dia) e blocos de disponibilidade.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AGENDA_AJUDANTE |
| **Date** | 2026-08-05 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

A agenda do ajudante hoje é só uma lista de diárias aceitas — falta uma visão de calendário, um aviso quando ele fica com duas diárias no mesmo dia, e um jeito de marcar dias em que não pode trabalhar.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Ajudante | `ajudante` | Organizar diárias de várias obras num calendário, enxergar conflitos de dia e marcar indisponibilidade |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Visão de **calendário (mês)** das diárias aceitas, com toggle para a lista atual (que permanece) |
| **MUST** | **Aviso de conflito**: dias com 2+ diárias aceitas sinalizados |
| **MUST** | **Blocos de disponibilidade** (`bloqueio_agenda`): o ajudante marca/remove dias indisponíveis; visíveis só a ele |
| **MUST** | A agenda sinaliza quando uma diária aceita cai num **dia bloqueado** (conflito diária × bloqueio) |
| **SHOULD** | Aviso ao se **candidatar** a uma vaga cujo dia está bloqueado (antes de comprometer) |
| **SHOULD** | Os blocos aparecem no calendário |
| **COULD** | Cor/etiqueta por categoria no calendário |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] O ajudante alterna entre **lista** e **calendário mensal** das diárias aceitas; cada diária aparece no dia certo.
- [ ] Dias com **2+ diárias aceitas** aparecem sinalizados como conflito (exatamente os dias com ≥2, nem mais nem menos).
- [ ] O ajudante **cria e remove** um bloqueio de dia; ele aparece/some na agenda.
- [ ] Uma diária aceita num dia bloqueado é **sinalizada** como conflito.
- [ ] **0 vazamento**: outro usuário não lê os bloqueios de um ajudante (RLS por `auth.uid()`).

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Calendário | Ajudante com diárias aceitas | Abre a agenda e troca para calendário | Vê as diárias nos dias certos do mês |
| AT-002 | Conflito de dia | Ajudante com 2 diárias aceitas no mesmo dia | Abre a agenda | O dia é sinalizado como conflito |
| AT-003 | Criar bloqueio | Ajudante na agenda | Marca um dia como indisponível | O bloqueio é salvo e aparece na agenda |
| AT-004 | Diária em dia bloqueado | Um dia bloqueado com uma diária aceita | Abre a agenda | O conflito diária × bloqueio é sinalizado |
| AT-005 | Bloqueio privado (anti-IDOR) | Um bloqueio de um ajudante | Outro usuário tenta lê-lo (API/URL direta) | Não recebe (RLS por `auth.uid()`) |
| AT-006 | Remover bloqueio | Um bloqueio existente | O ajudante remove | Some da agenda |

---

## Out of Scope

- Sincronização com Google Calendar / iCal.
- Push / lembrete de diária (o app já tem `notificacoes` in-app).
- Recorrência de bloqueios (ex: todo domingo) — bloco por dia avulso no MVP.
- Conflito por **sobreposição de horário** — depende de `hora_fim` na vaga, que não existe.
- Bloqueio por faixa de **horário** (dia inteiro no MVP).

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | Vaga não tem `hora_fim`/duração | Conflito é por **dia**, não por horário |
| Technical | Blocos são do próprio ajudante | RLS por `auth.uid()` (só o dono lê/escreve) |
| Technical | Calendário é UI client | Atenção à hidratação (dynamic se preciso) |
| Technical | Reusar a query da `/agenda` (candidaturas aceitas → vagas por data) | Não recriar a fonte de dados |
| Product/Locale | pt-BR; migration via conector MCP; `database.types.ts` à mão | Copy + tipos |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `app/(app)/agenda/page.tsx` (evoluir); novo componente de calendário em `components/agenda/*`; `lib/actions/agenda.ts` (CRUD de bloqueio); `supabase/migrations/*`; `database.types.ts` | Evoluir a agenda existente + tabela nova |
| **KB Domains** | `supabase` → `rls-policies` | Bloqueios por dono (`auth.uid()`) |
| **IaC Impact** | New resources | Tabela `bloqueio_agenda`; sem outra infra |

**Why This Matters:**
- **Location** → Reaproveita a `/agenda` e a query de diárias aceitas.
- **KB Domains** → RLS de "só o dono" para os blocos.
- **IaC Impact** → Migration da tabela de bloqueios entra no plano.

---

## Data Contract (if applicable)

N/A — feature de produto (agenda/calendário), sem pipelines.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | "Diárias" da agenda = candidaturas com status `aceito` (fonte atual da `/agenda`) | Se incluir em_andamento/finalizada, a fonte da agenda muda | [ ] |
| A-002 | Conflito por **dia** é suficiente sem `hora_fim` | Se a vaga ganhar `hora_fim`, refina para sobreposição de horário | [ ] |
| A-003 | Bloqueio é por **dia inteiro** (sem faixa de horário) | Se precisar por hora, o schema de `bloqueio_agenda` muda | [ ] |
| A-004 | O aviso de "diária em dia bloqueado" pode ser **client-side** na agenda, sem travar o aceite | Se precisar travar a candidatura, muda o fluxo de candidatura | [ ] |
| A-005 | Um grid de mês próprio resolve o calendário (o app não tem lib de calendário) | Se precisar de lib, avaliar dependência | [ ] |

**Note:** Validar A-001 e A-005 no /design — definem a fonte e o esforço do calendário.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Dor clara sobre uma base que já existe (a lista) |
| Users | 3 | Um usuário (ajudante) com dor definida |
| Goals | 3 | MoSCoW derivado do a+b+c validado no brainstorm |
| Success | 3 | Critérios testáveis (conflito exato, bloqueio privado, criar/remover) |
| Scope | 3 | Fora-de-escopo explícito (sync, push, recorrência, horário) |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15**

---

## Open Questions

- **Onde aparece o aviso de "dia bloqueado":** só na agenda (depois) ou também na tela de **candidatar** (antes de comprometer)? Recomendação: sinalizar na agenda sempre (MUST) e, como SHOULD, avisar na candidatura — sem travar. O /design decide o ponto exato.
- **Fonte da agenda:** confirmar que fica em candidaturas `aceito` (A-001) ou se inclui em_andamento/finalizada.

Fora isso: **pronto para Design.**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | define-agent | Versão inicial a partir de BRAINSTORM_AGENDA_AJUDANTE.md |
| 1.1 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_AGENDA_AJUDANTE.md`
