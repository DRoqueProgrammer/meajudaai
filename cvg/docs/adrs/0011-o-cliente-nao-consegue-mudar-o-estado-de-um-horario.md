---
adr: "0011"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-37, R-54"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0011 — O cliente não consegue mudar o estado de um horário

## Context

O R-37 fala de "horário livre", e o R-54 exige que a reserva continue funcionando. O
fluxo da aplicação supõe que, ao reservar, o horário passa a `pendente`. O planejador
precisa saber quem consegue, de fato, mudar o estado de um horário hoje — porque a regra
nova de nascimento do serviço vai depender desse estado.

## Decision

Só o **prestador dono do horário** muda o estado de `agenda_slots`: a única política de
atualização é `agenda_slots_update_own`, `prestador_id = auth.uid()` em `using` e em
`with check`.

A reserva (`reservarSlotAction`, `lib/actions/agenda-v2.ts:116-121`) tenta marcar o
horário como `pendente` com a sessão do **cliente**. Para o cliente, a política seleciona
0 linhas; a atualização não devolve erro; a action segue como se tivesse marcado. O mesmo
vale para a "devolução" do horário a `livre` quando a inserção do serviço falha (linha
135): também 0 linhas.

Portanto uma reserva feita pela aplicação deixa o horário em `livre`. O que impede duas
reservas do mesmo horário é a unicidade de `servicos.slot_id` (0024, linha 50), não o
estado do horário.

Não existe no banco hoje nenhum serviço nascido de uma reserva pela aplicação: os dois
serviços ativos (1 pendente, 1 confirmado) foram gravados por `scripts/seed-mes-atual.mjs`
com a chave de serviço, que já escreve o horário no estado final.

## Rejected reading

*"Uma corrida entre dois clientes faz o perdedor devolver o horário a `livre`, desfazendo
a reserva do vencedor"* — leitura do parecer 09 (code-reviewer) da vistoria. A devolução é
feita com a sessão do perdedor, que também não passa na política de atualização: ela não
acontece. O defeito real é anterior e maior — a reserva do cliente não marca o horário em
momento nenhum.

## Evidence

```sql
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'agenda_slots';

select s.status as servico, a.status as horario, s.created_at, a.created_at as horario_criado
  from servicos s join agenda_slots a on a.id = s.slot_id
 where s.status in ('pendente', 'confirmado');
```

```sh
sed -n '98,137p' lib/actions/agenda-v2.ts          # update com a sessão do cliente, sem conferir linhas
grep -n "status" scripts/seed-mes-atual.mjs         # o seed grava horário e serviço já no estado final
```

Observado no banco vivo em 10/09/2026:

- políticas de `agenda_slots`: `delete_own` (prestador, só livre), `insert_own`
  (prestador), `select` (livre, dono ou sysadmin), `update_own` (`prestador_id = auth.uid()`)
- os 2 serviços ativos foram criados 200 ms depois dos próprios horários (09/09 21:23:59 e
  21:24:00) — gravação em lote por script, não reserva pela tela

## Consequences

- A regra de nascimento do serviço (R-37) não pode ter como pré-condição um horário que
  o próprio fluxo de reserva nunca consegue marcar; quem move o estado do horário na
  reserva é uma decisão do Pass 5, não um fato dado.
- A correção do parecer 09 sobre a corrida da reserva (Fatia 4) parte deste fato: não há
  "reserva desfeita"; há horário que não sai de `livre`.
- Toda verificação da R-54 no navegador exercita um caminho que a base de exemplo nunca
  exercitou — os serviços ativos vieram de script.

Re-verify when: uma migration nova mudar as políticas de `agenda_slots`, ou a reserva
passar a mudar o horário por outro caminho que não a sessão do cliente.
