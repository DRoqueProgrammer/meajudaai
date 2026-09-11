# Vistoria de 11/09/2026 — 2ª rodada do conselho (depois de "faça todas as recomendações")

Os mesmos nove agentes de 10/09 avaliaram de novo o web app, agora contra o build de produção do
commit `e08e529` (144 commits depois de `da13908`), a pedido do Leonardo: *"Fizemos o que eles
pediram. Peça nova rodada de avaliação, quero ver score e possibilidades de melhoria sugeridas por
cada agente, e no final um score geral e recomendação geral crítica."* Controller Opus 5, agentes
Sonnet. Mesmo briefing, mesma régua de nota, mesmo kit de captura (roteiro ampliado com as telas
novas). Cada agente leu o próprio parecer de ontem e marcou cada recomendação como feita / parcial /
não feita, com evidência.

## Notas

| Parecer | Agente | Ontem | Hoje | Δ |
|---|---|---|---|---|
| [01](./pareceres/01-conselheira-design.md) | conselheira-design | 55 | **73** | +18 |
| [02](./pareceres/02-conselheiro-eng-software.md) | conselheiro-eng-software | 51 | **54** | +3 |
| [03](./pareceres/03-claude-best-practices-specialist.md) | claude-best-practices-specialist | 62 | **57** | −5 |
| [04](./pareceres/04-conselheiro-administrador.md) | conselheiro-administrador | 41 | **67** | +26 |
| [05](./pareceres/05-marketing-specialist.md) | marketing-specialist | 38 | **70** | +32 |
| [06](./pareceres/06-conselheira-protecao-dados.md) | conselheira-protecao-dados | 28 | **66** | +38 |
| [07](./pareceres/07-performance-optimizer.md) | performance-optimizer | 45 | **46** | +1 |
| [08](./pareceres/08-supabase-specialist.md) | supabase-specialist | 45 | **80** | +35 |
| [09](./pareceres/09-code-reviewer.md) | code-reviewer | 64 | **82** | +18 |
| | **Geral (média simples)** | **48** | **66** | **+18** |

Na régua comum: de "protótipo com problemas estruturais" (40–59) para **"funcional, com lacunas
visíveis" (60–74)**.

## Métricas objetivas (mesmo kit, mesmas contas)

| | Ontem (144 páginas) | Hoje (193 páginas) |
|---|---|---|
| Páginas com estouro horizontal | 5 | **0** |
| Contraste abaixo do mínimo (média/página) | 4,4 | **1,5** |
| Campos sem rótulo | 107 | **29** |
| Interativos sem nome acessível | 8 | 26 (pinos do Leaflet) |
| Alvos de toque < 24px (média/página) | 8,9 | 11,3 |
| `/inicio` do prestador, celular 4G: LCP · CLS · TBT | 2,46 s · 0,203 · 143 ms | **3,74 s · 0,291 · 309 ms** |
| `/buscar-prestador`, LCP | 4,17 s | 3,86 s |
| Landing, TTFB | 192 ms | 542 ms |

## O que o controller conferiu na fonte

- **Procede — CRÍTICO LGPD:** `chaves_pix`, `recebimentos`, `notas_avulsas` e `comissoes` não
  aparecem em `lib/titular/anonimizar.ts` nem em `lib/titular/exportar.ts` — a chave Pix sobrevive
  à "exclusão da conta" que a Política promete.
- **Procede — ALTO design:** texto invisível no cartão selecionado do cadastro ("Quero prestar
  serviço") — `app/(auth)/cadastro/form.tsx:123,135` e captura `anon__cadastro-prestador__mobile__1de3.png`.
- **Procede — cobertura:** `npm run test:coverage` dá **25,16%** hoje; o README publica 33,76%. A
  queda vem do código de servidor que dobrou (testado por integração, fora da conta unitária).
  *Correção (mesmo dia, ao escrever o handover):* a frase original dizia que "a lógica pura segue
  100%" — não segue. `npm run test:coverage:puro` dá **57,15%**, porque `lib/admin/**` e
  `lib/titular/**` (falam com o banco) caíram dentro da medida e alguns arquivos puros novos
  entraram sem teste. Detalhe em [`2026-09-11_MATHEUS_HANDOVER.md`](../../../../2026-09-11_MATHEUS_HANDOVER.md) §6.2.
- **Procede — performance:** `lib/auth/workspace.ts` sem `cache()`; CLS do Hero do prestador 0,291
  (medido pelo kit).
- **Procede — CI:** `.github/workflows/ci.yml` roda só a suíte unitária.
- **Contexto acrescentado (03):** o mural "Necessita-se ajudante!" da landing é o mural de anúncios
  pedido pelo dono (D-034), não resíduo da v1.
- **Decisões do dono questionadas (06):** D-045 (sinalizações como registro da administração, fora
  do "Baixar meus dados") e D-036 (foto aleatória também em conta real). São pedidos explícitos do
  Leonardo — o parecer vai para ele decidir, não para o controller reverter.

## Recomendação geral crítica

O salto de 48 para 66 é real e está onde havia trabalho **concreto e verificável**: segurança no
banco (supabase +35, code-reviewer +18), LGPD de base (+38), superfícies públicas e SEO (+32), a
jornada do Administrador (+26) e a fundação de design (+18). Mas as três lentes que medem
**disciplina** — performance (+1, com regressão), engenharia (+3) e simplicidade (−5) — mostram o
mesmo padrão: o time soube somar, não soube subtrair. Em 30 horas entraram comissão, Financeiro em
grade, recibos, Pix, red flags e suspensão; não saiu nenhuma linha de v1 morta, nenhuma página antiga
ganhou `Promise.all`, a Agenda v2 continua sem zod, e a disciplina de "regra no banco + gabarito de
ataque" que fechou os CRÍTICOS de ontem não foi estendida às features novas de dinheiro.

O risco mudou de lugar: ontem era segurança de acesso; **hoje é dinheiro + dado pessoal**, justamente
na camada construída por último — chave Pix que sobrevive à exclusão (promessa falsa na Política,
conferida), módulo financeiro fora do "Baixar/Excluir meus dados", Política silenciosa sobre
comissão e recibos, sinalizações visíveis a estranhos e ocultas do próprio alvo, comissão invisível
para o prestador até ele estar devendo, e PII liberada no primeiro "pendente" sem limite de pedidos.

**Recomendação:** um ciclo curto de **congelamento de funcionalidades** (2–3 dias) para pagar a
dívida que a velocidade criou, nesta ordem:

1. **Horas, antes de qualquer outra coisa:** incluir `chaves_pix`, `recebimentos`, `notas_avulsas`
   e `comissoes` em `anonimizarTitular`/`exportarDadosDoTitular`; corrigir o texto invisível do
   cadastro; `min-height` no bloco de temperatura do Hero; `cache()` em `getMyWorkspaces`; avisar a
   comissão no cadastro do prestador.
2. **Dinheiro e dado pessoal (dias):** gatilho/policy no banco para as transições de comissão e
   pagamento (o padrão da 0038, com gabarito que ataca de fora); limite de pedidos pendentes por
   cliente e menos PII no "pendente"; atualizar a Política (financeiro, sinalizações, fonte das
   fotos); o Leonardo rever D-045 e D-036 com a conselheira de dados.
3. **Subtração (dias):** apagar `lib/auth/demo.ts` + `/api/demo/enter` + agenda antiga; decidir e
   documentar `/vagas`, `/financeiro` v1 e `/relatorios`; um só CSS de recibo; zod + `useActionState`
   na Agenda v2; `Promise.all` no `/inicio` e na landing; número de cobertura medido de novo e versão
   do `package.json` subida.
4. **Negócio (fora do código):** validar a alíquota com 3–5 prestadores reais e decidir uma
   consequência visível para comissão em atraso (um selo "em dia"), antes de abrir Niterói.

Se o próximo ciclo continuar só somando telas, a nota estaciona perto de 65 e o que derruba o
lançamento deixa de ser um bug de acesso e passa a ser uma reclamação de privacidade ou uma briga por
comissão.

## Evidências

- `pareceres/00-briefing-do-conselho.md` — o briefing comum desta rodada.
- `metricas/` — `RESUMO-METRICAS.md`, `manifest.json`, `perf-mobile-4g.json`, `build-output.txt` (hoje).
- `telas/` — o **"depois"**: 135 telas (celular 390px e desktop 1000px), mesmo padrão de nome da pasta
  de 10/09 (`{papel}__{página}__{viewport}.jpg`).
- `kit/` — o kit de captura de 10/09 com o roteiro ampliado (porta 3100, telas novas).
- Comparar com [`../2026-09-10-vistoria/`](../2026-09-10-vistoria/README.md).
