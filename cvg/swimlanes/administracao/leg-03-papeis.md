---
leg: swimlane-administracao-leg-03
tech: papeis
swimlane: swimlane-administracao
parent: _lane.md
status: proposed
spec_ref: ["R-30"]
depends_on: ["swimlane-praca-leg-02"]
type: leg
---

# swimlane-administracao-leg-03-papeis - papeis alem de funcionario

> Parte da raia **administracao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Deixar o Administrador criar papeis proprios alem de funcionario e escolher, no ato da criacao, quais modulos aquele papel enxerga - de modo que o convite ja saia com a permissao certa.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um papel novo criado, quando ele nascer, entao tem 0 modulos habilitados por padrao.
- Dada uma pessoa nesse papel, quando ela pedir um modulo nao concedido, entao e recusada no servidor, nao apenas escondida do menu.

## Independence

Depende do escopo de leitura. Prova-se criando um papel e tentando a rota, sem depender das telas de painel.

## Consumes / produces

- Consumes: `praca-corrente`; o mecanismo de modulo que ja existe.
- Produces: nada - raia terminal.

## Appetite

medium - depende de a lista de modulos ser fechada (Q2 do PRD).

## Yields at Pass 5B (named units, not specified here)

- A criacao de papel customizado por praca.
- A selecao de modulos no ato da criacao.
- A recusa no servidor para modulo nao concedido.

## Re-verify when

A lista de modulos do ROADMAP §4 ser fechada.
