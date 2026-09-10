---
adr: "0013"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-44, R-46, R-47, R-48, R-49"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0013 — A praça nasce do Administrador, e não existe praça padrão

## Context

A D-016 inverte a origem da praça: só o SysAdmin cria praças e vincula Administradores a
elas, com uma praça padrão; o Administrador vê só as vinculadas; com uma praça, não há
seletor (R-46 a R-49). E ninguém se torna Administrador sozinho (R-44). O planejador
precisa saber de onde vem uma praça hoje, como alguém vira Administrador, e como a
aplicação escolhe a praça ativa.

## Decision

Hoje a praça (a estrutura `workspaces`, ainda com sentido de "empresa", ADR 0003) **nasce
do Administrador**, por quatro portas:

1. **cadastro público** — o esquema aceita `tipo_base: "admin"` (`lib/validation.ts:13`);
   só `funcionario` é barrado sem convite (`lib/actions/auth.ts:72`), e a tela oferece
   "Tenho uma empresa";
2. **troca de papel** — `trocarMeuPapelAction` (`lib/actions/auth.ts:291-347`) deixa um
   prestador virar Administrador e cria uma praça para ele;
3. **o próprio Administrador** cria e exclui praças pelo seletor (`criarEmpresaAction`,
   `excluirEquipeAction`, em `components/workspace-switcher.tsx`);
4. **o SysAdmin**, ao criar um Administrador (`criarAdminAction`) ou promover alguém
   (`definirPapelAction`), dispara a criação automática de uma praça "Empresa de {nome}"
   para aquela pessoa (`lib/actions/admin-users.ts:23-47, 89-94`).

Não existe caminho para o SysAdmin criar uma praça sem dono, nem para vincular um
Administrador a uma praça que já existe. **Não existe praça padrão**: a praça ativa é um
cookie (`ws_ativo`), conferido contra as praças de que a pessoa é membro; sem cookie
válido, vale a primeira da lista (`lib/auth/workspace.ts:34-40`). O seletor aparece para
todo Administrador, inclusive com uma praça só.

## Rejected reading

*"O SysAdmin já cria Administradores e praças — o ROADMAP §2.1 está atendido."* O SysAdmin
cria Administradores, e cada um ganha a própria praça automaticamente; ele não escolhe a
praça nem vincula a uma existente. Ao mesmo tempo, qualquer pessoa chega a Administrador
pelas portas 1 e 2 sem passar por ele.

## Evidence

```sql
select w.nome, split_part(u.email, '@', 2) as dominio_dono,
       (select count(*) from workspace_members m where m.workspace_id = w.id) as membros
  from workspaces w left join auth.users u on u.id = w.owner_id;
```

```sh
grep -n "tipo_base" lib/validation.ts
grep -n "funcionario\" && !invite\|!invite && parsed.data.tipo_base" lib/actions/auth.ts
grep -n "criarEmpresaAction\|excluirEquipeAction" components/workspace-switcher.tsx
grep -n "workspaces\")" -A3 lib/actions/admin-users.ts
sed -n '29,40p' lib/auth/workspace.ts
```

Observado no banco vivo em 10/09/2026: 1 praça ("Construtora Lopes", dono = Administrador
de exemplo, 2 membros); o Administrador de exemplo é membro de 1 praça; os dois SysAdmins
de 0 (coerente com a D-011).

## Consequences

- As portas 1 e 2 são as que o R-44 fecha; as portas 3 e 4 são as que a D-016 reserva ao
  SysAdmin (R-46, R-47).
- "Praça padrão" é um conceito que ainda não existe no banco nem na aplicação — só a
  preferência volátil do cookie.
- A opção de excluir praça pelo seletor apaga a praça e o histórico dela (o próprio texto da tela
  avisa que não dá para desfazer) — isso conflita com a regra de nunca deletar do ROADMAP
  §3 e fica registrado aqui para o planejador não reaproveitar essa porta.

Re-verify when: surgir vínculo Administrador–praça com praça padrão, ou o cadastro, a troca
de papel e o seletor mudarem de comportamento.
