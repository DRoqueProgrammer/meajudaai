---
adr: "0001"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-1, R-4, R-5"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0001 - Os papeis da v2 nao tem vinculo de praca

## Context

Quem planejar o isolamento por praca precisa saber onde mora hoje o vinculo
pessoa-praca. A resposta errada -- "ja existe, e so popular" -- levaria o Pass 3
a planejar uma migracao de dados quando o que falta e a coluna.

## Decision

`profiles` tem 21 colunas e **nenhuma** referencia workspace. O unico vinculo
pessoa-workspace no schema e a tabela `workspace_members` (`user_id`,
`workspace_id`, `role`), e ela cobre **2 das 9 pessoas** da base. As outras 7 --
as 3 clientes, os 2 prestadores e os 2 sysadmins -- nao tem vinculo nenhum.

Os dois papeis que o spec quer isolar sao exatamente os que hoje nao tem tenancy.

O vinculo tambem nao alcanca o transacional: `servicos` (15 colunas) e
`agenda_slots` (7 colunas) nao tem coluna de workspace.

## Rejected reading

*"`workspace_members` ja serve, basta popular com prestadores e clientes."*

Morre em dois pontos. Primeiro, `workspace_members.role` carrega a semantica da
v1 -- e o papel da pessoa **dentro de uma empresa** (admin/funcionario), e as
politicas que dependem dele (`is_workspace_member`) foram escritas para isso.
Segundo, e decisivo: mesmo com a tabela populada, `servicos` e `agenda_slots`
continuam sem coluna de workspace, entao nenhuma consulta do fluxo v2 ficaria
escopada. Popular a tabela resolveria a aparencia do vinculo, nao o isolamento.

## Evidence

```sh
# colunas reais, lidas dos tipos gerados a partir do schema aplicado
grep -A25 '      profiles: {' lib/supabase/database.types.ts | head -30
# contagens reais, contra o banco (somente leitura)
node .grounding-tmp.mjs   # script em cvg/brain/notes/2026-09-09-grounding-pass-2.md
```

Observado em 09/09/2026:

- `profiles.total = 9` -- admin 1, cliente 3, funcionario 1, prestador_servico 2,
  sysadmin 2
- `workspace_members.total = 2`
- **`profiles SEM vinculo de workspace = 7`** -- cliente 3, prestador_servico 2,
  sysadmin 2
- colunas de `profiles`: bairro, bio, categoria, cidade, cidade_ibge, created_at,
  disponibilidade, endereco, estado, foto_url, genero, nome, nota_media,
  preco_tipo, preco_valor, servicos_realizados, status, tipo_base,
  total_avaliacoes, user_id, verificado -- **nenhuma de workspace**

## Consequences

O Pass 3 deve tratar tenancy como **ausente** para prestador, cliente, servico e
horario -- nao como existente-e-despovoada. R-1, R-4 e R-5 tocam schema, nao so
dados. R-5 (atribuir pessoas existentes a uma praca) tem hoje 7 registros
orfaos, numero pequeno o bastante para uma virada de uma vez so.

Re-verify when: qualquer migration adicionar coluna de workspace a `profiles`,
`servicos` ou `agenda_slots`.
