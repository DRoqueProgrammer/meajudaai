---
adr: "0005"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-11"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0005 - O valor de um servico e mutavel ate virar realizado

## Context

R-11 diz que a divida de comissao nasce quando o servico vira `realizado` e vale
o **valor final**. Quem planejar precisa saber quando o valor para de mudar -- e
por que o dono escolheu esse instante ("e um evento que confirma Valor").

## Decision

`servicos` carrega **dois** campos de preco: `preco_valor` (o vigente) e
`preco_pendente` (uma renegociacao proposta e ainda nao aceita pelo cliente). O
valor de um servico, portanto, nao e estavel ao longo da vida dele: existe um
estado em que ha duas cifras simultaneas e a que vale depende de um aceite que
ainda nao aconteceu.

Distribuicao real dos 30 servicos da base: 25 `realizado`, 3 `cancelado`, 1
`confirmado`, 1 `pendente`.

## Rejected reading

*"`preco_valor` e o valor do servico, ponto -- a divida pode sair a qualquer
momento."*

Morre pela existencia de `preco_pendente`: emitir a divida enquanto ha proposta
aberta cobraria comissao sobre um valor que o cliente ainda pode recusar. E
exatamente o que a escolha de `realizado` como gatilho evita -- e e por isso que
R-11 nao tem caso de estorno.

## Evidence

```sh
grep -A20 '      servicos: {' lib/supabase/database.types.ts | grep preco
```

Observado: `preco_pendente`, `preco_tipo`, `preco_valor`. Contagem por status em
09/09/2026: realizado 25, cancelado 3, confirmado 1, pendente 1 -- total 30.

## Consequences

"Valor final" em R-11 e `preco_valor` **no instante em que o status vira
realizado** -- nao o valor do aceite, nao o da criacao. O Pass 3 deve amarrar o
calculo a esse instante, e nao a uma leitura posterior do campo, que voltaria a
ser mutavel se o fluxo de renegociacao mudar.

Re-verify when: o fluxo de renegociacao mudar, ou `preco_pendente` sair do
schema.
