---
adr: "0016"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-38, R-54, R-11"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — registrado no scan do Pass 5 da Fatia 1"
---

# 0016 — Não existe na aplicação o caminho de marcar um serviço como realizado

> Registrado depois de o Pass 2 fechar, durante o scan do Pass 5 — do mesmo jeito que o
> ADR 0009 foi registrado depois de o Pass 2 do "Fechar a v2" fechar. É fato de terreno,
> não item de backlog perdido num commit.

## Context

O R-38 diz que "só o prestador marca realizado", e o roteiro do R-54 inclui o passo
"prestador marca realizado". A comissão do programa "Fechar a v2" nasce exatamente nesse
evento (D-005, R-11). O planejador precisa saber se esse caminho existe hoje.

## Decision

**Não existe.** Nenhuma action, rota ou componente muda o estado de um serviço para
`realizado`. As ações de serviço em `lib/actions/agenda-v2.ts` cobrem reservar
(`reservarSlotAction`), confirmar (`confirmarServicoAction`), renegociar
(`proporRenegociacaoAction`, `responderRenegociacaoAction`), anotar
(`escreverLogServicoAction`) e cancelar (`cancelarServicoAction`) — e só.

Os 25 serviços `realizado` da base foram escritos por script com a chave de serviço
(`scripts/seed-fake-data.mjs`, `scripts/seed-mes-atual.mjs`). O ROADMAP §2.3 pede o
caminho ("pode marcar status: agendado / realizado / cancelado") e as telas já têm cor
e rótulo para `realizado` — só falta a transição.

## Rejected reading

*"O realizado acontece sozinho depois da data do horário."* Não há gatilho, cron nem job
que faça isso: o único cron do projeto (`app/api/cron/lembretes-avaliacao`) trata de
lembretes de avaliação da v1, e o único gatilho de `servicos` é o contador.

## Evidence

```sh
grep -rn "\"realizado\"" lib/actions app components --include=*.ts --include=*.tsx | grep -v "status ===\|: \"\|realizado:"
grep -n "export async function" lib/actions/agenda-v2.ts
grep -n "realizado" scripts/seed-fake-data.mjs scripts/seed-mes-atual.mjs | head
```

Observado em 10/09/2026: nenhuma escrita de `status: "realizado"` fora dos scripts; 8
actions exportadas em `agenda-v2.ts`, nenhuma de realizado; na base, 25 de 30 serviços
estão `realizado`, todos com origem em script.

## Consequences

- O R-38 e o R-54 não se sustentam só com regra: precisam do caminho legítimo do
  prestador. A Fatia 1 inclui esse caminho como tarefa própria (decisão D-025).
- A dívida de comissão (R-11) depende deste evento; enquanto ele não existir na
  aplicação, nenhuma dívida nasce fora de script.

Re-verify when: surgir uma action ou rota que leve um serviço a `realizado`.
