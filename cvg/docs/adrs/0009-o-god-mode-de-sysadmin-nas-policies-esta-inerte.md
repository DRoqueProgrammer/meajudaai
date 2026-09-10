---
adr: "0009"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-2, R-3, R-35"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5"
---

# 0009 - O god-mode de SysAdmin nas policies esta inerte

> Registrado depois do Pass 2 ter fechado, ao ligar os 22 testes de permissao que
> estavam desligados (`swimlane-dados-leg-02`). E um fato de terreno, entao vira
> ADR - nao um bug report perdido num commit.

## Context

O plano da raia `praca` poe a fronteira de isolamento **na politica da propria
tabela** (ADR 0002, reforcado pela objecao C2 do Pass 4). Antes de escrever
politica nova, e preciso saber se o mecanismo do qual as politicas existentes
dependem realmente funciona. Nao funciona.

## Decision

O "god-mode" de SysAdmin nas politicas de seguranca **nao vale no banco**. As
politicas perguntam `current_app_role() = 'sysadmin'`, e essa funcao le
`auth.jwt() -> 'app_metadata' ->> 'app_role'` - um claim que so existe se o auth
hook `custom_access_token_hook` estiver **registrado no painel do Supabase**.
Ele nunca foi registrado (o proprio `CLAUDE.md` ja registrava isso como
pendencia).

Sem o claim, `current_app_role()` cai no default `'ajudante'` - um papel que
**nao existe mais** desde a migration 0022 (ADR 0008). Ou seja: a funcao devolve
um valor que nao casa com nada, e toda politica que depende dela nega em vez de
liberar.

**45 clausulas de politica dependem dessa funcao** - 27 esperando `sysadmin` e 10
esperando `admin` - espalhadas por 17 migrations.

O produto parece funcionar porque o app **nao usa** esse caminho: ele le
`profiles.tipo_base` por conta propria (o fallback documentado). O app e o unico
usuario do banco que enxerga o papel certo. Qualquer outro caminho - e o
navegador falando direto com o banco e um deles - ve um usuario sem papel.

## Rejected reading

*"O teste que falhou esta desatualizado; o sysadmin enxerga tudo no app, entao a
policy esta certa."*

Morre na verificacao direta: entrando com a conta real de SysAdmin (Ricardo
Bastos, `tipo_base = sysadmin`) por um cliente comum, o JWT emitido traz
`app_metadata = {"provider":"email","providers":["email"]}` - **sem `app_role`** -
e a leitura de `demanda_servico` devolve **0 linhas**. O app mostrar o dado certo
prova que o app tem fallback, nao que a politica funciona.

## Evidence

```sh
# 1. a funcao le um claim de JWT, nao a tabela de perfis
grep -A4 "function public.current_app_role" supabase/migrations/0001_profiles_and_auth_hook.sql

# 2. quantas clausulas dependem disso
grep -rho "current_app_role() = '[a-z_]*'" supabase/migrations/*.sql | sort | uniq -c

# 3. a verificacao direta: entrar como o sysadmin real e olhar o JWT
#    (script de uma vez, reproduzido no corpo deste ADR)
npm run test:integration   # a linha que falha e "sysadmin le toda a demanda"
```

Observado em 09/09/2026:

- `current_app_role()` = `coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', 'ajudante')`
- **45** clausulas dependem dela: 27 `= 'sysadmin'`, 10 `= 'admin'`, em 17 migrations
- Login real do SysAdmin: `app_metadata` **sem** `app_role`
- Esse SysAdmin le **0** linhas de `demanda_servico`
- Suite de integracao: **21 de 22 passam**; a unica vermelha e exatamente
  "sysadmin le toda a demanda e edita o banner"

## Consequences

**Isto muda o plano da raia `praca`.** `swimlane-praca-leg-02` vai por a fronteira
de praca na politica da tabela. Se a politica nova perguntar o papel pelo mesmo
caminho, ela nasce com o mesmo defeito - e desta vez o efeito nao e "o sysadmin
ve menos", e sim uma fronteira de seguranca que se comporta diferente do que o
teste do app sugere.

Duas saidas, e a escolha e do Pass 3/5, nao daqui:

1. Registrar o auth hook no painel, fazendo o claim existir de verdade.
2. As politicas pararem de perguntar ao JWT e passarem a ler o papel da tabela de
   perfis, como o app ja faz.

Enquanto nenhuma das duas acontecer, **nenhuma politica deve depender de
`current_app_role()`** - e as 45 clausulas existentes sao divida, nao base.

Consequencia secundaria, e boa: os 22 testes de permissao deixaram de estar
desligados. R-35 saiu de 0/22 para **21/22**, e a unica vermelha e um defeito
real do produto, nao do teste.

Re-verify when: o auth hook for registrado no painel, ou as politicas passarem a
ler o papel da tabela de perfis.
