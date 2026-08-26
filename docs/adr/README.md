# Architecture Decision Records (ADR)

Registro rastreável das decisões estruturais do MeAjuda Aí — o "porquê" das
escolhas, com data, alternativas consideradas e tradeoffs. Até aqui essas
decisões viviam dispersas em comentários de código e no `CLAUDE.md`; o parecer
do Conselho do Mirante cobrou um registro formal, e é isto.

Cada ADR é curto e imutável: uma vez aceito, não se reescreve — se a decisão
muda, cria-se um novo ADR que **supersede** o anterior.

## Índice

| # | Decisão | Status |
|---|---|---|
| [0001](./0001-stack-nextjs-supabase.md) | Stack: Next.js + Supabase + TypeScript (em vez de FlutterFlow + Firebase) | Aceito |
| [0002](./0002-separacao-pii.md) | Separação de PII em tabela própria com RLS estrita | Aceito |
| [0003](./0003-rls-security-definer.md) | RLS com funções `SECURITY DEFINER` para evitar recursão de policies | Aceito |
| [0004](./0004-localizacao-aproximada.md) | Localização aproximada: coordenada exata protegida por RLS | Aceito |
| [0005](./0005-contas-demo-readonly.md) | Contas de demonstração read-only | Aceito |
| [0006](./0006-nota-media-ewma.md) | `nota_media` ponderada por recência (EWMA, meia-vida 90 dias) | Aceito |
| [0007](./0007-rate-limiting-memoria.md) | Rate limiting em memória nas server actions de escrita | Aceito |
| [0008](./0008-observabilidade-minima.md) | Observabilidade mínima: health check + logging estruturado | Aceito |
| [0009](./0009-lembrete-avaliacao-cron.md) | Lembrete de avaliação 24h via função SQL + cron | Aceito |
| [0010](./0010-ci-pipeline.md) | CI: typecheck + lint + testes em cada push/PR | Aceito |

**0001–0005** formalizam (retroativamente) decisões já em vigor desde a
construção do protótipo. **0006–0010** acompanham as mudanças feitas em resposta
ao parecer do Conselho do Mirante (22/08/2026).
