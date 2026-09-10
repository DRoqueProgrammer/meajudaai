---
leg: swimlane-jornada-leg-03
tech: isolamento
swimlane: swimlane-jornada
parent: _lane.md
status: proposed
spec_ref: ["R-2", "R-3"]
depends_on: ["swimlane-praca-leg-02", "swimlane-jornada-leg-02"]
type: leg
---

# swimlane-jornada-leg-03-isolamento - praca A nao ve praca B

> Parte da raia **jornada** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Provar a fronteira em toda superficie de uma vez - nao surface a surface, conforme cada raia lembrar - de modo que o requisito de seguranca tenha uma prova unica e re-executavel.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um usuario da praca A, quando percorrer toda superficie que lista pessoas, horarios, servicos ou registros, entao recebe 0 registros da praca B.
- Dada uma requisicao forjada com identificador da praca B, quando chegar ao servidor, entao e recusada em 100% das tentativas.
- Dado o mesmo percurso feito por um usuario legitimo da praca A, quando rodar, entao nenhuma superficie devolve vazio indevidamente.

## Independence

Depende do escopo (`praca leg-02`) e do esqueleto existir para ter o que percorrer. Prova-se com duas pracas populadas.

## Consumes / produces

- Consumes: `leitura-escopada` e a jornada de `leg-02`.
- Produces: a prova de fronteira, re-executavel.

## Appetite

medium - o custo esta em enumerar as superficies, nao em cada uma.

## Yields at Pass 5B (named units, not specified here)

- O inventario das superficies que leem dado de terceiro.
- A prova de isolamento sobre esse inventario.
- A prova de recusa no servidor para identificador de outra praca.

## Re-verify when

Uma superficie nova aparecer sem entrar no inventario.
