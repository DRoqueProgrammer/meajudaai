---
adr: "0000"
status: accepted
date: 2026-09-09
ground: brownfield
converge_pass: 2
spec_ref: "R-1..R-36"
supersedes: ""
superseded_by: ""
deciders: "Leonardo Chalhoub"
---

# 0000 — Context: the ground we stand on

## Terrain

**Brownfield**, e não pouco: existe um produto rodando, com 37 migrations
aplicadas, 25 tabelas, ~40 rotas e 58 testes verdes — e ele carrega **dois
modelos de produto ao mesmo tempo**, o mural de diárias da v1 e o marketplace de
agendamento da v2, convivendo na mesma base. Os ADRs deste conjunto registram o
que já é verdade nesse terreno, não o que queremos que seja.

## Given surface

Verificado rodando contra o banco real em 09/09/2026, não presumido de documento:

- **Papéis já pivotados.** `profiles.tipo_base` aceita 5 valores —
  `sysadmin, admin, funcionario, prestador_servico, cliente` — e a base tem 9
  pessoas distribuídas neles. O papel `ajudante` da v1 **não existe mais** (ver
  ADR 0008).
- **Agenda v2 funcionando.** `agenda_slots` (51 linhas) e `servicos` (30 linhas,
  25 delas `realizado`) sustentam o fluxo horário → reserva → serviço.
- **Renegociação de valor** existe no schema: `servicos.preco_valor` +
  `servicos.preco_pendente`.
- **Endereço por serviço** existe: `servicos.endereco/lat/lng` (migration 0037).
- **Cobrança do cliente pelo prestador** existe: chave Pix pessoal em
  `profiles_pii.chave_pix` — com **0 chaves cadastradas** hoje.
- **Workspace existe, mas como empresa:** 1 linha, "Construtora Lopes" (Niterói),
  com 2 membros em `workspace_members` (ver ADR 0003).
- **Autorização por módulo no servidor** já existe (`user_modules`,
  `guardModule`) — o requisito de segurança que o ROADMAP §4 marcou como crítico
  está atendido para módulos, e **não** para praça (ver ADR 0002).
- **Registro de acesso funciona.** `login_logs` tem 11 linhas: a suspeita do
  ROADMAP §0 de que a tabela pudesse não estar gravando **está resolvida — grava**.
  R-29 é verificação, não construção.
- **Subsistema de vagas da v1 continua ativo** — `vagas`, `candidaturas`,
  `vaga_local`, e as rotas de diária.

## Build surface

O que o spec pede e o terreno **não** tem:

- Vínculo de praça para Prestador e Cliente (ADR 0001) — R-1, R-4, R-5.
- Qualquer isolamento de leitura por praça (ADR 0002) — R-2, R-3.
- Sentido de "praça" no lugar de "empresa" (ADR 0003) — R-1..R-8.
- Categoria no nível do serviço (ADR 0004) — R-9.
- Alíquota, dívida, declaração e confirmação de pagamento — R-9 a R-20. Nada
  disso existe em nenhuma forma.
- Chave de recebimento no nível da praça (ADR 0006) — R-12.
- Telas próprias de SysAdmin e Administrador — R-6, R-7.
- Aprovação de cadastro do prestador — R-21, R-22.
- Recibo e visão financeira — R-23, R-24.
- Densidade e fim de ano no dataset de demonstração (ADR 0007) — R-26, R-27.

## Spec

[`cvg/docs/tech-spec/fechar-v2-marketplace.md`](../tech-spec/fechar-v2-marketplace.md)
— veredito `canonical`, assinado em 2026-09-09.
