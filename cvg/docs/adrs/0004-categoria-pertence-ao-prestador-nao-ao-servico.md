---
adr: "0004"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-9"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0004 - A categoria pertence ao prestador, nao ao servico

## Context

R-9 exige aliquota em 4 niveis, um deles **por categoria de servico** -- do
exemplo dado pelo dono: "instalacao eletrica, a aliquota vai ser 1,5%". Quem
planejar precisa saber onde a categoria de um servico mora hoje.

## Decision

A categoria e atributo de **pessoa**, nao de servico: `profiles.categoria`
existe; `servicos` tem 15 colunas e **nenhuma** e categoria. A tabela
`categorias_servico` tem 7 linhas, e apenas **1** categoria esta de fato em uso
pelos prestadores da base.

Consequencia factual: hoje a categoria de um servico so e derivavel do prestador
que o executa -- e cada prestador tem exatamente uma.

## Rejected reading

*"Da pra derivar do prestador: o servico herda a categoria de quem o executa."*

Satisfaz a letra e mata o caso de uso. Se a categoria vem do prestador, um
prestador com uma unica categoria nao pode ter aliquotas diferentes por tipo de
trabalho -- que e exatamente a situacao do exemplo que originou R-9. A derivacao
faria o nivel "por categoria" colapsar sobre o nivel "por prestador", deixando a
precedencia de 4 niveis com 3 niveis efetivos.

## Evidence

```sh
grep -A20 '      servicos: {' lib/supabase/database.types.ts | head -20
```

Observado: colunas de `servicos` = cancelado_em, cancelado_motivo, cliente_id,
created_at, descricao, endereco, id, lat, lng, preco_pendente, preco_tipo,
preco_valor, prestador_id, slot_id, status. `categorias_servico.total = 7`;
categorias em uso por prestadores = 1.

## Consequences

O nivel "por categoria" de R-9 depende de a categoria existir no servico. O Pass
3 deve tratar isso como pre-condicao do requisito, nao como detalhe de
implementacao -- sem ela, R-9 entrega 3 niveis, nao 4.

Re-verify when: `servicos` ganhar coluna de categoria, ou `profiles.categoria`
deixar de ser cardinalidade 1.
