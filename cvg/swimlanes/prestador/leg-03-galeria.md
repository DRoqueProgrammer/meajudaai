---
leg: swimlane-prestador-leg-03
tech: galeria
swimlane: swimlane-prestador
parent: _lane.md
status: proposed
spec_ref: ["R-31"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-prestador-leg-03-galeria - mais de uma foto no perfil

> Parte da raia **prestador** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Deixar o perfil do prestador mostrar mais de uma foto em carrossel, sem nunca exibir uma secao vazia para quem ainda nao enviou nenhuma.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um prestador com mais de 1 foto, quando o perfil for aberto, entao as fotos aparecem em carrossel.
- Dado um prestador com 0 fotos, quando o perfil for aberto, entao aparecem 0 secoes de foto.

## Independence

Nao depende de nenhum outro leg desta raia. Prova-se com dois perfis.

## Consumes / produces

- Consumes: a praca de `swimlane-praca-leg-01`.
- Produces: o perfil com galeria.

## Appetite

small - prioridade `could`.

## Yields at Pass 5B (named units, not specified here)

- O armazenamento de multiplas fotos por prestador.
- O carrossel no perfil, ausente quando nao ha foto.

## Re-verify when

O perfil publico mudar de estrutura.
