---
leg: swimlane-praca-leg-01
tech: coluna
swimlane: swimlane-praca
parent: _lane.md
status: proposed
spec_ref: ["R-1", "R-5"]
depends_on: []
type: leg
---

# swimlane-praca-leg-01-coluna - dono de praca para pessoa e registro

> Parte da raia **praca** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar a toda pessoa dos papeis da v2 e a todo registro do fluxo v2 um dono de
praca, e adotar os registros que ja existem sem dono - de modo que nenhuma
consulta futura precise adivinhar a qual praca uma linha pertence.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o estado atual da base, quando o backfill terminar, entao 0 pessoas dos
  papeis prestador e cliente ficam sem praca (hoje sao 7 orfaos, ADR 0001).
- Dado um servico ou horario qualquer, quando ele for lido, entao a praca dele e
  determinavel sem consultar outra tabela.
- Dada uma pessoa nova criada por qualquer caminho, quando o registro nascer,
  entao ele ja tem praca - nao existe estado intermediario sem dono.

## Independence

Nao depende de nenhum outro leg: e o primeiro do programa inteiro. Prova-se
sozinho por contagem de orfaos antes e depois, sem precisar de tela nova nem de
qualquer regra de leitura.

## Consumes / produces

- Consumes: o estado atual da base (9 pessoas, 1 praca, 51 horarios, 30 servicos).
- Produces: o dono de praca em pessoa, horario e servico - o insumo do qual
  `leg-02` depende para escopar leitura.

## Appetite

medium - toca schema e dados existentes, mas o volume e pequeno (7 orfaos) e a
virada cabe em uma passada.

## Yields at Pass 5B (named units, not specified here)

- A coluna de praca em pessoa, com o backfill dos orfaos.
- A coluna de praca nos registros transacionais (horario e servico).
- A garantia de que registro novo nasce com praca.

## Re-verify when

O ADR 0001 for superado, ou uma tabela nova do fluxo v2 aparecer sem dono de praca.
