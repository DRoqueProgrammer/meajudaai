---
leg: swimlane-comissao-leg-03
tech: divida
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-11"]
depends_on: ["swimlane-comissao-leg-01"]
type: leg
---

# swimlane-comissao-leg-03-divida - servico realizado vira divida

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Transformar cada servico que passa a `realizado` numa divida do prestador com a praca, calculada sobre o valor final naquele instante - de modo que o valor cobrado nunca seja um numero que o cliente ainda podia recusar (ADR 0005).

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um servico que passa a realizado, quando a transicao ocorrer, entao nasce exatamente 1 divida, de valor igual ao valor final vezes a aliquota vigente.
- Dado um servico cancelado antes de realizado, quando ele for cancelado, entao a divida gerada e 0 - nao existe estorno.
- Dado um servico renegociado antes de realizado, quando ele virar realizado, entao a divida usa o valor final, nao o original.

## Independence

Depende so de `leg-01` (a aliquota). Prova-se por transicao de status, sem cobranca nem tela.

## Consumes / produces

- Consumes: a aliquota de `leg-01`; o servico e seu valor no instante da transicao.
- Produces: a divida - o objeto central do contrato `conta-do-prestador`.

## Appetite

medium - o calculo e simples; o cuidado esta em amarrar ao instante da transicao.

## Yields at Pass 5B (named units, not specified here)

- A divida de comissao, nascida na transicao para realizado.
- O congelamento do valor final no instante da transicao.

## Re-verify when

O fluxo de renegociacao mudar (gatilho do ADR 0005).
