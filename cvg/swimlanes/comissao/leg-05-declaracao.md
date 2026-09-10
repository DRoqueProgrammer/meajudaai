---
leg: swimlane-comissao-leg-05
tech: declaracao
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-16", "R-17"]
depends_on: ["swimlane-comissao-leg-04"]
type: leg
---

# swimlane-comissao-leg-05-declaracao - declarei que paguei; o admin confirma

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Registrar a declaracao de pagamento do prestador como pendencia para o Administrador, e registrar de forma nao editavel a decisao dele - de modo que exista prova de quem pagou, quanto e quando, sem nenhuma conciliacao automatica (W-2).

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o prestador na cobranca, quando ele declarar o pagamento, entao nasce exatamente 1 pendencia registrando quem, quanto e quando.
- Dada uma pendencia, quando o Administrador confirmar, entao a divida correspondente e zerada e 1 registro imutavel e gravado.
- Dada uma pendencia, quando o Administrador recusar, entao a divida permanece e 1 registro imutavel e gravado.

## Independence

Depende de `leg-04` (a cobranca). Prova-se com um prestador e um administrador, sem inadimplencia envolvida.

## Consumes / produces

- Consumes: a cobranca de `leg-04`.
- Produces: o estado `em dia` do contrato `conta-do-prestador`.

## Appetite

medium - dois atores e um registro imutavel.

## Yields at Pass 5B (named units, not specified here)

- A declaracao de pagamento do prestador.
- A fila de pendencias do Administrador.
- A confirmacao e a recusa, cada uma com registro imutavel.

## Re-verify when

W-2 for revisto e a conciliacao automatica entrar em escopo.
