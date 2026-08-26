# ADR 0005 — Contas de demonstração read-only

- **Status:** Aceito
- **Data:** 2026-08-26 (formaliza decisão tomada no início do protótipo)
- **Contexto do parecer:** Administração (demonstrar o produto sem cadastro)

## Contexto

Para avaliar o protótipo (banca, investidor, usuário curioso) sem obrigar
cadastro, o app oferece contas de demonstração (`/api/demo/enter`). O risco:
visitantes "sujarem" ou destruírem os dados de demonstração, ou assumirem a conta
de forma persistente.

## Decisão

Contas demo entram com cookies **session-only** (sem `maxAge`/`expires`: caem ao
fechar o navegador) e são **read-only** — a UI e os guards não deixam a conta demo
escrever. A pessoa navega por dados de seed realistas, mas não altera nada.

## Alternativas consideradas

- **Sandbox por visitante (dados efêmeros isolados):** experiência melhor, mas
  exige provisionar e limpar dados por sessão — caro para o protótipo.
- **Demo com escrita real:** dados viram lixo em uma tarde de tráfego.
- **Vídeo/screenshots em vez de app vivo:** não deixa explorar de verdade.

## Consequências

- **+** Qualquer um experimenta o produto em segundos, sem cadastro.
- **+** Os dados de demonstração permanecem íntegros para o próximo visitante.
- **−** O visitante não sente o fluxo de escrita (publicar, candidatar) na pele.
- **−** Manter o gate read-only coerente em toda action nova é responsabilidade
  contínua (parte dos inegociáveis de segurança).
