---
leg: swimlane-comissao-leg-02
tech: recebimento
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-12"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-comissao-leg-02-recebimento - onde a praca recebe

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar a praca um lugar de recebimento proprio, separado do PII pessoal - de modo que o Administrador possa cadastra-lo sem esbarrar na politica que restringe a edicao de dado pessoal ao titular (ADR 0006).

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um Administrador na configuracao da praca, quando ele cadastrar a chave de recebimento, entao ela passa a valer para as cobrancas daquela praca.
- Dada uma praca sem chave cadastrada, quando uma cobranca for solicitada, entao a praca emite 0 cobrancas e a interface diz por que.

## Independence

Depende so do dono de praca. Prova-se cadastrando e removendo a chave, sem divida nenhuma existir.

## Consumes / produces

- Consumes: a praca de `swimlane-praca-leg-01`.
- Produces: a chave de recebimento da praca - insumo de `leg-04`.

## Appetite

small - um campo e uma tela de configuracao.

## Yields at Pass 5B (named units, not specified here)

- A chave de recebimento no nivel da praca.
- O caminho degradado quando nao ha chave.

## Re-verify when

As politicas de dado pessoal mudarem (gatilho do ADR 0006).
