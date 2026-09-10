---
leg: swimlane-prestador-leg-05
tech: recibo
swimlane: swimlane-prestador
parent: _lane.md
status: proposed
spec_ref: ["R-23"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-prestador-leg-05-recibo - recibo do servico realizado

> Parte da raia **prestador** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Emitir o recibo de um servico realizado, valido com ou sem assinatura enviada pelo prestador - de modo que ele possa entregar comprovante ao cliente sem depender de nada externo.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um servico realizado, quando o recibo for emitido, entao ele traz os 5 campos obrigatorios: nome, funcao, servico, data e valor final.
- Dado um prestador sem assinatura enviada, quando o recibo for emitido, entao ele sai valido do mesmo jeito, apenas sem a assinatura.

## Independence

Depende so do dono de praca e de um servico realizado existir. Nao precisa de comissao nenhuma.

## Consumes / produces

- Consumes: o servico realizado e seu valor final (ADR 0005).
- Produces: o recibo.

## Appetite

medium - emissao mais o envio opcional de assinatura.

## Yields at Pass 5B (named units, not specified here)

- O recibo do servico com os 5 campos.
- O envio opcional de assinatura pelo prestador.
- A emissao valida sem assinatura.

## Re-verify when

O que conta como valor final mudar (gatilho do ADR 0005).
