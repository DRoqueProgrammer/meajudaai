# ADR 0007 — Rate limiting em memória nas server actions de escrita

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Eng. de Software (admin client sem throttle contra abuso)
- **Implementação:** `lib/rate-limit.ts`, usado em `candidatar`, `publicar`, `avaliar`

## Contexto

As server actions de escrita validam permissão (Zod + guards) antes de usar o
admin client, mas nada limitava a **frequência**: um bot que candidata 10.000
vezes por segundo passava por Zod e guard, deixando o Supabase como única
barreira. Candidatura é a ação mais fácil de automatizar em massa.

## Decisão

Rate limit em memória (janela fixa por chave `"<acao>:<userId>"`), como primeira
barreira barata: `20/min` para candidatar/avaliar, `15/min` para publicar. É um
`Map` por processo, com varredura de expirados para não vazar memória.

## Alternativas consideradas

- **Nada (só o Supabase):** deixa a porta aberta para abuso trivial.
- **Redis/Upstash compartilhado:** correto para produção (limite global entre
  instâncias), mas é infra a mais para o protótipo.
- **Rate limit no Postgres (tabela + função):** durável e compartilhado, porém
  paga uma ida ao banco em cada request legítimo.

## Consequências

- **+** Barra o abuso óbvio antes do banco, sem dependência nova.
- **+** Interface (`rateLimit(chave, limite, janelaMs)`) já pronta para trocar o
  backend sem mexer nas actions.
- **−** **Limitação assumida:** o `Map` é **por processo/instância**. Em
  serverless, quem paraleliza entre instâncias dilui o limite. É um piso, não a
  defesa definitiva.
- **Evolução:** trocar o armazenamento por Postgres ou Upstash Redis (chave
  compartilhada) quando o tráfego justificar — sem alterar os call sites.
