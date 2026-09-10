---
leg: swimlane-praca-leg-02
tech: escopo
swimlane: swimlane-praca
parent: _lane.md
status: proposed
spec_ref: ["R-2", "R-3"]
depends_on: ["swimlane-praca-leg-01"]
type: leg
---

# swimlane-praca-leg-02-escopo - leitura escopada decidida no servidor

> Parte da raia **praca** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Trocar a leitura irrestrita de pessoas por leitura escopada pela praca de quem
consulta, decidida no servidor - de modo que esconder o dado na interface deixe
de ser a unica barreira.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dada uma pessoa autenticada da praca A, quando ela consultar qualquer
  superficie que lista pessoas, horarios, servicos ou registros de auditoria,
  entao ela recebe 0 registros da praca B.
- Dada uma requisicao forjada pedindo o identificador de um registro da praca B,
  quando ela chegar ao servidor, entao e recusada em 100% das tentativas - nao
  apenas omitida do menu.
- Dadas as superficies que hoje leem perfil de terceiro, quando o escopo entrar,
  entao nenhuma delas passa a devolver vazio para o caso legitimo da mesma praca.

## Independence

Depende so de `leg-01` (o dono precisa existir para ser escopado). Prova-se com
duas contas de pracas diferentes, sem nenhuma tela nova.

## Consumes / produces

- Consumes: o dono de praca produzido por `leg-01`.
- Produces: **`leitura-escopada`** - metade do contrato publicado da raia.

## Appetite

medium - o risco nao esta no tamanho e sim no alcance: a leitura de pessoas
sustenta busca, perfil publico, popover e listagens administrativas.

## Yields at Pass 5B (named units, not specified here)

- O escopo de leitura de pessoas.
- O escopo de leitura dos registros transacionais.
- A recusa no servidor para identificador de outra praca.
- A verificacao de regressao nas superficies que hoje leem perfil de terceiro.

## Re-verify when

Qualquer migration criar, trocar ou remover politica na tabela de pessoas
(o gatilho registrado no ADR 0002).
