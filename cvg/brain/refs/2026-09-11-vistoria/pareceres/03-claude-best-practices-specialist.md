### claude-best-practices-specialist — NOTA HOJE: 57/100 (ontem: 62)
**Conceito na sua régua:** C (degrau 3 de 7 — igual a ontem: ainda reusa em boa parte do app, mas não subiu nenhum degrau na feature que mais importa, e abriu duplicação nova em outra frente).

**Veredito:** O incêndio mais visível foi apagado — o CRÍTICO de ontem (CTA de vaga v1 pro SysAdmin) está corrigido de verdade, com painel próprio pro Administrador e pro SysAdmin. Mas nenhuma das minhas recomendações estruturais (migrar Agenda v2 pro padrão, zerar o código morto confirmado, padronizar validação) foi tocada, e o dia produziu duplicação nova: três páginas de recibo com o mesmo bloco de CSS de impressão colado três vezes, e o mural de vagas v1 ganhou um megafone na landing pública em vez de encolher.

> **Nota do controller:** o "mural de vagas" da landing (`components/landing/mural-vagas.tsx`) não é resíduo da v1 — é o mural de anúncios "Necessita-se ajudante!" pedido pelo dono em 10/09 (D-034, anúncios do prestador com limite por praça). O achado sobre ele deve ser lido como "documentar a decisão", não como vazamento do pivô.

**Ontem → hoje**

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| Branch explícito pro SysAdmin em `/inicio`, remover CTA "QUERO TRABALHAR"/`/vagas` | **Feita** | `app/(app)/inicio/page.tsx:597` agora tem `admin ? null : sysadmin ? null : cliente ? (...)`; painel próprio em `:687-689` (`PainelDaPlataforma`) e `:661-685` (`PainelDaPraca`) |
| Migrar `agenda-v2.ts` + 6 componentes pra `useActionState`/FormData + zod | **Não feita** | `lib/actions/agenda-v2.ts` (409 linhas) continua com input tipado, zero `import ... from "zod"`; `criar-slot-form.tsx`, `slot-reservar.tsx` etc. continuam em `useTransition`+`preventDefault` |
| Apagar `agenda-calendar.tsx`, `agenda-view.tsx`, `lib/agenda-conflitos.ts` + teste | **Não feita** | os 3 arquivos e `tests/agenda-conflitos.test.ts` continuam no disco; nenhuma página importa `agenda-calendar.tsx` ou `agenda-view.tsx` |
| Atualizar §0 do ROADMAP ao fechar sessões | **Feita** (o item citado) | `ROADMAP.md:42` corrigiu a linha do Pix, com nota explícita "a vistoria de 10/09 apontou que esta linha estava desatualizada" |
| Padronizar validação nas 14 actions sem zod | **Não feita** | hoje são 22 de 29 arquivos em `lib/actions/` sem zod (76%, era 74% ontem); dos 10 arquivos novos desde ontem, só `anuncios.ts` adotou zod |
| Um único lugar pras skills (`.claude/`, `.agents/`, `.grok/`) | **Não feita** | ainda 251/255/251 arquivos; a diferença de contagem é só `__pycache__` (bytecode Python rastreado por engano, ver Quick wins), o conteúdo real continua triplicado byte a byte |

**Como cheguei na nota:**
- Código morto / resíduo v1 vivo (20%): 60 → **56** — o pior sintoma sarou, mas o v1 ganhou palco novo (mural na landing) e nada do confirmado-morto foi apagado.
- Consistência de padrões — Server Actions, `useActionState`, zod (30%): 50 → **46** — a proporção de actions sem zod não melhorou, e 9 dos 10 arquivos novos entraram no padrão antigo.
- Duplicação vs. abstração que paga aluguel (20%): 78 → **60** — achei uma boa reutilização nova (grade financeira compartilhada), mas também uma duplicação nova e grosseira (CSS de recibo colado 3×).
- Inegociáveis — trust boundary, erro, acessibilidade (20%): 62 → **68** — a Fatia 1 fechou buracos reais de trust boundary a nível de banco; ainda falta validação de tamanho/formato em `agenda-v2.ts`.
- Documentação / instruções pra agentes (10%): 70 → **62** — o ROADMAP corrigiu o item citado, mas o volume de `cvg/` cresceu ~24 mil linhas num dia (a maior parte é um manifest.json auto-gerado, não prosa nova — mas ainda assim ~8,5 mil linhas de texto de processo autoral no mesmo dia em que o produto ganhou ~22 mil).

**O que está bom**
- `app/(app)/inicio/page.tsx:597` — o CRÍTICO de ontem está corrigido; Administrador e SysAdmin não caem mais no branch de "ajudante". O comentário em `components/admin/painel-da-praca.tsx:22-24` documenta o porquê ("troca o mural de vagas v1... que não fazia sentido pro papel") — exatamente o padrão de decisão nomeada que eu já elogiei ontem em `mapa/page.tsx`.
- `MatrizFinanceira` + `FiltrosFinanceiro` + `lib/financeiro/matriz.ts` são genuinamente compartilhados entre `/praca/financeiro` (Administrador, `app/(app)/praca/financeiro/page.tsx:22`) e `/meu-financeiro` (Prestador, `app/(app)/meu-financeiro/page.tsx:18`) — a abstração certa, sem duplicar a grade duas vezes.
- Nenhuma lib de gráfico foi adicionada pra `GraficoFaturamento` (`components/dashboard/grafico-faturamento.tsx`, 499 linhas) — SVG na mão em vez de nova dependência (degrau 5 do ladder respeitado; `package.json` não tem `recharts`/`d3`/`visx`).
- `lib/actions/anuncios.ts` (novo hoje) já nasce usando zod — mostra que o padrão certo é conhecido e acessível, só não foi levado pras outras 9 actions novas.
- A Fatia 1 de segurança (migrations 0038-0041) é real e verificável: serviço só nasce pelo fluxo, contato/Pix/endereço só entre as partes, cadastro público não aceita mais `admin` — isso melhora o "inegociável" trust boundary de verdade, mesmo fora da minha lente principal.
- `lib/auth/contas-exemplo.ts:2-4` documenta com honestidade que `lib/auth/demo.ts` "ficou obsoleto" — o time sabe que é lixo, só não tirou.

**Problemas**
- [ALTO] (NOVO) Três páginas de recibo criadas hoje (`app/(documento)/recibo/nota/[id]/page.tsx:117-157`, `.../recebimento/[id]/page.tsx:160-196`, `.../comissao/[prestadorId]/[mes]/page.tsx:249-303`) colam o MESMO bloco de ~40 linhas de CSS de impressão três vezes, trocando só o prefixo da classe (`.na-`, `.rr-`, `.recibo-`) — `folha`, `valor-card`, `assinatura-bloco`, `@media print` idênticos. Degrau que resolvia: extrair um `<FolhaRecibo>`/CSS module compartilhado — ~100 linhas de duplicação pura, e a próxima mudança de layout de impressão precisa lembrar de editar em 3 lugares.
- [ALTO] `lib/actions/agenda-v2.ts` continua sem zod e sem limite de tamanho em `descricao`/`endereco` (`reservarSlotAction:143-200`); é a mesma função que citei CRÍTICO... ALTO ontem, intocada. O padrão que o resto do app sabe fazer (zod + `useActionState`) não chegou na feature central do pivô.
- [MÉDIO] (NOVO) `components/landing/mural-vagas.tsx` (228 linhas, criado hoje no commit `942ac33`) publica "Necessita-se ajudante!" — o conceito de vaga v1 — na landing pública, algo que não existia ontem. O resíduo v1 não encolheu: ganhou visibilidade nova, na página que mais gente vê.
- [MÉDIO] `/financeiro` e `/relatorios` (v1, existem desde o commit inicial `4e3fc75`, workspace/diária) continuam de pé sem qualquer reconciliação com o `/praca/financeiro` e `/meu-financeiro` novos — agora há 3 conceitos de "financeiro" coexistindo sem nota no ROADMAP sobre quando um substitui o outro.
- [MÉDIO] (NOVO) `lib/auth/demo.ts` (59 linhas) e `app/api/demo/enter/route.ts` são código morto confirmado — o próprio `lib/auth/contas-exemplo.ts:3` diz "os usuários stub de lá nunca chegaram a ser semeados" — mas `lib/auth/guard.ts:2,17` ainda importa `isDemo` e chama numa checagem que roda em TODA server action de escrita do app, sem nunca poder ser verdadeira.
- [BAIXO] `agenda-calendar.tsx`, `agenda-view.tsx`, `lib/agenda-conflitos.ts` + teste continuam mortos, sem nenhuma página importando (mesmo achado de ontem, zero movimento).
- [BAIXO] `#0D47A1` continua hardcoded (`app/layout.tsx:57`, `components/denunciar.tsx:126`) e a landing (`app/page.tsx`) continua com ~27 valores arbitrários fora da escala do Tailwind (praticamente o mesmo número de ontem).
- [BAIXO] Skills do Converge continuam triplicadas (`.claude/skills`, `.agents/skills`, `.grok/skills`); a diferença de contagem (255 vs 251) é só `__pycache__` rastreado por engano — 3 arquivos `.pyc` versionados apesar do `.gitignore:32` já cobrir `__pycache__/`.

**Possibilidades de melhoria**
1. Migrar `agenda-v2.ts` + os 6 componentes pra `useActionState`/FormData + zod — mesma recomendação de ontem, ainda a mais importante · **G** · risco médio (muda assinatura das actions), mas é a única frente onde a feature nova está pior que a v1 que substitui.
2. Extrair o CSS de impressão dos 3 recibos pra um componente/CSS module único (`<FolhaRecibo variant="nota"|"recebimento"|"comissao">`) — resolve a duplicação de hoje antes que apareça um 4º recibo · **P-M** · risco baixo.
3. Decidir e documentar no ROADMAP o destino de `/financeiro` e `/relatorios` v1 (mantém pro fluxo de workspace/diária? substitui? esconde do módulo?) — hoje são 3 "financeiros" sem narrativa · **P** (decisão) + **M** (execução).
4. Apagar `lib/auth/demo.ts`, `app/api/demo/enter/route.ts` e a chamada `isDemo` em `lib/auth/guard.ts` — já documentado como obsoleto pelo próprio código, sem risco de regressão (nunca foi semeado) · **P** · risco muito baixo.
5. Decidir se `mural-vagas.tsx` na landing é intencional (uma frente "ajudante" que convive com a v2) ou vazamento do pivô — se for intencional, nomear a decisão no ROADMAP como fez `mapa/page.tsx:9-18` · **P** (decisão).
6. Apagar de vez `agenda-calendar.tsx`, `agenda-view.tsx`, `lib/agenda-conflitos.ts` + teste — terceira vez que aponto, continua de baixo risco · **P**.

**Quick wins**
- Apagar `lib/auth/demo.ts` + `app/api/demo/enter/route.ts` + a linha `isDemo` em `guard.ts` (código morto confirmado pelo próprio comentário do time).
- Apagar os 3 arquivos mortos da agenda antiga + o teste órfão.
- `git rm --cached` os 3 `.pyc` em `__pycache__` já cobertos pelo `.gitignore`.
- Trocar `#0D47A1` hardcoded em `layout.tsx:57` e `denunciar.tsx:126` pelo token.
- Fatorar o `<style>` dos 3 recibos num arquivo CSS único (mesmo que seja só um `import` compartilhado, sem componente novo).

**Se eu só pudesse mudar uma coisa agora:** migrar a Agenda v2 pro padrão `useActionState`+zod que o resto do app sabe fazer — três rodadas de trabalho depois, ainda é o único lugar onde a feature nova tem menos disciplina que a v1 que ela substitui, e cada função nova que entra nela (a feature central do pivô) reforça esse padrão em vez de corrigi-lo.
