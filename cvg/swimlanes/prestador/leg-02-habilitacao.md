---
leg: swimlane-prestador-leg-02
tech: habilitacao
swimlane: swimlane-prestador
parent: _lane.md
status: proposed
spec_ref: ["R-21", "R-18"]
depends_on: ["swimlane-prestador-leg-01", "swimlane-comissao-leg-06"]
type: leg
---

# swimlane-prestador-leg-02-habilitacao - o predicado unico que a busca consome

> Parte da raia **prestador** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Fundir aprovacao e adimplencia num predicado unico - `habilitado` - de modo que a busca do cliente faca uma pergunta so e nao precise conhecer nem a fila de aprovacao nem a regra de divida.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um prestador nao aprovado, quando a busca rodar, entao ele aparece em 0 resultados.
- Dado um prestador aprovado e suspenso por divida, quando a busca rodar, entao ele aparece em 0 resultados.
- Dado um estado de conta desconhecido pela busca, quando o predicado for avaliado, entao o prestador e tratado como nao habilitado - o lado seguro.

## Independence

Depende de `leg-01` e do contrato publicado pela raia comissao. Prova-se pela matriz de 4 combinacoes de aprovacao x adimplencia.

## Consumes / produces

- Consumes: o estado de aprovacao de `leg-01`; `conta-do-prestador` da raia comissao.
- Produces: **`habilitado`** - o contrato publicado desta raia.

## Appetite

small - e uma fusao de dois estados, nao uma regra nova.

## Yields at Pass 5B (named units, not specified here)

- O predicado `habilitado`.
- A adocao do predicado pela busca do cliente.

## Re-verify when

A raia comissao introduzir um estado de conta novo (ver Seam evolution no PRD).
