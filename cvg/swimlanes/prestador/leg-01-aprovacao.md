---
leg: swimlane-prestador-leg-01
tech: aprovacao
swimlane: swimlane-prestador
parent: _lane.md
status: proposed
spec_ref: ["R-21", "R-22"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-prestador-leg-01-aprovacao - cadastro nasce pendente de aprovacao

> Parte da raia **prestador** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar ao cadastro de um prestador um estado de aprovacao com dono e data, de modo que ninguem apareca para clientes antes de um Administrador da praca dizer que sim.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um cadastro novo de prestador, quando ele for concluido, entao o prestador aparece em 0 buscas de cliente ate ser aprovado.
- Dado um prestador pendente, quando ele acessar o produto, entao ve o proprio estado de aprovacao em 100% dos acessos.
- Dada uma aprovacao, quando o Administrador a registrar, entao ficam gravados quem aprovou e quando.

## Independence

Depende so do dono de praca. Prova-se com um cadastro e um administrador, sem busca nem comissao.

## Consumes / produces

- Consumes: a praca de `swimlane-praca-leg-01`.
- Produces: o estado de aprovacao - metade do insumo de `leg-02`.

## Appetite

medium - schema, tela de fila e tela de estado.

## Yields at Pass 5B (named units, not specified here)

- O estado de aprovacao no cadastro do prestador.
- A fila de aprovacao do Administrador.
- O selo de estado na tela do prestador pendente.

## Re-verify when

W-1 for revisto e a aprovacao por Telegram entrar em escopo.
