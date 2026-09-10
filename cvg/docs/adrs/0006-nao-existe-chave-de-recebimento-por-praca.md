---
adr: "0006"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-12"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0006 - Nao existe chave de recebimento no nivel da praca

## Context

R-12 poe a chave de recebimento da praca no perfil do Administrador. Quem
planejar precisa saber que chave existe hoje, de quem ela e, e quem pode
edita-la.

## Decision

A unica chave de recebimento no schema e `profiles_pii.chave_pix` -- **pessoal**,
guardada junto do restante do PII, e com edicao restrita ao proprio dono pela
politica `pii_update_self`. `workspaces` tem 6 colunas e nenhuma de recebimento.

Na base ha **0 chaves cadastradas**: o fluxo de cobranca do prestador ao cliente
existe em codigo, mas nunca foi exercitado com dado real.

## Rejected reading

*"A chave do dono do workspace (`owner_id`) serve como chave da praca."*

Morre pela politica: `pii_update_self` restringe a edicao ao titular, entao nem o
Administrador edita a chave de outra pessoa -- e a mesma barreira que o HANDOVER
registra como nao resolvida em "administrador configurar a chave Pix em nome do
prestador". Alem disso, a chave do dono e PII **dele**, nao da praca: usa-la
misturaria o recebimento institucional com o pessoal de um individuo.

## Evidence

```sh
grep -rn "pii_update_self" supabase/migrations/*.sql | head -3
grep -A12 '      workspaces: {' lib/supabase/database.types.ts | head -10
```

Observado em 09/09/2026: `profiles_pii com chave_pix = 0`. `workspaces` nao tem
coluna de chave. `pii_update_self` criada em `0001` e viva.

## Consequences

R-12 precisa de um lugar de recebimento que nao seja PII de pessoa fisica, e a
tela que o edita nao pode reusar a politica de PII pessoal. Consequencia
secundaria: como ha 0 chaves na base, qualquer verificacao de R-13/R-14 precisa
primeiro cadastrar uma -- nao ha caminho feliz pre-existente para observar.

Re-verify when: politicas de `profiles_pii` mudarem, ou `workspaces` ganhar
coluna de recebimento.
