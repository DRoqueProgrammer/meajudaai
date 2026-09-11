### conselheiro-eng-software — NOTA HOJE: 54/100 (ontem: 51)
**Conceito na minha régua:** C (1,0) — continua abaixo do piso de aprovação (média ≥ 2,0).
**Veredito (2-3 linhas):** A peça mais importante que pedi ontem foi entregue, e bem: as migrations 0038-0039 tiram do "guard escrito à mão" e colocam no banco (trigger + policy) exatamente as invariantes que eu tinha marcado como sem rede — nascimento/transição de serviço e exposição de contato/PII —, com gabarito que ataca de fora da aplicação para provar isso. Mas essa disciplina não se propagou: a superfície de escrita sem teste direto quase dobrou (`lib/actions` 2.197→4.380 linhas, mais `lib/admin/` novo com 1.139 linhas) sem receber o mesmo tratamento, e a métrica que o próprio projeto publica para medir esse risco não reproduz mais — medi agora com o comando exato do README e o número é outro.

**Ontem → hoje:**

| Recomendação/quick win de ontem | Status | Evidência |
|---|---|---|
| 1 teste de integração por Server Action de escrita crítica (agenda, serviço, convite, denúncia) | **Parcial** — melhor que o pedido, só no núcleo | Migrations `0038_servico_nasce_e_muda_pelo_fluxo.sql`, `0039_contato_e_endereco_entre_as_partes.sql` movem R-37/38/39/40/41 para trigger+RLS no banco; `tests/fatia1/servicos.test.ts:16-27` testa isso *fora* da aplicação. Fora desse escopo (comissão, financeiro, suspeitas, praças, convite), nada mudou. |
| ADR declarando a fronteira de verdade (escrita/leitura) | **Feita** | `cvg/docs/adrs/0010-a-escrita-em-servicos-confere-quem-escreve-nao-a-regra-do-agendamento.md` — nomeia o problema (regra só na aplicação) que a migration 0038 corrige. |
| Cortar as 9 rotas de v1 | **Não feita** | `app/(app)/vagas/`, `/vagas/[id]`, `/minhas-vagas`, `/minhas-vagas/[id]/{candidatos,editar}`, `/avaliar/[vagaId]`, `/chat/vaga/[vagaId]`, `/minhas-diarias`, `/publicar` — todas as 9 continuam no disco e compiladas. |
| Apagar `lib/auth/demo.ts`, `app/api/demo/enter/route.ts`, `tests/auth-demo-guard.test.ts` | **Não feita** | Os três arquivos existem intactos; `grep` por uso de `/api/demo/enter` em `app/`, `components/`, `lib/` só acha o próprio comentário do arquivo — continua sem nenhuma UI que chame. |
| Smoke e2e mínimo (Playwright: login, agendar, 404) | **Feita, e além** | `scripts/regressao/fatia1.mjs` (10 passos reais, Chrome via `playwright-core`, contra build de produção) e novo `scripts/regressao/qr-pix.mjs` (decodifica o QR Pix de verdade com jsQR) — ambos citados no `HANDOVER.md`. |
| Quick win: corrigir comentário de `vitest.config.ts:24-25` (9,84% defasado) | **Não feita** | `vitest.config.ts:30` ainda diz "o número de hoje é 9,84%" — mesmo texto de ontem, e hoje ainda mais desatualizado (ver Problemas). |
| Quick win: trocar texto v1 do `app/not-found.tsx` | **Feita** | Página não menciona mais "vaga"; agora linka "Ir para o início" e "Buscar prestadores". |
| Quick win: apagar `app/api/demo/enter/route.ts` + `lib/auth/demo.ts` | **Não feita** | Repetido acima. |
| Quick win: step de CI com `supabase gen types` + diff | **Não feita** | `.github/workflows/ci.yml` tem diff zero contra `da13908` (`git diff da13908..e08e529 -- .github/workflows/ci.yml` vazio). |
| Quick win: anotar cobertura real de `lib/actions` no HANDOVER/ROADMAP ao lado dos 100% | **Não feita / regrediu** | `README.md` está byte-a-byte igual desde ontem; o número publicado (33,76%) não reproduz mais — ver Problemas [CRÍTICO, NOVO]. |

**Como cheguei na nota:**
- Arquitetura (App Router, Server Actions, `lib/admin/*`, fronteira de escrita) — peso 25% — ontem 60 → hoje **65**
- Pirâmide de testes vs. fronteira de segurança declarada — peso 30% — ontem 40 → hoje **48**
- CI/CD e reprodutibilidade — peso 20% — ontem 65 → hoje **50**
- Coexistência v1/v2 e resíduo morto — peso 15% — ontem 35 → hoje **35**
- Processo Converge (custo × benefício) — peso 10% — ontem 55 → hoje **70**

Média ponderada ≈ 54.

## O que está bom

- **A correção mais cara do parecer de ontem foi feita corretamente, não superficialmente.** `supabase/migrations/0038_servico_nasce_e_muda_pelo_fluxo.sql:65-94` cria a policy `servicos_insert_cliente` com sub-consultas em `agenda_slots`/`profiles` (nasce só sobre horário livre, do prestador certo, no preço vigente), e `:156-219` cria o trigger `validar_transicao_servico` (`BEFORE UPDATE`) que trava a máquina de estados por papel e torna imutável o vínculo do serviço depois de nascido. `is_chamada_privilegiada()` (`:50-57`) distingue sessão real de `service_role`/seed com `auth.role()` vs `current_user` — um detalhe correto e nada trivial (RLS não filtra gatilho).
- **O gabarito que prova isso ataca de fora da aplicação, de propósito.** `tests/fatia1/servicos.test.ts:16-20`: *"Toda tentativa aqui é feita FORA da aplicação (...) Uma regra que só exista em `lib/actions/` não passa neste arquivo — é o critério do spec."* Isso é exatamente a rede de segurança que eu disse que faltava — e é mais forte do que testar a Server Action, porque prova que o banco resiste independente do código.
- **ADR 0010 nomeia a fronteira de verdade e é referenciado pela migration que a corrige** — a coisa mais próxima de "ADR que muda decisão real" que essa persona cobra. `cvg/docs/adrs/0010-...md` e o cabeçalho de `0038_...sql:1-12` se citam mutuamente.
- **`.cvg/gate.yaml` está sincronizado com a realidade, não decorativo.** As migrations trancadas vão de `0030_*` a `0059_*` — bate exatamente com `ls supabase/migrations | tail -1` (`0059_financeiro_em_grade.sql`). Isso é versionamento de infraestrutura levado a sério.
- **Regressão em navegador contra build de produção real, com contas reais, continua e ganhou um segundo roteiro.** `scripts/regressao/fatia1.mjs` (10/10, citado no `HANDOVER.md:71`) e `scripts/regressao/qr-pix.mjs`, novo — decodifica o QR Pix gerado pelo próprio app, relevante porque o commit avaliado hoje (`e08e529`) é justamente um fix nesse QR.
- **427 testes unitários verdes, `npx tsc --noEmit` limpo**, reproduzido agora mesmo, do zero.

## Problemas

**[CRÍTICO] (NOVO) A métrica de cobertura que o projeto publica não reproduz.** `README.md:10` afirma `33,76%` para `npm run test:coverage` (`lib/` inteiro, incluindo ações). Rodei o comando exato agora: `npx vitest run --coverage` devolve **25,16%** de statements/lines em `lib/**`. `README.md` está byte-idêntico ao commit de ontem (`git diff da13908..e08e529 -- README.md` vazio) — ou seja, o número nunca foi medido de novo, apesar de `lib/actions/` ter praticamente dobrado (2.197→4.380 linhas, `wc -l lib/actions/*.ts`) e `lib/admin/` ter nascido do zero (1.139 linhas, inexistente em `da13908`). A própria "Convenção de bump" do README (`README.md:5`) diz que *toda entrega que muda o produto sobe a versão e reporta a cobertura junto*; `package.json` mostra `"version": "0.0.2"` tanto em `da13908` quanto em `e08e529` — **zero bumps em 144 commits e cinco fatias**. Para quem cobra "reprodutibilidade é binário, não gradiente": este número não passou o teste.

**[CRÍTICO] (herdado, parcialmente mitigado) A fronteira de escrita continua dividida — mas o núcleo melhorou e o resto piorou em proporção.** O que a migration 0038/0039 protege é real, mas é uma fatia (agenda/serviços/contato). Comissão, Financeiro, Suspeitas, Praças, Convite — todos entraram ou cresceram desde ontem e continuam 100% dependentes de guard em JavaScript + `service_role` (que ignora RLS por completo), sem gatilho equivalente e sem teste que os exercite fora de `RUN_INTEGRATION`. `npx vitest run --coverage --coverage.include="lib/admin/**" --coverage.include="lib/actions/**"` (unitário, sem banco) dá **0,22%** de statements — praticamente todo esse código só é exercitado manualmente com `RUN_INTEGRATION=1`, que nunca roda em CI. Suspeitas e Comissão mexem em suspensão de conta e em dinheiro; é a superfície que mais deveria ter ganho a mesma rede que serviços ganhou, e foi a que ficou de fora.

**[ALTO] (repetido, não feito) Resíduo de v1 intacto.** As 9 rotas do mural de vagas (`/vagas`, `/vagas/[id]`, `/minhas-vagas` e subrotas, `/avaliar/[vagaId]`, `/chat/vaga/[vagaId]`, `/minhas-diarias`, `/publicar`) continuam compiladas e servidas, sem flag, sem aviso. Zero progresso desde ontem.

**[MÉDIO] (repetido, não feito) Código morto com teste dedicado, intocado.** `lib/auth/demo.ts`, `app/api/demo/enter/route.ts` (sem nenhuma referência de UI) e `tests/auth-demo-guard.test.ts` (16 dos 427 testes, ~3,7% da suíte) continuam existindo exatamente como ontem.

**[MÉDIO] (NOVO) Ações de escrita novas sem log estruturado.** `lib/log.ts` existe e é usado em 11 arquivos (`grep -c "logAction" lib/actions/*.ts`), mas `lib/actions/agenda-v2.ts` (a reserva/confirmação/cancelamento — o core do produto), `lib/actions/pracas.ts` (criação de praça e vínculo do Administrador — a ação de maior privilégio do sistema) e `lib/actions/denuncias.ts` não chamam `logAction` nenhuma vez. Se uma dessas escritas falhar silenciosamente em produção, não há linha em stdout para achar — exatamente o cenário que `lib/log.ts:5-9` diz que existe para evitar.

**[BAIXO] (repetido, não feito, e mais errado) `vitest.config.ts:30`** ainda diz "o número de hoje é 9,84%" — e hoje o número (rodando o mesmo comando) é 25,16% para `lib/**` sem filtro, ou 0,22% para `lib/actions`+`lib/admin` isolados. Nenhum dos dois é 9,84%.

**[BAIXO] (repetido) Sem checagem de drift entre migrations e `database.types.ts` no CI**, e **[BAIXO] (repetido) nenhum workflow gateia o deploy real** — `ci.yml` é idêntico ao de ontem em ambos os pontos.

## Possibilidades de melhoria

1. **Estender o padrão trigger+RLS de 0038/0039 para Comissão e Financeiro.** Como: pelo menos travar no banco as transições que não deveriam ser possíveis por um `UPDATE` direto (comissão "paga" não pode voltar a "pendente" fora do fluxo de confirmação; suspensão exige `motivo` não vazio, como já vale para cancelamento). Esforço G. Impacto: fecha o CRÍTICO que mais cresceu em superfície desde ontem, reusando um padrão que o time já provou saber fazer bem.
2. **Consertar o número publicado e automatizar contra divergência.** Como: atualizar `README.md`/`vitest.config.ts` com o valor reproduzido agora, e adicionar um passo (CI ou pre-commit) que roda `test:coverage` e falha/avisa se o número comitado divergir do medido. Esforço M. Impacto: a "convenção de bump" do próprio projeto passa a se auto-verificar, em vez de depender de disciplina manual que já falhou uma vez.
3. **Cortar as 9 rotas v1** do build (feature flag ou remoção, já que Admin/Funcionário ainda usam parte delas — decidir qual). Esforço M.
4. **Apagar `lib/auth/demo.ts` + `app/api/demo/enter/route.ts` + `tests/auth-demo-guard.test.ts`.** Esforço P — mesma recomendação de ontem, custo inalterado, ainda não paga.
5. **`logAction` em `agenda-v2.ts`, `pracas.ts`, `denuncias.ts`, `admin-servicos.ts`, `admin-users.ts`.** Esforço P. Fecha o buraco de observabilidade nas escritas de maior privilégio/risco.

## Quick wins

- Corrigir `README.md` (linha 10) e `vitest.config.ts:30` com o número reproduzido hoje.
- Apagar `lib/auth/demo.ts`, `app/api/demo/enter/route.ts` e `tests/auth-demo-guard.test.ts`.
- Bumpar a versão em `package.json` (mesmo que retroativamente, para "0.1.0") refletindo as 5 fatias entregues desde `0.0.2`.
- Adicionar `logAction` em `lib/actions/pracas.ts` (maior privilégio: criação de praça).
- Adicionar ao `HANDOVER.md`/`ROADMAP.md` uma linha explícita: "cobertura de `lib/actions`+`lib/admin` sob teste unitário puro = 0,22%; sob integração manual, não medido em CI."

## Se eu só pudesse mudar uma coisa agora

Reaplicaria o padrão de 0038/0039 (trigger + policy no banco, provado por um gabarito que ataca de fora da aplicação) na Comissão e no Financeiro. É a prova de que o time sabe construir a rede de segurança certa — só não a estendeu para onde a superfície de risco mais cresceu desde ontem.
