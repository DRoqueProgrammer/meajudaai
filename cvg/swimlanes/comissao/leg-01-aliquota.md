---
leg: swimlane-comissao-leg-01
tech: aliquota
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-9", "R-10"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-comissao-leg-01-aliquota - quanto por cento este servico deve

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Responder, para um servico qualquer, qual percentual e devido a praca - resolvendo deterministicamente os quatro niveis de precedencia e tornando o nivel de categoria possivel, ja que hoje o servico nao carrega categoria (ADR 0004).

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um servico coberto por mais de uma aliquota, quando o percentual for resolvido, entao vence sempre o nivel mais especifico, com resultado identico em 100% das repeticoes.
- Dado um Prestador ou Cliente tentando alterar qualquer aliquota, quando a alteracao chegar ao servidor, entao e recusada em 100% dos casos.
- Dado um servico sem nenhuma aliquota especifica, quando o percentual for resolvido, entao vale a aliquota geral da praca.

## Independence

Depende so do dono de praca. Prova-se por tabela de casos, sem precisar de divida, cobranca ou tela.

## Consumes / produces

- Consumes: a praca de `swimlane-praca-leg-01`; a categoria do prestador.
- Produces: a resolucao de aliquota - insumo de `leg-03`.

## Appetite

medium - quatro niveis mais a categoria no servico, que hoje nao existe.

## Yields at Pass 5B (named units, not specified here)

- A categoria no servico, herdada do prestador na criacao e editavel depois.
- Os quatro niveis de aliquota e a regra de precedencia.
- A restricao de escrita a Administrador e SysAdmin.

## Re-verify when

O ADR 0004 for superado (servico passar a carregar categoria por outro caminho).
