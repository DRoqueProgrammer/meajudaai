---
adr: "0002"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-2, R-3"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0002 - A leitura de perfis e global, sem nenhum recorte

## Context

R-2 e R-3 exigem que nenhuma consulta devolva dado de outra praca, decidido no
servidor. Quem planejar isso precisa saber qual e a fronteira que existe hoje na
tabela central de pessoas.

## Decision

A politica de leitura de `profiles` e irrestrita: chama-se `profiles_select_all`,
vale `for select to authenticated`, e sua clausula de restricao e literalmente
`using (true)` -- ou seja, nenhuma.

Ela nasceu na migration `0001` e **nunca foi substituida nem removida** ao longo
das 37 migrations. Qualquer usuario autenticado le **todos** os perfis da base.
Nao existe hoje nenhum recorte por praca em `profiles`.

O projeto conhece o padrao de recorte no servidor: a funcao
`is_workspace_member()` existe e e usada nas politicas de `workspaces` e
`workspace_members` (migrations `0002` e `0008`). Ela simplesmente nunca foi
aplicada a `profiles`.

## Rejected reading

*"O app ja filtra na consulta; basta ajustar as queries."*

Morre porque a politica e a unica fronteira que vale no servidor: um filtro na
consulta e intencao do cliente, nao imposicao. O proprio ROADMAP secao 4 marca
isso como requisito nao-negociavel ("nao pode ser so esconder o item de menu").
A evidencia de que a distincao e conhecida aqui e `guardModule()`, que ja
bloqueia rota por modulo no servidor -- o mesmo rigor nunca foi estendido a
praca.

## Evidence

```sh
grep -A2 'create policy "profiles_select_all"' supabase/migrations/0001_profiles_and_auth_hook.sql
grep -rn "profiles_select_all" supabase/migrations/*.sql
```

Observado: a policy aparece uma unica vez em todo `supabase/migrations/`, na
criacao, com `using (true)`. Nenhum `drop policy` a alcanca.

## Consequences

R-2 e R-3 nao sao "ajustar consulta": envolvem trocar a politica de leitura da
tabela mais central do produto, da qual dependem busca, perfil publico, popover
de perfil e listagens administrativas. O Pass 3 deve tratar isso como uma
costura de risco alto, com verificacao de regressao em todas as superficies que
hoje leem perfil de terceiros.

Re-verify when: qualquer migration criar, trocar ou remover politica em
`public.profiles`.
