---
leg: swimlane-administracao-leg-04
tech: comentario
swimlane: swimlane-administracao
parent: _lane.md
status: proposed
spec_ref: ["R-25"]
depends_on: ["swimlane-praca-leg-02"]
type: leg
---

# swimlane-administracao-leg-04-comentario - comentario publico chega a quem e do servico

> Parte da raia **administracao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Fazer o comentario que o Administrador marcou como publico aparecer para o cliente e para o prestador daquele servico - a permissao ja existe, falta a exibicao.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um comentario marcado como publico, quando o servico for aberto, entao ele aparece para as 2 partes.
- Dado um comentario nao marcado, quando o servico for aberto, entao ele aparece para 0 das 2 partes.

## Independence

Depende so do escopo de leitura. Prova-se com um servico e dois comentarios.

## Consumes / produces

- Consumes: `praca-corrente`; o comentario e sua marcacao, que ja existem.
- Produces: nada - raia terminal.

## Appetite

small - e exibicao, nao permissao.

## Yields at Pass 5B (named units, not specified here)

- A exibicao do comentario publico nas telas das duas partes.

## Re-verify when

A matriz de visibilidade do ROADMAP §5.2 mudar.
