---
leg: swimlane-praca-leg-03
tech: cadastro
swimlane: swimlane-praca
parent: _lane.md
status: proposed
spec_ref: ["R-4"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-praca-leg-03-cadastro - a instalacao decide a praca

> Parte da raia **praca** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Fazer o cadastro publico atribuir a praca da propria instalacao a quem se
cadastra, sem oferecer escolha - de modo que a marca da praca e o isolamento
sejam consequencia de onde a pessoa entrou, nao de um campo que ela preenche.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o formulario de cadastro publico, quando ele for exibido, entao o numero
  de campos que pedem praca e 0.
- Dadas duas instalacoes distintas, quando um cadastro se completar em cada uma,
  entao as duas pessoas nascem em pracas distintas.

## Independence

Depende so de `leg-01`. Prova-se com dois cadastros, sem depender do escopo de
leitura de `leg-02` existir.

## Consumes / produces

- Consumes: o dono de praca de `leg-01`; a identidade da instalacao corrente.
- Produces: **`praca-corrente`** - a outra metade do contrato publicado.

## Appetite

small - um ponto de decisao no fluxo de cadastro.

## Yields at Pass 5B (named units, not specified here)

- A resolucao da praca da instalacao corrente.
- A atribuicao dessa praca no cadastro publico.

## Re-verify when

A forma de distinguir instalacoes mudar (resposta de Q3 no PRD da raia).
