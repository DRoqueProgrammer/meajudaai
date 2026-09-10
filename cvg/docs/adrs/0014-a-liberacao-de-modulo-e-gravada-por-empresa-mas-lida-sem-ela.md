---
adr: "0014"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-45"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0014 — A liberação de módulo é gravada por empresa, mas lida e concedida sem ela

## Context

O R-45 exige que um módulo liberado para um funcionário valha só dentro da empresa que o
liberou, e só para quem é membro dela. O planejador precisa saber se a empresa já faz parte
da liberação hoje — no dado, na leitura e na concessão.

## Decision

A empresa **faz parte do dado**, mas **não da leitura nem da concessão**:

- no dado — `user_modules` tem chave primária `(user_id, workspace_id, module)`
  (migration 0009): uma liberação é, por construção, de uma pessoa **numa empresa**;
- na leitura — `getAllowedModules` (`lib/auth/modules.ts:19-29`) filtra `user_modules` só
  por `user_id`; qualquer liberação da pessoa, de qualquer empresa, vale em qualquer
  contexto. A função vizinha `getAllowedCapabilities` (`lib/auth/modules.ts:52-70`) filtra
  pelos dois, então a omissão não é do modelo;
- na concessão — `setModuloFuncionarioAction` (`lib/actions/modules.ts:14-42`) confere que
  quem chama é dono da empresa informada, mas não que o funcionário alvo é membro dela; e
  grava com a chave de serviço.

## Rejected reading

*"A liberação é por empresa porque a tabela tem `workspace_id`."* A tabela tem; quem lê não
usa. Um módulo liberado na empresa B aparece para a pessoa quando ela opera na empresa A.

## Evidence

```sh
grep -n "primary key" supabase/migrations/0009_user_modules.sql
sed -n '19,29p' lib/auth/modules.ts        # .eq("user_id", …) — sem workspace_id
sed -n '52,70p' lib/auth/modules.ts        # getAllowedCapabilities filtra os dois
sed -n '14,42p' lib/actions/modules.ts     # confere o dono, não o alvo
```

```sql
select count(*) from user_modules;
```

Observado em 10/09/2026: chave `(user_id, workspace_id, module)`; `user_modules` com 2
linhas (a funcionária de exemplo na única praça existente).

## Consequences

- O R-45 não depende de mudar o formato do dado: a informação da empresa já está gravada;
  a lacuna é de leitura e de concessão.
- Com uma praça só, o defeito não aparece na base atual — ele exige uma segunda empresa, e
  a D-016 (SysAdmin cria praças) é justamente o que vai criar a segunda. O teste do R-53
  precisa montar esse cenário.

Re-verify when: `getAllowedModules` ou `setModuloFuncionarioAction` mudarem, ou a chave de
`user_modules` mudar.
