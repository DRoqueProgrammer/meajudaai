---
adr: "0012"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-42, R-43"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0012 — As contas de exemplo são contas reais, sem marca própria

## Context

O dono decidiu manter as cinco contas de exemplo em um clique (D-015), e o R-42 exige que
cada uma só enxergue e altere o mundo de exemplo. Para isso o planejador precisa saber
como uma conta — e uma pessoa — de exemplo se distingue hoje de uma real, e por qual
caminho a conta de exemplo SysAdmin chega aos dados de todo mundo.

## Decision

As contas de exemplo são **contas de autenticação comuns**, sem nenhuma marca no banco:

- `profiles` não tem coluna que indique "exemplo"; o papel sai de `profiles.tipo_base`
  (`lib/auth/roles.ts:29-35`), igual ao de qualquer pessoa;
- o único traço comum é o e-mail: as cinco (Cliente, Prestador, Funcionário,
  Administrador, SysAdmin) usam o domínio `@meajudaai.app`; a conta real do dono usa
  outro domínio, e as três contas de teste usam `@teste.local`;
- a entrada em um clique (`app/api/exemplo/entrar/route.ts`) faz login com a senha
  compartilhada guardada em `lib/auth/contas-exemplo.ts:43`, que não tem
  `import "server-only"`;
- as telas administrativas `/admin/logs` e `/admin/servicos` só conferem o papel e depois
  leem com a chave de serviço (`createAdminClient`), que ignora as políticas do banco —
  então a conta de exemplo SysAdmin lê tudo o que a conta real leria.

O "mundo de exemplo" hoje é pequeno: 5 contas de exemplo, 30 serviços entre elas, 1 praça
("Construtora Lopes", do Administrador de exemplo). Fora dele há 1 conta real (o SysAdmin
do dono) e 3 contas de teste.

## Rejected reading

*"As contas de exemplo são read-only, porque existe um guarda de demonstração."* O guarda
`tryWriter` (`lib/auth/guard.ts`) bloqueia os e-mails de `lib/auth/demo.ts`
(`*.demo@meajudaai.app`), contas que nunca foram semeadas. As contas de exemplo reais não estão nessa
lista e escrevem normalmente — por decisão (`lib/auth/contas-exemplo.ts:1-5`: "reais,
editáveis").

## Evidence

```sql
-- quem existe, por domínio de e-mail e papel (agregado — sem expor e-mails)
select split_part(u.email, '@', 2) as dominio, p.tipo_base, count(*)
  from auth.users u left join profiles p on p.user_id = u.id
 group by 1, 2 order by 1, 2;

-- profiles não tem marca de exemplo
select string_agg(column_name, ', ' order by ordinal_position)
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles';

-- o que a conta de exemplo SysAdmin já enxerga de fora do mundo de exemplo
select count(*) from login_logs l join auth.users u on u.id = l.user_id
 where u.email not like '%@meajudaai.app';
```

```sh
grep -n "createAdminClient" app/\(app\)/admin/logs/page.tsx app/\(app\)/admin/servicos/page.tsx
grep -n "SENHA_CONTA_EXEMPLO\|server-only" lib/auth/contas-exemplo.ts app/api/exemplo/entrar/route.ts
```

Observado no banco vivo em 10/09/2026:

- `meajudaai.app`: 1 admin, 1 cliente, 1 funcionário, 1 prestador, 1 sysadmin ·
  `hotmail.com`: 1 sysadmin · `teste.local`: 2 clientes, 1 prestador
- colunas de `profiles`: nenhuma indica exemplo
- `login_logs`: 18 linhas, 1 de conta fora do mundo de exemplo — já visível à conta de
  exemplo SysAdmin em `/admin/logs`

## Consequences

- Distinguir "de exemplo" de "real" é um fato que ainda não existe no banco: qualquer
  isolamento do R-42 começa por decidir, no Pass 5, o que marca uma pessoa de exemplo. O
  domínio do e-mail é o único traço disponível hoje.
- Uma regra de isolamento que só exista na política do banco não alcança `/admin/logs` e
  `/admin/servicos`, porque essas telas leem com a chave de serviço; e uma que só exista
  na tela não alcança o banco. As duas camadas estão no caminho.
- A senha compartilhada chega hoje a um arquivo sem a trava de servidor; a R-43 parte
  daqui.

Re-verify when: surgir uma marca de pessoa de exemplo no banco, uma praça de demonstração
(Fatia 5), ou as telas administrativas deixarem de ler com a chave de serviço.
