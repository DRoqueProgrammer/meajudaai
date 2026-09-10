---
leg: swimlane-comissao-leg-06
tech: inadimplencia
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-18", "R-19", "R-20"]
depends_on: ["swimlane-comissao-leg-03"]
type: leg
---

# swimlane-comissao-leg-06-inadimplencia - tres dias e a conta suspende

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Escalar o atraso de forma previsivel - aviso dentro do produto e por e-mail nos dias 1, 2 e 3, suspensao no terceiro - e garantir que a punicao nao caia sobre o cliente, que nao deve nada.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dada uma divida em aberto, quando cada um dos 3 primeiros dias passar, entao sai 1 aviso no produto e 1 por e-mail.
- Dada uma divida em aberto ha 3 dias, quando o terceiro dia fechar, entao a conta e suspensa - nem antes, nem depois.
- Dada uma conta suspensa, quando o prestador acessar, entao ele encontra pelo menos 1 canal acionavel de contato com o Administrador, e 100% dos servicos ja confirmados dele seguem validos para o cliente.

## Independence

Depende so de `leg-03` (a divida). Prova-se manipulando a idade da divida, sem cobranca nem declaracao.

## Consumes / produces

- Consumes: a divida de `leg-03`.
- Produces: os estados `pendente` e `suspensa` do contrato `conta-do-prestador`.

## Appetite

medium - a escala no tempo exige um gatilho periodico.

## Yields at Pass 5B (named units, not specified here)

- Os avisos diarios no produto e por e-mail.
- A suspensao no terceiro dia.
- A tela de suspensao com canal de contato.
- A preservacao dos servicos ja confirmados.

## Re-verify when

GAP-001 for respondido de forma diferente do padrao assumido (acumulo).
