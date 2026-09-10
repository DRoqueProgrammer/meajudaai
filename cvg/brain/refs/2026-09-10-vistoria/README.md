# Vistoria de 10/09/2026 — material de entrada

Nove agentes especialistas avaliaram o web app contra o build de produção do commit
`da13908` (branch `feature/dev_2026-09-09`), a pedido do Leonardo: *"cada um dá uma
nota de 0 a 100, com comentário e contribuição de melhoria; no final, um geral e uma
recomendação resumida"*. Depois, em 10/09/2026: *"Vamos melhorar. Faça todas as
recomendações destes agentes."*

Este é o material bruto que as fatias do Converge citam como fonte. O relatório
consolidado está em [`relatorio-vistoria.html`](./relatorio-vistoria.html) (abre no
navegador, com as imagens embutidas).

## Notas

| Parecer | Agente (origem) | Nota |
|---|---|---|
| [01](./pareceres/01-conselheira-design.md) | conselheira-design (Mirante dos Dados) | 55 |
| [02](./pareceres/02-conselheiro-eng-software.md) | conselheiro-eng-software (Mirante dos Dados) | 51 |
| [03](./pareceres/03-claude-best-practices-specialist.md) | claude-best-practices-specialist (Mirante dos Dados) | 62 |
| [04](./pareceres/04-conselheiro-administrador.md) | conselheiro-administrador (Mirante dos Dados) | 41 |
| [05](./pareceres/05-marketing-specialist.md) | marketing-specialist (foco-contábil) | 38 |
| [06](./pareceres/06-conselheira-protecao-dados.md) | conselheira-protecao-dados (caixa-forte) | 28 |
| [07](./pareceres/07-performance-optimizer.md) | performance-optimizer (caixa-forte) | 45 |
| [08](./pareceres/08-supabase-specialist.md) | supabase-specialist (AgentSpec) | 45 |
| [09](./pareceres/09-code-reviewer.md) | code-reviewer (AgentSpec) | 64 |
| | **Geral (média simples)** | **48** |

[`00-briefing-do-conselho.md`](./pareceres/00-briefing-do-conselho.md) é o briefing
comum que os nove receberam (contexto, regras de somente leitura, formato e calibragem
da nota). Os pareceres estão condensados pelo controller, sem mudar notas nem
gravidades, com duas exceções marcadas no próprio texto:

- **09 code-reviewer:** um CRÍTICO rebaixado para BAIXO — dependia das contas demo
  antigas (`lib/auth/demo.ts`), que nunca existiram no banco. Em troca, um agravante
  confirmado: o cadastro público aceita `tipo_base: "admin"`.
- **07 performance:** faixas do Core Web Vitals corrigidas (LCP de 4,1 s está logo acima
  do limite de "ruim"; CLS de 0,203 está em "precisa melhorar").

Os três riscos de segurança do relatório foram conferidos na fonte pelo controller
(migrations `0024` e `0027`, `lib/validation.ts:13`, `lib/actions/auth.ts:291-347`,
`app/api/exemplo/entrar/route.ts`).

## Métricas e telas

- [`metricas/RESUMO-METRICAS.md`](./metricas/RESUMO-METRICAS.md) — por página ×
  viewport: estouro horizontal, alvos de toque, fonte mínima, contraste aproximado,
  campos sem rótulo, TTFB; e o passe de performance em celular médio.
- `metricas/manifest.json` — os mesmos dados com os exemplos de cada infração.
- `metricas/perf-mobile-4g.json`, `metricas/build-output.txt`.
- [`telas/`](./telas/) — o **"antes"**: a primeira tela de cada página, celular (390 px
  de largura) e desktop (1000 px), mais amostras de tema escuro, a landing na primeira
  visita e a folha "Conta" aberta. Nome: `{papel}__{página}__{viewport}.jpg`.

## Kit de captura (para medir o "depois")

`kit/captura.cjs` percorre 37 rotas como 6 papéis (login pelas contas de exemplo em
`/api/exemplo/entrar`) em 3 viewports e grava screenshots + métricas; `kit/indice.cjs`
gera o índice; `kit/exportar-telas.cjs` gera os JPEGs desta pasta. Precisa de
`playwright-core` e do Chrome instalado (caminho fixo no script), com o app rodando em
modo produção (`npm run build && npm run start`). Rode a partir de uma cópia fora do
repositório: a saída vai para `../evidencias` relativo ao script.
