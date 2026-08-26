# ADR 0008 — Observabilidade mínima: health check + logging estruturado

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Eng. de Software (sem health check real, sem observabilidade)
- **Implementação:** `app/api/health/route.ts`, `lib/log.ts`

## Contexto

O middleware listava `/api/health` como rota pública, mas o arquivo não existia —
sem probe, uma queda do Supabase passava despercebida até um usuário reclamar.
E não havia rastro estruturado: quando "a vaga não publica em produção", o debug
era abrir o Supabase e caçar.

## Decisão

Duas peças mínimas, sem trazer plataforma de APM:

1. **Health check** (`GET /api/health`): liveness + readiness num alvo só —
   confirma que o app está de pé e que o banco responde, com uma leitura barata
   (`head`/`count` numa tabela pequena). Sempre dinâmico; não vaza detalhe de
   erro no corpo. `503` quando o banco não responde.
2. **Logging estruturado** (`logAction`): uma linha JSON por evento crítico
   (`{ ts, action, userId, result, ... }`) nas actions de escrita. `erro` vai
   para stderr; o resto para stdout. **Nunca PII** — só ids.

## Alternativas consideradas

- **APM completo (Datadog/Sentry/OTel) já:** valioso, mas é peso e custo cedo
  demais. O JSON em stdout já é indexável por qualquer coletor (Vercel/Datadog)
  quando chegar a hora.
- **`console.log` livre:** sem forma fixa, não dá para consultar por `action`/
  `result` sem regex.

## Consequências

- **+** Deploy ganha liveness/readiness probe.
- **+** Rastro consultável de quem fez o quê e com que resultado.
- **−** Ainda não há métricas nem tracing distribuído — é piso, não teto.
- **−** Disciplina: cada action crítica nova precisa chamar `logAction`.
