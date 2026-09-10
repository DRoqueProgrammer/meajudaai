### conselheiro-eng-software — NOTA: 51/100
**Conceito na minha régua:** C (1,0) — abaixo do piso de aprovação (média ≥ 2,0).
**Veredito (2-3 linhas):** O código que existe é organizado e disciplinado — guards consistentes, contrato de retorno estável, CI limpo, 248 testes verdes. Mas a métrica de "100% de cobertura" que o projeto exibe mede a fatia de menor risco do sistema; a camada que decide "quem pode escrever o quê" (as próprias Server Actions, ~2.200 linhas) não tem nenhum teste automatizado direto, e a fronteira de segurança está partida em duas: leitura por uma RLS comprovadamente furada/inerte (ADR 0002, 0009) e escrita por `service_role` que ignora a RLS por completo. Isso não é polimento faltando — é estrutural.

**Como cheguei na nota:**
- Arquitetura (App Router, Server Actions, clientes Supabase) — peso 25% — nota parcial 60
- Pirâmide de testes vs. fronteira de segurança declarada (RLS) — peso 30% — nota parcial 40
- CI/CD e reprodutibilidade — peso 20% — nota parcial 65
- Coexistência v1/v2 e resíduo morto — peso 15% — nota parcial 35
- Processo Converge (custo × benefício) — peso 10% — nota parcial 55

## O que está bom

- **Contrato de Server Action consistente.** `ActionResult { ok, erro? }` (`lib/actions/auth.ts:17-20`) e `EstadoForm` (`lib/actions/form.ts`) cobrem os dois casos de uso (botão imperativo vs. `useActionState`), e 17 dos 19 arquivos em `lib/actions/` passam por `tryWriter()`/`requireWriter()` (`lib/auth/guard.ts:15-34`) antes de qualquer escrita — inclusive bloqueio de conta demo no próprio guard, não espalhado.
- **`conversas.ts` documenta a própria exceção.** Não é `"use server"`, usa client admin, e o comentário de topo (`lib/actions/conversas.ts:3-7`) explica por quê: funções internas chamadas só por outras actions já guardadas.
- **CI enxuto e com razão declarada.** `.github/workflows/ci.yml` roda `npm ci` → typecheck → lint → test em cada push/PR pra `main`, com `concurrency` e `permissions: contents: read` mínimo. O comentário nas linhas 6-8 explica por que `test:integration` fica de fora (escreve em banco real) — decisão correta, documentada.
- **Comandos somente-leitura confirmam a saúde local:** `npm run typecheck` — zero erros; `npm run lint` — zero erros, 1 warning inofensivo (`app/layout.tsx:38`, fonte customizada); `npm test` — 248 passed, 22 skipped (o `rls.test.ts` esperando `RUN_INTEGRATION=1`), 1,15s.
- **Os ADRs 0002, 0008 e 0009 são o melhor artefato de engenharia do repositório.** Medidos contra o banco real, falsificáveis, e já mudaram prioridade real.

## Problemas

**[CRÍTICO]** A fronteira de segurança está dividida e nenhuma das duas metades funciona como o projeto acredita. Leitura: `profiles_select_all` é `using (true)` desde a `0001` (`cvg/docs/adrs/0002-leitura-de-perfis-e-global.md:23-29`). Escrita: todo Server Action relevante usa `createAdminClient()` (`lib/supabase/admin.ts:9-14`, `service_role`), presente em 26 arquivos (`lib/actions/workspace.ts:41`, `lib/actions/vagas.ts:62` etc.) — a escrita nunca passa pela política da tabela, só pelo guard escrito à mão. A objeção C2 do Pass 4 ("o navegador fala direto com o banco", `HANDOVER.md:79`) não foi estendida à escrita. Se um guard tiver bug, não existe rede embaixo.

**[CRÍTICO]** A pirâmide de teste está invertida em relação ao risco. `README.md:10-14`: lógica pura de `lib/` = 100%, mas `lib/` inteiro incluindo ações = **33,76%**, e "as ações de servidor estão em 0%". Nenhum arquivo em `tests/` importa algo de `lib/actions/`. As 2.197 linhas de `lib/actions/` não são exercitadas por nenhum teste. `app/` (4.881 linhas) e `components/` (5.932 linhas) têm zero automação (sem Playwright/Cypress).

**[ALTO]** Resíduo de v1 é um sistema paralelo ativo. 9 rotas do mural de vagas compiladas e servidas em produção (`/vagas`, `/vagas/[id]`, `/minhas-vagas`, `/minhas-vagas/[id]/candidatos`, `/minhas-vagas/[id]/editar`, `/avaliar/[vagaId]`, `/chat/vaga/[vagaId]`, `/minhas-diarias`, `/publicar`). Dobra a superfície de teste/RLS/guard. O sintoma vazou: a 404 global (`app/not-found.tsx:13,19`) diz "A vaga pode ter sido cancelada" e linka `/vagas`.

**[MÉDIO]** Código morto com teste dedicado. `lib/auth/demo.ts` (rótulos v1 "Profissional", "Ajudante", "Moderador") é auto-declarado obsoleto (`lib/auth/contas-exemplo.ts:2-4`). `app/api/demo/enter/route.ts` usa esse módulo e não é referenciado por nenhuma UI. `tests/auth-demo-guard.test.ts` tem 16 testes cobrindo esse caminho morto — 6,4% da suíte.

**[BAIXO]** `vitest.config.ts:24-25` diz "o número de hoje é 9,84%" — defasado.

**[BAIXO]** Sem checagem de drift entre migrations e `database.types.ts` no CI.

**[BAIXO]** Nenhum workflow gateia o deploy real do app (Vercel) — se a integração não tiver "require checks to pass", dá pra publicar com PR vermelho.

## Contribuições de melhoria

1. **1 teste de integração por Server Action de escrita crítica** (agenda, serviço, convite, denúncia), chamando a função de `lib/actions/` de verdade. Esforço M. Fecha o buraco mais caro.
2. **ADR declarando qual camada é a fronteira de verdade** para escrita (guard de aplicação) e leitura (RLS, após 0002/0009). Esforço P.
3. **Cortar as 9 rotas de v1** do build ou isolá-las por flag, quando Admin/Funcionário migrarem. Esforço M.
4. **Apagar `lib/auth/demo.ts`, `app/api/demo/enter/route.ts` e `tests/auth-demo-guard.test.ts`.** Esforço P.
5. **Smoke e2e mínimo** (Playwright: login por papel, agendar, ver 404). Esforço M.

## Quick wins

- Atualizar/remover o comentário de `vitest.config.ts:24-25`.
- Trocar o texto de `app/not-found.tsx:13,19` para linguagem v2.
- Apagar `app/api/demo/enter/route.ts` + `lib/auth/demo.ts`.
- Step opcional no CI: `supabase gen types` + `diff` com o arquivo commitado.
- Anotar no HANDOVER/ROADMAP a cobertura real de `lib/actions` ao lado dos 100% de `lib/` puro.

## Se eu só pudesse mudar uma coisa

Cobriria `lib/actions/` com teste de integração de verdade — resolve ao mesmo tempo o problema mais caro (a camada que decide segurança não tem rede) e o mais enganoso (o "100%" mede a parte errada do risco).
