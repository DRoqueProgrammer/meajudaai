---
adr: "0003"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-1, R-2, R-4, R-8"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0003 - "Workspace" hoje significa empresa, nao praca

## Context

A decisao D-001 do Pass 1 redefiniu workspace como **praca** -- uma instalacao
por cidade, com marca propria. O termo ja existe no codigo com outro sentido.
Quem planejar sem notar isso vai herdar a semantica errada.

## Decision

`workspaces` tem 6 colunas -- `id`, `nome`, `cidade`, `estado`, `owner_id`,
`created_at` -- e **1 linha**: "Construtora Lopes", cidade Niteroi. O sentido
corrente e *empresa dona de vagas*, herdado da v1: `workspace_members.role`
distingue admin e funcionario **dessa empresa**, e `owner_id` pressupoe uma
pessoa proprietaria.

As colunas `cidade`/`estado` ja comportam a leitura nova. O conflito nao e de
estrutura, e de **significado e de dono**: uma praca nao tem proprietario no
mesmo sentido que uma empresa tem.

## Rejected reading

*"Workspace ja e praca na pratica; e so renomear na interface."*

Morre em tres evidencias que codificam empresa, nao lugar: o `owner_id`; o nome
real da unica linha ("Construtora Lopes", que e uma razao social, nao uma
cidade); e `workspace_members.role`, que existe para distinguir cargos dentro de
uma organizacao. Renomear sem resolver quem e dono de uma praca deixaria o
conceito ambiguo justamente onde R-9 e R-10 precisam de clareza -- e o
Administrador da praca quem define aliquota.

## Evidence

```sh
grep -A12 '      workspaces: {' lib/supabase/database.types.ts | head -12
```

Observado em 09/09/2026: `workspaces.total = 1`, nome "Construtora Lopes",
cidade "Niteroi"; `workspace_members.total = 2`. Colunas de `workspaces`:
cidade, created_at, estado, id, nome, owner_id.

## Consequences

O Pass 3 deve tratar "praca" como termo **novo** que ocupa uma estrutura
existente, e resolver explicitamente o papel de `owner_id` nesse novo sentido. O
termo canonico esta fixado em [`../CONTEXT.md`](../CONTEXT.md).

Re-verify when: `workspaces` ganhar ou perder coluna, ou a base passar de 1
praca.
