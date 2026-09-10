### performance-optimizer — NOTA: 45/100
**Conceito:** D+ (2,7) — dois LCPs em faixa "poor" e uma cascata de TTFB que se repete em toda página logada.
**Veredito:** O app acerta decisões estruturais (Leaflet via `next/dynamic` com placeholder de altura fixa, Avatar em `<img>` por razão documentada, preconnect pras fontes). Mas paga caro por não memoizar `getCurrentUser`/`requireUser` — a mesma verificação de sessão roda 2 a 4 vezes por request — e por deixar o Hero do prestador e os mapas dependerem de cascatas no cliente sem reserva de layout.

**Como cheguei na nota:**
- TTFB das páginas logadas (30%): 35 — 780–1.100 ms em quase toda rota autenticada.
- LCP de `/buscar-prestador` e `/mapa` (20%): 40 — 4.172 e 4.072 ms (Core Web Vitals: bom < 2.500 ms; ruim > 4.000 ms — os dois estão logo acima do limite de "ruim").
- CLS do Hero no `/inicio` do prestador (15%): 35 — 0,203 (bom < 0,1; ruim > 0,25 — faixa "precisa melhorar").

> Nota do controller: o parecer original dizia que os LCPs estavam "1,6–1,7× acima do limite poor"; na verdade estão 1,6–1,7× acima do limite de **bom** (2,5 s) e logo acima do de **ruim** (4 s). Corrigido aqui e no relatório.
- Fontes e imagens (20%): 45.
- Cache/streaming/`force-dynamic` (15%): 40.

**O que está bom**
- `PontosMap` via `next/dynamic` com `ssr:false` e placeholder de altura fixa (`components/maps/pontos-map-dynamic.tsx:7-14`).
- `Avatar` (`components/ui.tsx:91-118`) sem `next/image` por motivo documentado (WebP 256px ~10 KB do Storage).
- `app/(app)/loading.tsx` é o esqueleto certo (skeleton com `aria-busy`, `prefers-reduced-motion`).
- First Load JS modesto (103–148 kB).
- Preconnect para as fontes já presente.

**Problemas**
[CRÍTICO] `getCurrentUser`/`requireUser` sem memoização, 2–4× por request — `app/(app)/layout.tsx:14`, `app/(app)/inicio/page.tsx:88`, `lib/auth/workspace.ts:16,34-40`; cada chamada faz `auth.getUser()` + query em `profiles` (`lib/auth/roles.ts:24-35`).
[CRÍTICO] LCP 4,1 s em `/buscar-prestador` e `/mapa`: o LCP acontece depois do `load` — cadeia HTML → hidratação → chunk do Leaflet (script sobe de ~119 para 160 kB) → init → tiles de `tile.openstreetmap.org` sem preconnect → paint.
[CRÍTICO] CLS 0,203 no `/inicio` do prestador — `HeroCard` 100% client, `citacao`/`previsao` começam `null` (`components/hero-card.tsx:33-34`) e só chegam depois de dois `fetch` sequenciais ao Open-Meteo (52-73), sem espaço reservado.
[ALTO] Poppins por `<link>` com 5 pesos, render-blocking, sem `next/font` (`app/layout.tsx:38-41`).
[ALTO] `/` é `force-dynamic` e consulta o Supabase (admin client) a cada request só pra 5 fotos (`app/page.tsx:12,38-42`).
[ALTO] Zero `Suspense` granular: `/inicio` do prestador roda ~10 queries sequenciais sem `Promise.all` (`inicio/page.tsx:88-229`).
[MÉDIO] Ícones do Leaflet de `https://unpkg.com` em runtime (`components/maps/pontos-map.tsx:10-12`).
[MÉDIO] Fotos de demo em 400×400 exibidas a 44 px (129 KB de 274 KB da landing) — `scripts/seed-fake-data.mjs:29-33`.
[BAIXO] Sem `images.remotePatterns`. [BAIXO] `vercel.json` sem `regions` (Supabase em us-east-2).

**Contribuições de melhoria**
1. `React.cache` em `getCurrentUser`/`requireUser` · P · corta 2–4 idas ao Supabase por request.
2. `getActiveWorkspace(list?)` reaproveitando a lista do layout · P.
3. `unstable_cache` para fotos de demo e clima no servidor; `HeroCard` recebe a previsão por prop · M · CLS 0,203 → ~0.
4. `Suspense` granular no `/inicio` do prestador (agenda/faturamento num Server Component próprio) · M.
5. `next/font/google` para Poppins · P.
6. Preconnect para `tile.openstreetmap.org` + ícones do Leaflet importados localmente · P.
7. `w=88&h=88` nas fotos de demo + `"regions": ["iad1"]` no `vercel.json` · P.

**Quick wins**
- Unsplash `w=400&h=400` → `w=88&h=88`.
- Ícones do Leaflet locais.
- Preconnect para os tiles.
- `"regions": ["iad1"]`.
- Passar `wsList` pra `getActiveWorkspace`.

**Se eu só pudesse mudar uma coisa:** `React.cache()` em `getCurrentUser`/`requireUser` — elimina de 2 a 4 idas redundantes ao Supabase em toda página logada, sem tocar em regra de negócio.
