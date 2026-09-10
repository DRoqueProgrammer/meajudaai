---
adr: "0017"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-37, R-54"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — registrado no scan do Pass 5 da Fatia 1"
---

# 0017 — Um serviço cancelado continua ocupando o horário

## Context

`cancelarServicoAction` promete, no próprio comentário, que "o slot volta a ficar livre
para outra pessoa reservar". A regra nova de nascimento do serviço (R-37) fala de
"horário livre". O planejador precisa saber se um horário de serviço cancelado pode, de
fato, ser reservado de novo.

## Decision

**Não pode.** `servicos.slot_id` é único na tabela inteira (migration 0024, linha 50),
sem distinguir estado: um serviço `cancelado` continua segurando o horário, e uma nova
reserva desse horário viola a unicidade.

Além disso, a devolução do horário a `livre` no cancelamento
(`lib/actions/agenda-v2.ts:275`) é feita com a sessão de quem cancelou; quando é o
cliente, a política `agenda_slots_update_own` a filtra para 0 linhas (ADR 0011). Os 3
serviços cancelados da base estão sobre horários em `confirmado`.

## Rejected reading

*"Cancelar libera o horário, como diz o comentário."* A liberação só acontece quando
quem cancela é o prestador — e mesmo assim o horário "livre" não aceita uma nova
reserva, porque o serviço cancelado ainda ocupa o `slot_id`.

## Evidence

```sql
select s.status as servico, a.status as horario, count(*)
  from servicos s join agenda_slots a on a.id = s.slot_id
 where s.status = 'cancelado' group by 1, 2;
```

```sh
sed -n '36,50p' supabase/migrations/0024_agenda_v2_slots_servicos.sql   # unique (slot_id)
sed -n '247,279p' lib/actions/agenda-v2.ts                               # cancelar e "liberar" o horário
```

Observado no banco vivo em 10/09/2026: 3 serviços cancelados, todos sobre horários em
`confirmado`.

## Consequences

- Reaproveitar um horário depois de um cancelamento é corretude da agenda — fica na
  Fatia 4, junto com a corrida da reserva e o fuso.
- Na Fatia 1, a regra de nascimento (R-37) não pode supor que um horário `livre` esteja
  sempre desocupado: a unicidade de `slot_id` continua sendo a última trava contra
  reserva dupla.

Re-verify when: a unicidade de `servicos.slot_id` passar a considerar o estado do
serviço, ou o cancelamento passar a liberar o horário por outro caminho.
