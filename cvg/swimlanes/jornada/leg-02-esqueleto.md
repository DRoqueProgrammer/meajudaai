---
leg: swimlane-jornada-leg-02
tech: esqueleto
swimlane: swimlane-jornada
parent: _lane.md
status: proposed
spec_ref: ["R-11", "R-16", "R-17"]
depends_on: ["swimlane-praca-leg-01", "swimlane-comissao-leg-03", "swimlane-jornada-leg-01"]
type: leg
---

# swimlane-jornada-leg-02-esqueleto - a jornada inteira, uma vez

> Parte da raia **jornada** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Ligar a jornada de ponta a ponta uma unica vez, com o minimo de cada raia - de modo que o desencontro entre as costuras apareca agora, e nao depois de quatro raias engordadas.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dada uma praca com um prestador e um cliente, quando o cliente agendar, o prestador aceitar e marcar como realizado, entao nasce exatamente 1 divida sem ninguem tocar no banco.
- Dada essa divida, quando o prestador declarar o pagamento e o Administrador confirmar, entao a divida e zerada e a jornada fecha sem intervencao manual.
- Dada a jornada completa, quando ela for percorrida, entao o numero de pontos em que foi preciso editar dado na mao e 0 - a metrica que hoje vale 2.

## Independence

Depende do minimo de praca e comissao, e do limite ja documentado por `leg-01`. Nao depende de nenhuma tela nova de administracao: a confirmacao pode ser feita pela superficie minima.

## Consumes / produces

- Consumes: praca (`leg-01`), aliquota e divida (`comissao leg-01`/`leg-03`), o limite de `leg-01`.
- Produces: **`jornada-verde`** - a prova de que as costuras se conectam.

## Appetite

medium - o valor nao esta no tamanho, esta em ser vertical.

## Yields at Pass 5B (named units, not specified here)

- O percurso ponta a ponta automatizado.
- A medicao dos pontos de intervencao manual.

## Re-verify when

Qualquer contrato entre raias mudar de forma.
