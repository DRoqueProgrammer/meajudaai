# ADR 0002 — Separação de PII em tabela própria

- **Status:** Aceito
- **Data:** 2026-08-26 (formaliza decisão tomada no início do protótipo)
- **Contexto do parecer:** Eng. de Software (design de segurança pensado)

## Contexto

O `profiles` é lido por muita policy e por muita tela (nome e avatar aparecem em
card de candidato, chat, avaliação). Se os dados sensíveis (CPF, contato) morarem
na mesma linha, qualquer `select` amplo em `profiles` arrisca vazar PII, e é
fácil uma policy nova abrir demais sem querer.

## Decisão

Separar a PII em tabela própria (`profiles_pii`), com RLS estrita: cada pessoa
só lê a sua; o resto do app trabalha com o `profiles` "público" (nome, avatar,
`nota_media`). A migration `0018` chegou a **remover** o CPF do `profiles` para
consolidar o padrão.

## Alternativas consideradas

- **Tudo em `profiles` com policies por coluna:** Postgres não faz RLS por
  coluna nativamente; exigiria views e grants finos, mais fáceis de errar.
- **Criptografar PII na mesma linha:** protege em vazamento de dump, mas não o
  acesso via app — a policy continuaria sendo o ponto de falha.

## Consequências

- **+** O raio de exposição de um erro de policy em `profiles` não inclui PII.
- **+** Leituras amplas de perfil (feed, cards) nunca tocam a tabela sensível.
- **−** Um `join`/segunda query quando a PII é realmente necessária.
- **−** Duas tabelas para manter em sincronia no cadastro.
