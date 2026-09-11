### performance-optimizer — NOTA HOJE: 46/100 (ontem: 45)
**Conceito na sua régua:** D+ (2,8) — mesma faixa de ontem. O time acertou o achado #1 (memoização de sessão) e resolveu fontes de ponta a ponta, mas o problema que eu chamei de "o Hero" — CLS do `/inicio` do prestador — não foi corrigido: foi **reconstruído maior** e piorou.

**Veredito (2-3 linhas):** `getCurrentUser` agora é `React.cache()` de fato (lib/auth/roles.ts:1,30) e a Poppins saiu do `<link>` render-blocking pra `next/font/google` self-hosted (app/layout.tsx:2,12-17) — dois acertos reais, verificados no código. Mas o padrão "consulta em série sem `Promise.all`" que eu apontei no `/inicio` não foi corrigido — foi replicado na landing (`app/page.tsx`) e cresceu no próprio `/inicio` (mais anúncios, comissão, sinalizações), e o Hero recém-redesenhado (pedido do Leonardo, "quero HERO bonito") reintroduziu o mesmo defeito de CLS em escala maior: 0,203 → **0,291**, cruzando de "precisa melhorar" pra "ruim".

**Ontem → hoje**

| recomendação de ontem | status | evidência |
|---|---|---|
| `React.cache` em `getCurrentUser`/`requireUser` | **feita** | `lib/auth/roles.ts:1,30` — commit `61ffc26 perf(auth): sessao memoizada por requisicao` |
| `getActiveWorkspace(list?)` reaproveitando a lista do layout | **não feita** | `lib/auth/workspace.ts` não importa `cache` de `react`; `getMyWorkspaces` é chamada de novo em `app/(app)/layout.tsx:26-27`, na própria página (`getActiveWorkspace` em 7+ arquivos) e em `lib/auth/modules.ts:51` — mesma ida ao banco repetida por request, só que agora em mais lugares (praças, financeiro, módulos) |
| `unstable_cache` pro clima + `HeroCard` recebe previsão por prop | **não feita** | `components/hero-card.tsx:81-122` ainda é 100% client, `agora`/`climaAgora`/`previsao`/`frase` nascem `null` e só chegam depois de montar + `fetch` a `/api/clima` (linha 108). CLS **piorou**: 0,203 → 0,291 |
| `Suspense` granular no `/inicio` do prestador | **não feita** | `app/(app)/inicio/page.tsx:194-301` — agora ~13 `await` sequenciais pro prestador (cresceu: anúncios, `limite_de_anuncios`, comissões, pagamento informado) |
| `next/font/google` pra Poppins | **feita** | `app/layout.tsx:12-17`, `display:"swap"`, variável `--font-poppins` |
| Preconnect pra `tile.openstreetmap.org` + ícones do Leaflet locais | **não feita** | `components/maps/pontos-map.tsx:10-12` ainda aponta pra `unpkg.com`; nenhum `preconnect` pra `tile.openstreetmap.org` em nenhum `.tsx` do repo |
| Fotos de demo `w=88&h=88` | **feita por outro caminho** | pipeline mudou de Unsplash 400×400 pra `scripts/fotos-publicas.mjs` (retrato randomuser.me pelo gênero) — o `Avatar` já documentava WebP 256px ~10KB; `kbPorTipo.img` da landing caiu de 129 KB pra 0 no perfil de rede capturado |
| `"regions": ["iad1"]` no `vercel.json` | **não feita** | `vercel.json` só tem `crons`, sem `regions` |

**Como cheguei na nota:**
- TTFB das páginas logadas (30%): ontem 35 → hoje **40**. `getCurrentUser` memoizado ajuda, mas `getActiveWorkspace`/`getMyWorkspaces` não — e a landing, que era rápida (192 ms), regrediu pra 542 ms por ganhar uma nova consulta RPC serial.
- LCP crítico (20%): ontem 40 → hoje **50**. `/buscar-prestador` saiu de "ruim" (4.172 ms) pra "precisa melhorar" (3.860 ms) e `/mapa` quase saiu de "ruim" (4.072→3.980 ms) — mas `/inicio` do prestador **entrou** em "precisa melhorar" vindo de "bom" (2.460→3.740 ms).
- CLS do Hero (15%): ontem 35 → hoje **22**. Regrediu de "precisa melhorar" pra "ruim" (limite é 0,25; hoje está em 0,291) — no exato componente que era o achado CRÍTICO de ontem.
- Fontes e imagens (20%): ontem 45 → hoje **68**. Fonte resolvida de ponta a ponta; Leaflet e `images.remotePatterns` continuam pendentes, mas o maior item (Poppins render-blocking) saiu da lista.
- Cache/streaming/`force-dynamic` (15%): ontem 40 → hoje **38**. Zero `Suspense`/`unstable_cache`/`"use cache"` em todo o repo (`grep` não achou nenhum); a landing ganhou mais uma consulta em série; em contrapartida, `/praca/financeiro/page.tsx:131-139` mostra que o time SABE paralelizar (`Promise.all` com 7 consultas) quando constrói do zero — só não voltou pra retrofitar as páginas antigas.

> Nota de honestidade: TTFB "bom" pelo limiar da tabela (<800 ms) ainda vale pra maioria das rotas — não é isso que está pesando. O que pesa é a direção do movimento: relativa a ontem, quase toda métrica de páginas autenticadas ficou estável ou levemente pior, e a única melhora de LCP clara (buscar-prestador, mapa) ainda está na faixa "precisa melhorar", não "bom".

**O que está bom**
- `React.cache()` em `getCurrentUser` é a correção certa, no lugar certo, com o comentário explicando o "porquê" (`lib/auth/roles.ts:26-29`) — exatamente o quick win #1 de ontem, bem executado.
- Poppins agora self-hosted via `next/font/google` (`app/layout.tsx:12-17`) — resolve LCP de texto (zero requisição a `fonts.googleapis.com`) e, de bônus, o achado de LGPD sobre IP vazando pro Google antes do consentimento.
- `/praca/financeiro/page.tsx:131-139` faz 7 consultas em `Promise.all` — página nova, mas prova que o padrão certo existe no time; falta generalizar.
- Avatar (`components/ui.tsx:112-124`) continua `<img>` nativo com `width`/`height` explícitos e `lazy`, evitando reflow em lista — decisão documentada e mantida.
- Middleware ficou estável em 64,5 kB apesar de dezenas de rotas novas (praça, financeiro, recibos, sinalizações) — não inchou proporcionalmente ao produto.
- `PontosMap` continua via `next/dynamic` com placeholder de altura fixa — sem CLS no mapa (0,000 nos dois dias).

**Problemas**
[CRÍTICO] CLS do Hero do prestador **piorou**: 0,203 (ontem) → **0,291** (hoje), cruzando o limiar de "ruim" (0,25) — `components/hero-card.tsx:255-266`, o bloco de temperatura (`climaAgora`) não tem nenhum placeholder reservado enquanto carrega (diferente do bloco de previsão de 4 dias, que tem esqueleto em `animate-pulse`, linhas 296-302); quando o `fetch` de `/api/clima` resolve, esse bloco nasce do zero e empurra o layout. (NOVO — o Hero de ontem era outro componente, mais simples.)
[CRÍTICO] `getMyWorkspaces`/`getActiveWorkspace` (`lib/auth/workspace.ts:20-45`) continuam sem `cache()` do React — o mesmo defeito de `getCurrentUser` de ontem, só que ainda vivo, e agora chamado de mais lugares (`layout.tsx` 2×, cada página de Administrador 1×, `lib/auth/modules.ts:51` mais 1×) — pode ser 3-4 idas ao banco por request numa página de praça.
[ALTO] `app/page.tsx` (landing) ganhou uma nova cascata serial: `getCurrentUser` → `fotosContasExemplo` → `rpc("anuncios_publicos")` → só então `<VitrineServicos>` roda seu próprio `createServerClient()`+query (`components/landing/vitrine-servicos.tsx:80`). TTFB da landing quase triplicou: 192 ms → 542 ms. Continua `force-dynamic` (linha 15), sem `unstable_cache`. (NOVO — antes só havia a consulta de fotos.)
[ALTO] `/inicio` do prestador cresceu pra ~13 `await` sequenciais sem `Promise.all` (`app/(app)/inicio/page.tsx:194-301`: slots, contagens, faturamento, perfil, Pix, anúncios ativos, RPC de limite, comissões abertas, pagamento informado) — o mesmo achado de ontem, agora com mais consultas empilhadas em série. LCP dessa página regrediu de "bom" (2.460 ms) pra "precisa melhorar" (3.740 ms) e o TBT quase dobrou (143→309 ms).
[MÉDIO] Ícones do Leaflet continuam vindo de `unpkg.com` em runtime (`components/maps/pontos-map.tsx:10-12`) — quick win de ontem não aplicado.
[MÉDIO] (NOVO) Páginas de recibo (`/recibo/comissao/[prestadorId]/[mes]`) têm TTFB entre 1,5 s e 2,6 s no `RESUMO-METRICAS.md` de hoje (linhas 88, 104, 120, 139, 153, 167) — rota nova, sem cache, com várias consultas administrativas em série (`pracaAtivaDoAdmin`, `pracasDoAtor`, `reciboMensal`).
[BAIXO] Sem `images.remotePatterns` no `next.config.ts` e sem `"regions"` no `vercel.json` — nenhum dos dois quick wins de ontem foi aplicado.

**Possibilidades de melhoria**
1. `cache()` do React em `getMyWorkspaces` (mesma receita já usada em `getCurrentUser`) · P ≤ 1 dia · corta 2-4 idas ao banco por página de Administrador/SysAdmin — é literalmente copiar o padrão que já funcionou.
2. Placeholder de tamanho fixo pro bloco de temperatura do Hero (`min-h` reservando a altura do card mesmo com `climaAgora===null`) · P ≤ 1 dia · deve zerar a maior parte dos 0,291 de CLS.
3. Buscar o clima no SERVIDOR (dentro de `/inicio/page.tsx`, com `unstable_cache` de ~10 min por cidade) e passar `previsao`/`climaAgora` como prop pro `HeroCard` — elimina o `fetch` client-side inteiro, não só o CLS · M ≤ 1 semana.
4. `Promise.all` nos blocos do prestador em `/inicio/page.tsx` (agenda, contadores, comissão, anúncios são independentes entre si) · M ≤ 1 semana · deve devolver o LCP pra faixa "bom".
5. Mover `fotosContasExemplo` + `anuncios_publicos` da landing pra `unstable_cache` (revalida a cada poucos minutos — não é dado por usuário) e paralelizar com a query do `VitrineServicos` · M ≤ 1 semana · TTFB da landing de volta pra faixa de ontem.

**Quick wins**
- Ícones do Leaflet importados localmente (`node_modules/leaflet/dist/images/*`) em vez de `unpkg.com`.
- `min-height` no bloco de temperatura do Hero enquanto `climaAgora` é `null`.
- `"regions": ["iad1"]` no `vercel.json` (Supabase em us-east-2).
- `cache()` em `getMyWorkspaces` (uma linha de import + `export const getMyWorkspaces = cache(...)`).
- `<link rel="preconnect" href="https://tile.openstreetmap.org">` no layout do app.

**Se eu só pudesse mudar uma coisa agora:** dar ao Hero do prestador um `min-height` reservado no bloco de temperatura — é a única regressão CRÍTICA nova nesta rodada (0,203→0,291, "precisa melhorar" pra "ruim") num componente que o próprio Leonardo pediu pra ficar "bonito e elegante"; hoje ele é bonito e instável.
