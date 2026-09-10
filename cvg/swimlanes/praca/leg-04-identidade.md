---
leg: swimlane-praca-leg-04
tech: identidade
swimlane: swimlane-praca
parent: _lane.md
status: proposed
spec_ref: ["R-32"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-praca-leg-04-identidade - cada praca com nome e rosto proprios

> Parte da raia **praca** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar a cada praca uma identidade visual propria - escolhida entre os icones
aprovados ou enviada pelo Administrador - de modo que Niteroi e Maceio pareçam
produtos diferentes para quem os usa.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um Administrador na configuracao da praca, quando ele escolher entre os 2
  icones aprovados, entao a escolha passa a valer nas superficies daquela praca.
- Dado um logo proprio enviado, quando o Administrador o remover, entao a praca
  volta exatamente ao icone escolhido antes, em 100% dos casos.

## Independence

Depende so de `leg-01`. Nao precisa do escopo de leitura: identidade e atributo
da praca, nao consulta escopada.

## Consumes / produces

- Consumes: a praca de `leg-01`.
- Produces: a identidade visual por praca, consumida pelas superficies.

## Appetite

small - prioridade `could` no spec; ultimo da raia.

## Yields at Pass 5B (named units, not specified here)

- A escolha de icone da praca.
- O envio e a remocao de logo proprio.

## Re-verify when

GAP-007 for respondido (se o SysAdmin tambem define a identidade fora de praca).
