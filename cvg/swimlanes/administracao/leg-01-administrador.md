---
leg: swimlane-administracao-leg-01
tech: administrador
swimlane: swimlane-administracao
parent: _lane.md
status: proposed
spec_ref: ["R-6", "R-7", "R-8"]
depends_on: ["swimlane-praca-leg-02", "swimlane-comissao-leg-05"]
type: leg
---

# swimlane-administracao-leg-01-administrador - a tela de quem opera a praca

> Parte da raia **administracao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar ao Administrador uma tela operacional da praca dele - o que precisa de decisao agora, e o que a praca produziu - em vez da home generica de boas-vindas que ele recebe hoje.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um Administrador autenticado, quando ele entrar, entao cai numa tela do papel dele e nao na home generica.
- Dada essa tela, quando ela abrir, entao exibe 0 cartoes de boas-vindas e leva a pelo menos 3 acoes do papel.
- Dada a agenda da praca, quando exibida, entao a soma dos horarios visiveis e igual a soma dos horarios dos prestadores daquela praca, e 0 de outra.

## Independence

Depende do escopo de leitura e da fila de pendencias existir. Prova-se com um administrador de uma praca com dado.

## Consumes / produces

- Consumes: `praca-corrente`, `conta-do-prestador`, a agenda da praca.
- Produces: nada - raia terminal.

## Appetite

medium - uma tela com quatro blocos e um calendario ja existente.

## Yields at Pass 5B (named units, not specified here)

- O roteamento do Administrador para a tela dele.
- Os indicadores operacionais da praca.
- A agenda completa da praca.
- Os atalhos para pendencias e aprovacoes.

## Re-verify when

Os indicadores mudarem apos o primeiro uso real (Q1 do PRD).
