---
adr: "0007"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-26, R-27"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0007 - O dataset tem amplitude; falta densidade e o fim do ano

## Context

O dono disse que os dados de demonstracao estao "bem ruim de forma geral" e
pediu pelo menos 24 meses de historico ate dezembro de 2026 (R-26) com dados
plausiveis (R-27). Antes de refazer, medir: qual e exatamente o defeito?

## Decision

O historico **ja e longo**: 51 horarios entre 2023-10-20 e 2026-09-30, ou seja
**35,3 meses** -- acima dos 24 meses que R-26 pede. O defeito e outro, e sao
dois:

1. **Densidade.** 51 horarios em 35 meses da cerca de 1,4 por mes, para 2
   prestadores. Uma agenda com 1 horario por mes parece vazia em qualquer tela de
   calendario, que e a impressao que o dono relatou.
2. **Fim do ano.** O horario mais recente e 30/09/2026. O dataset **nao alcanca
   dezembro de 2026**, que R-26 exige explicitamente.

## Rejected reading

*"O dono disse que esta ruim, entao falta historico -- e preciso gerar mais anos
para tras."*

Morre na medicao: a amplitude ja supera o pedido em 11 meses. Gerar mais passado
nao mudaria nada na impressao de vazio, porque o problema e a taxa por mes, nao o
alcance. Planejar "mais anos" teria queimado esforco no eixo errado.

## Evidence

```sh
# contra o banco real, somente leitura -- agregacao pela data do slot, nao pelo created_at
node .grounding-tmp.mjs   # script em cvg/brain/notes/2026-09-09-grounding-pass-2.md
```

Observado em 09/09/2026: `agenda_slots.total = 51`; mais antigo `2023-10-20`;
mais recente `2026-09-30`; amplitude `35.3` meses. `servicos.total = 30` no mesmo
periodo, para 2 prestadores.

## Consequences

R-26 esta **parcialmente satisfeito** -- a parte de 24 meses ja passa; o que
falta e estender ate dezembro/2026 e respeitar o teto de 6 meses a frente. O
trabalho real esta em R-27 (densidade e plausibilidade). O Pass 3 deve
dimensionar o esforco por ai, e nao por "gerar historico".

Re-verify when: qualquer reseed do dataset de demonstracao.
