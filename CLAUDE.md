# Contexto do Projeto — Me Ajuda Aí

Marketplace de agendamento de serviços (construção civil e manutenção): Prestador de Serviço mantém uma agenda de horários, Cliente busca por proximidade e agenda direto — mais parecido com um sistema de salão/clínica do que um mural de vagas. Cada cidade é uma **praça** (tenant) com um Administrador, que cobra comissão por serviço realizado. Fase atual: protótipo funcional, em pivô da v1 (mural de vagas por diária, cujo código ainda existe) pra essa v2.

**A fonte da verdade do produto é o [ROADMAP.md](./ROADMAP.md)** — papéis, regras de negócio, matriz de visibilidade de logs, decisões (ADR inline) e a auditoria do que falta (seção 0, sempre a primeira coisa a ler numa sessão nova). Continuidade entre sessões (o que mudou de modelo pra modelo) fica em [HANDOVER.md](./HANDOVER.md). Decisões do dono ficam em [`cvg/docs/tech-spec/_decisoes-travadas.md`](./cvg/docs/tech-spec/_decisoes-travadas.md) (D-001 a D-048).

**Quem chega agora começa por [2026-09-11_MATHEUS_HANDOVER.md](./2026-09-11_MATHEUS_HANDOVER.md):** a segunda avaliação do conselho, o backlog priorizado dos nove pareceres, as decisões pendentes com o Leonardo, como rodar e como trabalhar aqui.

Os arquivos abaixo são a **especificação original da v1** (FlutterFlow + Firebase, mural de vagas) — históricos, não descrevem o produto atual: [ESPECIFICACOES_MeAjudaAi.md](./ESPECIFICACOES_MeAjudaAi.md), [REFERENCIA_VISUAL_MeAjudaAi.md](./REFERENCIA_VISUAL_MeAjudaAi.md), [design/MeAjudaAi_styleguide.html](./design/MeAjudaAi_styleguide.html) (identidade visual ainda válida: azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, fonte Poppins). [docs/documentacao.html](./docs/documentacao.html) e [docs/apresentacao.html](./docs/apresentacao.html) também datam da v1 e precisam de uma atualização pra refletir os papéis/tabelas novos.

## Estado e avaliação (11/09/2026)

Um conselho de nove agentes avalia o app com a mesma régua: 90–100 produção · 75–89 bom · 60–74 funcional com lacunas · 40–59 protótipo com problemas estruturais. As notas foram **48** em 10/09 e **66** em 11/09. A recomendação vigente é **congelar funcionalidades por 2–3 dias** e pagar a dívida de **dinheiro + dado pessoal**, que se concentra em comissão, Financeiro, Pix, recibos e red flags. Os itens mais urgentes:
- `chaves_pix` e as tabelas financeiras fora da anonimização e da exportação do titular;
- texto invisível no cadastro;
- CLS do Hero;
- `getMyWorkspaces` sem `cache()`;
- comissão invisível no cadastro do prestador.

Pareceres, métricas e telas ficam em `cvg/brain/refs/2026-09-1{0,1}-vistoria/`. Numa nova rodada, use o mesmo método: um controller confere na fonte os achados CRÍTICOS, e **todo subagente roda em Sonnet**. O briefing está em `pareceres/00-briefing-do-conselho.md` e o kit de captura em `kit/`.

**Cobertura real** (re-medida em 11/09): `test:coverage` dá 25,16% e `test:coverage:puro` dá 57,15%, e não os 100% publicados antes. O motivo e o plano estão no handover, seção 6.2. Não publique número de cobertura sem rodar o comando no mesmo dia.

## Convenção de documentação
- **Banco:** toda tabela e coluna tem `COMMENT ON` (padrão iniciado na migration `0019`); as funções PL/pgSQL também. Visível no Dashboard do Supabase e no `\d+`. Ao criar/alterar tabela, comente também.
- **Código:** funções de `lib/` têm docstring TSDoc; cada componente e cada rota do App Router têm um comentário de topo. Mantenha o padrão (conciso, explica o "porquê", em PT-BR) ao adicionar código.

## Stack
Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage + RLS) + TypeScript + Tailwind — web/PWA responsivo. Server Actions (`"use server"` + `useActionState` + FormData) como padrão de escrita; formulários funcionam sem JavaScript sempre que possível. (A Agenda v2, `lib/actions/agenda-v2.ts`, ainda não segue esse padrão nem usa zod — é dívida conhecida.)

Repos de referência em `refs/`: agentspec, amazing-school-app (molde do Financeiro em grade), caixa-forte-app, careconnect (filtros na URL), foco-contabil, mirante-dos-dados-br, professional-presentations e vr-pilates. Servem pra portar padrões já resolvidos (Telegram, IBGE, Hero/clima, Pix, mapa de pessoas, Financeiro) em vez de reinventar. Cada um já tem uma pasta `.ua/` (saída de um scan do Understand Anything) pronta pra consumo: `.ua/intermediate/scan-result.json` traz o inventário completo de arquivos por categoria/linguagem/framework. Consulte esse `.ua/` antes de explorar um repo arquivo por arquivo — é bem mais barato que rescanear. O `CLAUDE.md` de cada repo (ex. `refs/foco-contabil/CLAUDE.md`) também condensa padrões e decisões em prosa, geralmente mais direto que o `.ua` pra entender o "porquê".

## Regras de código que já custaram caro
- **Regra no banco, não só na action.** O navegador fala direto com o Supabase com a chave pública: invariante de dinheiro, estado ou PII mora em policy/gatilho, com gabarito que ataca de fora da aplicação (molde: migration `0038` + `tests/fatia1/servicos.test.ts`).
- **Escrita do Administrador:** `tryWriter`, depois o alcance por `lib/admin/alcance.ts` (`pracaAlcancada`/`atorAlcanca`, sempre pelo `workspace_id` do registro), depois o cliente service-role. Leituras de servidor ficam em `lib/admin/*.ts` com `import "server-only"`, nunca exportadas de arquivo `"use server"`.
- **Mundo de exemplo:** as contas de exemplo (`profiles.exemplo`) não veem nem alteram contas reais (`podeAgirSobre`, `lib/auth/exemplo.ts`). Toda consulta administrativa nova recorta por ele.
- **Dinheiro em centavos** (`lib/comissao/regras.ts`). **Datas em America/Sao_Paulo** por `lib/datas.ts` — nunca `toLocaleDateString` sem fuso.
- **LGPD:** tabela nova com dado pessoal entra em `lib/titular/anonimizar.ts` e `lib/titular/exportar.ts` no mesmo commit, e a Política (`app/(legal)/privacidade`) acompanha.

## Supabase
Projeto `meAjudaAi` · ref `opvdfyyijbgrwztnqldl` · região us-east-2 (substitui o antigo `meajudaai-mvp`/`zisvxszjrylnuqplkrlm` referenciado em docs da v1). Chaves em `.env.local` (não comitado): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Migrations aplicadas via **Supabase CLI**, não MCP: `SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase db push --linked` (o `SUPABASE_TOKEN` do `.env.local` é um Personal/Management API Token — Leonardo autorizou uso livre nele pra este projeto, incluindo criar tabelas e o que for preciso). Depois de toda migration nova, regenerar os tipos: `SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase gen types typescript --linked > lib/supabase/database.types.ts`, e trancar a migration na cerca `.cvg/gate.yaml` (revisada só por quem responde pelo repositório).

Schema em `supabase/migrations/` (sequencial, sem gaps confiáveis de numeração — confira o mais alto com `ls supabase/migrations` antes de criar o próximo; em 11/09 é a `0059`). Falta: registrar o auth hook (`custom_access_token_hook`) no Dashboard — o app funciona sem isso (fallback lê `profiles.tipo_base`). **Não registre sem antes escopar as políticas**: sem o hook, `current_app_role()` devolve `cliente` para todo mundo e as cláusulas de SysAdmin/Administrador das políticas (profiles_pii, profile_local, servicos, login_logs, mensagens, home_banner…) ficam adormecidas. Registrado o hook, elas acordam — e a conta de exemplo SysAdmin, que qualquer visitante abre pela landing, passaria a ler e escrever a plataforma inteira direto no banco (D-030 em `cvg/docs/tech-spec/_decisoes-travadas.md`).

## Idioma
Comunicação e conteúdo do produto em **português (BR)**.

## Fluxo de trabalho
Sem pressa e sem atalhos. Commits frequentes e pequenos (um por passo/mudança concluída, não um único commit gigante no fim). Toda validação de funcionalidade relevante pra UI é feita **rodando o app no browser localmente** antes de considerar concluído — teste automatizado sozinho não basta.

- **Como olhar a tela:** Chrome headless via `playwright-core` (`channel: "chrome"`), como em `scripts/regressao/fatia1.mjs`. O painel de navegador embutido, quando oculto, não roda `requestAnimationFrame` e fica preso em "Carregando…".
- **Contas de exemplo:** entre pelo link de 1 clique `/api/exemplo/entrar?papel=cliente|prestador_servico|admin|sysadmin|funcionario`, nunca digitando senha no navegador. Para voltar os dados de exemplo a um estado conhecido, use `scripts/{comissao,financeiro,sinalizacoes,enderecos}-exemplo.mjs` e `scripts/seed-anuncios.mjs`.
- **Testes:**
  - `npm test` roda a unidade;
  - `npm run test:integration` roda contra o banco real (`RUN_INTEGRATION=1`);
  - `bash scripts/regressao/rodar-fatia1.sh` roda o build de produção no Chrome;
  - `node scripts/regressao/qr-pix.mjs` lê o QR Pix.
  - Não rode `next build` com o `next dev` no ar no mesmo checkout.
- **Lotes em paralelo:** o `isolation: "worktree"` do Agent tool parte do `main` (a v1). Crie a worktree a partir do branch de trabalho (`feature/dev_2026-09-09`) e ligue o `node_modules` por junção.

## Convenção de UI — Hero de boas-vindas
Página inicial de **Cliente e Prestador de Serviço** (só esses dois — Leonardo confirmou ao vivo em 09/09/2026 que SysAdmin e Administrador não devem ver o Hero). Eles abrem em dashboards operacionais próprios, construídos em 10/09: **Painel da praça** (`components/admin/painel-da-praca.tsx`) e **Painel da plataforma** (`components/admin/painel-da-plataforma.tsx`). O Hero (`components/hero-card.tsx`) foi redesenhado em 10/09/2026 a pedido do Leonardo ("quero um hero BONITO, elegante"):
- **À esquerda:**
  - o período do dia e a data por extenso;
  - a saudação em tamanho de título, respeitando o gênero cadastrado (Bem-vindo/Bem-vinda/Bem-vinde + nome — ver `lib/saudacao.ts` e `lib/papel-label.ts`, que aplica o mesmo padrão aos rótulos de papel);
  - a **frase sorteada** de `lib/citacoes.ts`, com "Outra frase". As frases saíram na Fatia 3 (D-022) e **voltaram** a pedido dele.
- **À direita:** um painel com relógio grande, o tempo agora na cidade e os próximos 4 dias (Open-Meteo, pelo servidor em `/api/clima`).
- **Recolhido:** vira uma faixa, com um botão de 44px.

O bloco de temperatura precisa de altura reservada enquanto carrega; hoje ele causa CLS de 0,291 (item 3 do backlog do handover). Detalhes em [ROADMAP.md](./ROADMAP.md) §2.5 e §0 (auditoria).
