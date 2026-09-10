---
leg: swimlane-prestador-leg-04
tech: financeiro
swimlane: swimlane-prestador
parent: _lane.md
status: proposed
spec_ref: ["R-24"]
depends_on: ["swimlane-comissao-leg-05"]
type: leg
---

# swimlane-prestador-leg-04-financeiro - o prestador ve o proprio dinheiro

> Parte da raia **prestador** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Mostrar ao prestador, por periodo, o que ele faturou e o que pagou de comissao - de modo que a conta dele com a plataforma seja auditavel por ele mesmo, nao so pelo Administrador.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um periodo, quando o financeiro for aberto, entao o faturamento exibido e igual a soma dos servicos realizados naquele periodo, com diferenca de R$ 0,00.
- Dado o mesmo periodo, quando o financeiro for aberto, entao a comissao exibida e igual a soma das dividas confirmadas naquele periodo, com diferenca de R$ 0,00.

## Independence

Depende de a confirmacao de pagamento existir (`swimlane-comissao-leg-05`). Prova-se com um periodo populado, sem depender de aprovacao nem habilitacao.

## Consumes / produces

- Consumes: servicos realizados; `conta-do-prestador` e o historico de confirmacoes.
- Produces: a visao financeira do prestador.

## Appetite

medium - agregacao por periodo em duas fontes.

## Yields at Pass 5B (named units, not specified here)

- O faturamento por periodo.
- O historico de comissoes pagas.
- A conciliacao visivel entre os dois.

## Re-verify when

A raia comissao mudar o formato do historico de confirmacoes.
