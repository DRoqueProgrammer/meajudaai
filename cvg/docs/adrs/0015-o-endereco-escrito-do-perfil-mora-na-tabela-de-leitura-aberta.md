---
adr: "0015"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-40, R-41"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0015 — O endereço escrito do perfil mora na tabela de leitura aberta

## Context

O R-41 exige que o endereço escrito de uma pessoa siga a regra do ponto exato: legível só
por ela e pela outra parte de um serviço válido. O planejador precisa saber onde cada um
dos dois mora hoje e sob qual política.

## Decision

Os dois dados de localização de uma pessoa moram em **tabelas com políticas opostas**:

- o **ponto exato** (latitude e longitude) mora em `profile_local`, legível só pela própria
  pessoa, pelo SysAdmin (cláusula inerte, ADR 0009) e pela outra parte via
  `tem_servico_com` — que hoje aceita qualquer status (ADR 0010);
- o **endereço escrito** mora em `profiles.endereco` (migration 0029), numa tabela cuja
  política de leitura é `profiles_select_all` — `using (true)`, qualquer autenticado lê
  qualquer linha (ADR 0002).

O cadastro grava o endereço escrito nessa coluna para todo Cliente e Prestador de Serviço
(`lib/actions/auth.ts:113`). Hoje a coluna está vazia nos 9 perfis porque as contas
existentes vieram de script, não do cadastro: a exposição é latente e começa no primeiro
cadastro real.

O endereço de **um serviço** é outra coisa: mora em `servicos.endereco` (migration 0037),
sob a política das partes do serviço.

## Rejected reading

*"A localização da pessoa já está protegida — foi feito o par aproximado para o mapa."* O
cuidado da migration 0033 cobre o ponto exato; o endereço escrito, que chegou depois
(0029), ficou na tabela aberta. A proteção vale para um dos dois, não para "a localização".

## Evidence

```sql
select policyname, qual from pg_policies
 where schemaname = 'public' and tablename in ('profiles', 'profile_local') and cmd = 'SELECT';

select count(*) filter (where endereco is not null and endereco <> '') as com_endereco,
       count(*) as perfis
  from profiles;
```

```sh
grep -n "endereco" supabase/migrations/0029_endereco_perfil.sql
grep -n "endereco" lib/actions/auth.ts
```

Observado no banco vivo em 10/09/2026: `profiles_select_all` qual `true`;
`profile_local_select_own_or_sysadmin_or_parte` qual `(user_id = auth.uid()) OR
(current_app_role() = 'sysadmin') OR tem_servico_com(user_id)`; 0 de 9 perfis com
endereço preenchido.

## Consequences

- O R-41 é sobre mudar de política, não sobre esconder um campo na tela: enquanto o
  endereço estiver numa tabela de leitura aberta, qualquer chamada direta o lê.
- Como a coluna está vazia, o R-41 não carrega dado real a mover hoje — mas o cadastro
  continua gravando nela até a fatia terminar.
- A leitura aberta de `profiles` como um todo (ADR 0002) fica fora desta fatia (W-4); o
  endereço é o único campo dela que a Fatia 1 trata.

Re-verify when: `profiles.endereco` mudar de lugar, `profiles_select_all` for trocada, ou o
cadastro deixar de gravar o endereço no perfil.
