---
leg: swimlane-administracao-leg-02
tech: sysadmin
swimlane: swimlane-administracao
parent: _lane.md
status: proposed
spec_ref: ["R-6", "R-7"]
depends_on: ["swimlane-praca-leg-02"]
type: leg
---

# swimlane-administracao-leg-02-sysadmin - a tela de quem opera a plataforma

> Parte da raia **administracao** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Dar ao SysAdmin uma tela da plataforma inteira - as pracas, o que cada uma produz, e os registros que so ele pode ver - em vez da home generica.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado um SysAdmin autenticado, quando ele entrar, entao cai numa tela do papel dele e nao na home generica.
- Dada essa tela, quando ela abrir, entao exibe 0 cartoes de boas-vindas e lista todas as pracas, nao apenas uma.

## Independence

Depende so do escopo de leitura. Prova-se com um sysadmin e ao menos 2 pracas.

## Consumes / produces

- Consumes: `praca-corrente` e a visao supra-praca (D-011).
- Produces: nada - raia terminal.

## Appetite

medium - agrega por praca.

## Yields at Pass 5B (named units, not specified here)

- O roteamento do SysAdmin para a tela dele.
- A visao por praca com os totais de cada uma.
- O acesso aos registros restritos a SysAdmin.

## Re-verify when

D-011 for revista (sysadmin passar a ter praca).
