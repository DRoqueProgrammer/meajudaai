---
adr: "0008"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-28"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0008 - O papel `ajudante` ja nao existe; o que restou e o subsistema de vagas

## Context

O documento de design anterior (`DESIGN_MEAJUDAAI_V2.md`) afirma que trocar o
modelo de papeis e "um refactor real com blast radius grande", citando 65
arquivos que referenciam `ajudante`. Se o Pass 3 planejar com base nessa frase,
vai superdimensionar o custo do que resta.

## Decision

O pivo de papeis **ja aconteceu**. A constraint `profiles_tipo_base_check`
(migration `0022`) lista cinco papeis -- `sysadmin`, `admin`, `funcionario`,
`prestador_servico`, `cliente` -- e `ajudante` nao esta entre eles. A base
confirma: 9 pessoas, nenhuma com esse papel.

O que ainda aparece no codigo e `ajudante_id`, **coluna** do subsistema de vagas
da v1 (`candidaturas`, rotas de diaria, chat de vaga) -- nome de coluna, nao
papel. O literal `'ajudante'` como valor de papel aparece em 8 pontos;
`ajudante` como substring, em 57 arquivos. A diferenca entre esses dois numeros e
a diferenca entre "refactor de papeis" e "subsistema legado ainda ativo".

## Rejected reading

*"`DESIGN_MEAJUDAAI_V2.md` diz que sao 65 arquivos e um refactor grande."*

Era verdade quando foi escrito e nao e mais -- a migration `0022` fechou essa
troca. O documento nao foi atualizado depois. Este ADR existe para que a frase
antiga nao seja lida como estado atual.

## Evidence

```sh
grep -n "tipo_base in" supabase/migrations/0022_papeis_v2_prestador_cliente.sql
grep -rl "ajudante" --include="*.ts" --include="*.tsx" --include="*.sql" app components lib supabase tests | wc -l
grep -rn "'ajudante'" --include="*.ts" --include="*.tsx" --include="*.sql" app components lib supabase | wc -l
```

Observado em 09/09/2026: a constraint lista
`('sysadmin','admin','funcionario','prestador_servico','cliente')`; 57 arquivos
contem a substring `ajudante`; **8** contem o literal `'ajudante'`. Contagem por
papel na base: admin 1, cliente 3, funcionario 1, prestador_servico 2, sysadmin
2.

## Consequences

R-28 (faxina de linguagem da v1) e sobre o **subsistema de vagas e seus textos**,
nao sobre trocar papeis. O Pass 3 deve dimensionar por ai. Onde o
`DESIGN_MEAJUDAAI_V2.md` contradisser este ADR, vale este -- ele foi medido
depois.

Re-verify when: `profiles_tipo_base_check` mudar, ou o subsistema de vagas for
removido.
