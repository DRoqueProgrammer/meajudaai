---
leg: swimlane-dados-leg-02
tech: cobertura
swimlane: swimlane-dados
parent: _lane.md
status: proposed
spec_ref: ["R-33", "R-34", "R-35", "R-36"]
depends_on: []
type: leg
---

# swimlane-dados-leg-02-cobertura - as duas medidas, e os 22 testes desligados

> Parte da raia **dados** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Tornar a qualidade auditavel: medir as duas coberturas separadamente e ligar os 22 testes de regra de permissao que ja existem escritos e hoje nao rodam - porque sao eles que provam a fronteira que a raia praca constroi.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o conjunto de testes de permissao, quando a suite rodar, entao 22 de 22 executam e passam, em vez de 22 pulados.
- Dada uma entrega que muda o produto, quando a versao subir, entao o par de numeros de cobertura e registrado junto - 0 versoes publicadas sem ele.
- Dada a logica pura, quando a cobertura for medida, entao o numero e reportado contra a meta de 100% (hoje 29,16%).

## Independence

Nao depende de nenhum outro leg: os 22 testes ja existem e a medicao ja esta instalada. Pode comecar no primeiro dia.

## Consumes / produces

- Consumes: a suite existente e a medicao de cobertura ja instalada.
- Produces: a qualidade medida.

## Appetite

medium - ligar os 22 exige base de integracao disponivel.

## Yields at Pass 5B (named units, not specified here)

- A execucao dos 22 testes de permissao.
- O relatorio das duas coberturas.
- A amarracao do bump de versao ao par de numeros.

## Re-verify when

A meta de cobertura mudar, ou os testes de permissao serem reescritos.
