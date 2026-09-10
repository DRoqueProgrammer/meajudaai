---
leg: swimlane-comissao-leg-04
tech: cobranca
swimlane: swimlane-comissao
parent: _lane.md
status: proposed
spec_ref: ["R-13", "R-14", "R-15"]
depends_on: ["swimlane-comissao-leg-03", "swimlane-comissao-leg-02", "swimlane-jornada-leg-01"]
type: leg
---

# swimlane-comissao-leg-04-cobranca - a divida do dia vira cobranca

> Parte da raia **comissao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Mostrar ao prestador a aliquota vigente e quanto ele deve no dia, e transformar isso, em um clique, numa cobranca com codigo legivel que carrega nome, data, valor e codigo do projeto no centro.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o prestador na tela dele, quando o dia tiver dividas, entao o total exibido e igual a soma delas, com diferenca de R$ 0,00.
- Dado o total do dia, quando o prestador clicar, entao 1 clique basta e ele digita 0 caracteres para obter a cobranca com o valor certo.
- Dado o codigo emitido, quando for lido por aplicativo de banco real, entao a leitura tem sucesso em pelo menos 2 tentativas independentes.

## Independence

Depende da divida (`leg-03`), do recebimento (`leg-02`) e do risco tecnico ja resolvido em `swimlane-jornada-leg-01`. Prova-se com um prestador e uma divida.

## Consumes / produces

- Consumes: a divida de `leg-03`; a chave de `leg-02`; a tecnica validada em `swimlane-jornada-leg-01`.
- Produces: a cobranca do dia, consumida por `leg-05`.

## Appetite

medium - o risco de legibilidade sai antes, no leg de spike da raia jornada.

## Yields at Pass 5B (named units, not specified here)

- O total devido do dia na tela do prestador.
- A cobranca com valor pre-preenchido em um clique.
- O codigo com dados no centro, com leitura verificada por app de banco.

## Re-verify when

O padrao do codigo de cobranca mudar, ou o conteudo central crescer.
