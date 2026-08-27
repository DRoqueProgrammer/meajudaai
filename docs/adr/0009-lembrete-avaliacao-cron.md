# ADR 0009 — Lembrete de avaliação 24h via função SQL + cron

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Finanças (self-selection bias; sem nudge de avaliação)
- **Implementação:** `supabase/migrations/0021_lembrete_avaliacao.sql`,
  `app/api/cron/lembretes-avaliacao/route.ts`

## Contexto

Quem termina a diária e não avalia deixa um buraco na reputação, e o sistema
tende a inflar notas (só avalia quem ficou satisfeito o bastante para voltar ao
app). O fluxo já notifica o ajudante **na** conclusão, mas um único aviso se
perde.

## Decisão

Um lembrete único, **24h após** a diária concluída, para quem foi aceito e ainda
não avaliou. A lógica vive na função SQL `enfileirar_lembretes_avaliacao()`
(`SECURITY DEFINER`, idempotente por dedupe no link da notificação) e num marco
temporal `vagas.finalizada_em` preenchido por trigger. Um cron chama a função;
rodar de novo nunca duplica.

## Alternativas consideradas

- **pg_cron** chamando a função direto no banco: elimina o hop HTTP, mas acopla a
  disponibilidade da extensão e some do código da aplicação.
- **Cron externo / Vercel Cron** batendo no endpoint: escolhido — o agendamento
  fica versionado (`vercel.json`) e o endpoint é auditável e protegido por
  `CRON_SECRET`. Funciona também com pg_cron/scheduler externo (mesmo bearer).
- **Avaliação obrigatória (bloquear o app até avaliar):** reduz viés, mas é
  hostil; um nudge respeita o usuário.

## Consequências

- **+** Mais avaliações coletadas → nota menos enviesada (ataca o self-selection).
- **+** Idempotente e sem PII no rastro; seguro rodar de hora em hora ou diário.
- **−** Exige um segredo (`CRON_SECRET`) configurado no ambiente, senão o endpoint
  recusa (falha segura, porém o lembrete não roda até configurar).
- **−** O "24h" tem a granularidade do cron (diário no `vercel.json`); aceitável
  para um lembrete.
