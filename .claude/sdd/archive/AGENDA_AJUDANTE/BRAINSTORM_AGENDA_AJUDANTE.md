# BRAINSTORM: Agenda de Diárias do Ajudante

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AGENDA_AJUDANTE |
| **Date** | 2026-08-05 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Como o ajudante pega diárias em obras diferentes, precisa organizar horários — uma agenda nos moldes da escala de cuidadoras do CareConnect.

**Context Gathered:**
- A agenda **já existe e funciona**: `app/(app)/agenda/page.tsx` lista as diárias **aceitas** do ajudante agrupadas por dia (Próximas/Anteriores), de várias equipes. Ou seja, a feature é **evoluir**, não criar.
- Vagas têm `data_servico` e `hora_inicio`, mas **não têm duração/`hora_fim`** — "conflito" começa como "duas diárias no mesmo dia".
- CareConnect tem `components/escala/escala-calendar.tsx` (molde de calendário) e as tabelas `alocacao`/`plantao`.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | `app/(app)/agenda/page.tsx` (+ componente de calendário client), `supabase/migrations/*` | Evoluir a agenda existente; nova tabela de bloqueios |
| Relevant KB Domains | `supabase` → `rls-policies` | Bloqueios são do próprio ajudante (RLS por `auth.uid()`) |
| IaC Patterns | Migration: `bloqueio_agenda`; `database.types.ts` à mão | Calendário é UI client (Leaflet não; calendário próprio/molde) |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | A agenda-lista já existe; o que falta nela? | **(a+b+c)** Calendário + aviso de conflito + blocos de disponibilidade | Três incrementos sobre a lista atual |
| 2 | (sub) Como definir "conflito" sem hora de término? | Mesmo **dia** com 2+ diárias aceitas | Refinar com hora se `hora_fim` for adicionada |
| 3 | (sub) O que o bloco de disponibilidade faz? | Marca dias indisponíveis e **avisa** se o ajudante aceitar diária num dia bloqueado | Bloco é organização pessoal + alerta, não trava |

**Minimum Questions:** 3 → atingido.

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Related code (reuso) | `app/(app)/agenda/page.tsx`, `candidaturas`, `vagas` | 3 | A agenda-lista a evoluir |
| Referência de padrão | `refs/careconnect/components/escala/escala-calendar.tsx` | 1 | Molde de calendário mensal |

**How samples will be used:**
- Reaproveitar a query de diárias aceitas da agenda atual.
- Portar o layout de calendário do CareConnect para a visão mensal.

---

## Approaches Explored

### Approach A: Evoluir a `/agenda` (calendário + conflito + bloqueios) ⭐ Recommended

**Description:**
- **Calendário (mês)** como client component (molde `escala-calendar.tsx`); toggle entre lista (atual) e calendário.
- **Conflito:** destacar dias com 2+ diárias aceitas (double-booked). Sem `hora_fim`, conflito = mesmo dia.
- **Blocos:** `bloqueio_agenda` (ajudante_id, data, motivo?). O ajudante marca dias indisponíveis; a agenda mostra e avisa se ele aceitar diária num dia bloqueado.

**Pros:**
- Reusa a agenda + a query que já existem; nova tabela pequena e isolada (RLS por dono).
- Atende os três pedidos (a+b+c) sobre uma base pronta.

**Cons:**
- Calendário é UI nova (client) — cuidado com hidratação (ver [[meajudaai-hmr-hydration]]).

**Why Recommended:** Molde de codebase (agenda existente) + molde do CareConnect (calendário) + KB `rls-policies` para os bloqueios do próprio ajudante.

### Approach B: Só a visão de calendário

**Description:** Adicionar apenas o calendário mensal, sem conflito nem bloqueios.

**Pros / Cons:** Menor esforço · não atende o que o usuário pediu (os três juntos).

**Why not recommended:** O usuário escolheu explicitamente a+b+c.

---

## Data Engineering Context (if applicable)

N/A — feature de produto (agenda/calendário), sem pipelines.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A |
| **User Confirmation** | 2026-08-05 — "pode fechar" |
| **Reasoning** | Evolui a base pronta; atende os três incrementos; bloqueios isolados por RLS de dono |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Calendário mensal (client) + toggle com a lista atual | Molde CareConnect; preserva a lista | Substituir a lista pelo calendário |
| 2 | Conflito = 2+ diárias aceitas no mesmo dia | Vaga não tem `hora_fim` | Conflito por sobreposição de horário |
| 3 | `bloqueio_agenda` (dias indisponíveis) avisa, não trava | Organização pessoal + alerta | Bloqueio que impede aceitar diária |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Sync com Google Calendar / iCal | Fora do núcleo do protótipo | Yes |
| Push/lembrete de diária | `notificacoes` in-app já existe | Yes |
| Recorrência de bloqueios (ex: todo domingo) | Bloco por dia basta | Yes |
| Conflito por sobreposição de horário | Depende de `hora_fim` na vaga | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| O que falta na agenda | ✅ | a+b+c | No |
| Definição de conflito / efeito do bloco | ✅ | Mesmo dia / avisa | No |
| Abordagem A | ✅ | "pode fechar" | No |

**Minimum Validations:** 2 → atingido (3).

---

## Suggested Requirements for /define

### Problem Statement (Draft)
A agenda do ajudante hoje é só uma lista de diárias aceitas — falta uma visão de calendário, um aviso quando ele fica com duas diárias no mesmo dia, e um jeito de marcar dias em que não pode trabalhar.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Ajudante | Organizar diárias de várias obras, ver conflitos e marcar indisponibilidade |

### Success Criteria (Draft)
- [ ] O ajudante alterna entre lista e calendário mensal das diárias aceitas.
- [ ] Dias com 2+ diárias aceitas aparecem sinalizados como conflito.
- [ ] O ajudante marca dias indisponíveis; aceitar diária num dia bloqueado gera aviso.

### Constraints Identified
- Vaga sem `hora_fim` → conflito por dia; pt-BR; migration via MCP.
- Bloqueios visíveis só ao próprio ajudante (RLS por `auth.uid()`).
- Calendário client — atenção à hidratação.

### Out of Scope (Confirmed)
- Itens YAGNI acima (sync externo, push, recorrência, conflito por horário).

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 3 |
| Approaches Explored | 2 |
| Features Removed (YAGNI) | 4 |
| Validations Completed | 3 |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_AGENDA_AJUDANTE.md`
