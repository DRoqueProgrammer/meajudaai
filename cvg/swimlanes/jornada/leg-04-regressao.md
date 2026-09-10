---
leg: swimlane-jornada-leg-04
tech: regressao
swimlane: swimlane-jornada
parent: _lane.md
status: proposed
spec_ref: ["R-28", "R-29"]
depends_on: ["swimlane-jornada-leg-03"]
type: leg
---

# swimlane-jornada-leg-04-regressao - nada que funcionava quebrou

> Parte da raia **jornada** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Provar que a virada para multi-praca nao quebrou nenhum fluxo que ja funcionava, incluindo o subsistema de vagas da v1 que continua ativo (ADR 0008), e confirmar o que o Pass 2 ja mediu sobre o registro de acesso.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o conjunto de fluxos que funcionavam antes da virada, quando forem percorridos depois, entao 100% deles continuam funcionando.
- Dado um login novo pelo formulario, quando ele acontecer, entao produz exatamente 1 registro de acesso - confirmando a medicao do ADR 0000.
- Dadas as telas do fluxo v2, quando revisadas, entao 0 delas descrevem o produto como mural de diarias.

## Independence

Depende de `leg-03`. E o ultimo leg do esqueleto: fecha o steel thread antes das raias engordarem.

## Consumes / produces

- Consumes: a prova de fronteira de `leg-03`; o inventario de rotas ativas.
- Produces: `jornada-verde` completa.

## Appetite

medium - revisao das ~40 rotas ativas.

## Yields at Pass 5B (named units, not specified here)

- O inventario dos fluxos que funcionavam antes.
- A prova de nao-regressao sobre esse inventario.
- A verificacao do registro de acesso.
- A faxina de linguagem da v1 nas telas do fluxo v2.

## Re-verify when

O subsistema de vagas da v1 ser removido (gatilho do ADR 0008).
