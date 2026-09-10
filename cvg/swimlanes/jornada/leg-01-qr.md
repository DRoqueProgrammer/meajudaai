---
leg: swimlane-jornada-leg-01
tech: qr
swimlane: swimlane-jornada
parent: _lane.md
status: proposed
spec_ref: ["R-15"]
depends_on: []
type: leg
---

# swimlane-jornada-leg-01-qr - spike: codigo de cobranca com dados no centro

> Parte da raia **jornada** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Resolver, antes de construir qualquer parte da cobranca, se um codigo de cobranca que carrega nome, data, valor e codigo do projeto no centro continua sendo lido por aplicativo de banco real - e, se nao, qual o limite de conteudo central que ainda funciona.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um codigo gerado com os 4 dados no centro, quando for lido por aplicativo
  de banco real, entao a leitura tem sucesso em **3 aplicativos de bancos
  diferentes** - nao 2 tentativas no mesmo. A objecao M2 do Pass 4 esta certa: a
  sensibilidade do leitor varia por banco, e duas leituras no mesmo aplicativo
  provam o aplicativo, nao o codigo. R-15 pede 2 tentativas independentes como
  piso; este plano sobe a barra porque o custo de errar aqui e uma cobranca que
  nao entra.
- Dado que a leitura falhe, quando o conteudo central for reduzido ou o codigo ampliado, entao existe uma combinacao documentada em que a leitura volta a funcionar.
- Dada a combinacao encontrada, quando ela for registrada, entao a raia comissao pode construir `leg-04` sem redescobrir o limite.

## Independence

Nao depende de nada: e o primeiro leg do programa inteiro. Prova-se com um codigo gerado a mao e um celular.

## Consumes / produces

- Consumes: nada - so o padrao de codigo de cobranca que ja existe no produto.
- Produces: o limite documentado de conteudo central - insumo obrigatorio de `swimlane-comissao-leg-04`.

## Appetite

small - e um spike, nao uma feature. O valor esta em falhar cedo, se for falhar.

## Yields at Pass 5B (named units, not specified here)

- O experimento de legibilidade com conteudo central.
- O registro do limite encontrado, para a raia comissao consumir.

## Re-verify when

O padrao do codigo de cobranca mudar, ou o conteudo central ganhar mais um campo.
