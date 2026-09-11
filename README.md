# Me Ajuda Aí — Protótipo (v2)

**Versão 0.0.2** — a versão vive no `version` do [package.json](./package.json) e é lida de lá pelo rodapé do site (`components/footer.tsx`), que a mostra em todas as páginas. Fonte única: bumpe no `package.json` e o site acompanha. *Pendência:* a versão não sobe desde antes das cinco fatias de 10–11/09. A convenção abaixo pede o bump, e o conselho cobrou isso (ver o [handover de 11/09](./2026-09-11_MATHEUS_HANDOVER.md), item 6).

**Convenção de bump:** toda entrega que muda o produto sobe a versão e reporta a cobertura junto. A meta é **100%**, medida em dois números separados porque a maquinaria é diferente:

| Medida | Comando | Hoje (11/09/2026) | Meta |
|---|---|---|---|
| "Lógica pura" de `lib/` (exclui `lib/actions` e `lib/supabase`) | `npm run test:coverage:puro` | **57,15%** (era 100% em 08/09) | 100% |
| `lib/` inteiro, incluindo ações de servidor | `npm run test:coverage` | **25,16%** (o 33,76% publicado antes não reproduzia) | 100% (via teste de integração) |

**Por que a medida "pura" caiu:** o código de servidor novo que fala com o banco (`lib/admin/**` e `lib/titular/**`) ficou dentro dela, e alguns arquivos puros novos entraram sem teste unitário (`lib/clima.ts`, `citacoes.ts`, `tipos-servico.ts`, `fonte-assinatura.ts`, entre outros). Os módulos de regra novos (`lib/comissao/regras.ts`, `lib/financeiro/*`, `lib/pix/*`) estão em 99–100%. O plano está no [handover de 11/09](./2026-09-11_MATHEUS_HANDOVER.md), seção 6.2 e item 23: testar os puros e decidir, por escrito, se `lib/admin`/`lib/titular` saem da medida para serem cobertos por integração.

As ações de servidor (`lib/actions/**`) falam com o banco no corpo inteiro. Por isso a cobertura delas vem de **teste de integração contra o banco real** (`npm run test:integration`), não de banco falso: 576 de 577 testes verdes. O único vermelho é o banner do SysAdmin, que depende do auth hook ([ADR 0009](./cvg/docs/adrs/0009-o-god-mode-de-sysadmin-nas-policies-esta-inerte.md)). A integração ainda não roda no CI.

Marketplace de agendamento de serviços de manutenção civil. O **Prestador de Serviço** mantém uma agenda de horários disponíveis e o **Cliente** busca por proximidade e agenda direto com ele — mais parecido com um sistema de salão/clínica do que um mural de vagas. São quatro papéis v2: **SysAdmin** (dono da plataforma), **Administrador** (responsável por uma **praça**, a instalação de uma cidade, que cobra comissão por serviço realizado), **Prestador de Serviço** e **Cliente**. O **Funcionário** é da v1.

Este é um pivô em andamento a partir de uma v1 (mural de vagas por diária, cujo código ainda existe). A especificação completa, decisões de arquitetura e a lista do que falta vivem em **[ROADMAP.md](./ROADMAP.md)** — leia a seção 0 (Auditoria) primeiro. Continuidade entre sessões fica em **[HANDOVER.md](./HANDOVER.md)**.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Postgres + Auth + Storage, RLS em toda tabela) · TypeScript · Tailwind CSS. Server Actions como padrão de escrita.

## Estado atual

Um conselho de nove agentes avaliou o app duas vezes. Em 10/09 deu **48/100**; em 11/09, depois das recomendações, deu **66/100** ("funcional, com lacunas visíveis"). A recomendação é congelar funcionalidades por 2–3 dias e pagar a dívida de dinheiro + dado pessoal. Notas, achados de cada agente e o backlog priorizado estão em **[2026-09-11_MATHEUS_HANDOVER.md](./2026-09-11_MATHEUS_HANDOVER.md)**. Os pareceres completos ficam em [`cvg/brain/refs/2026-09-11-vistoria/`](./cvg/brain/refs/2026-09-11-vistoria/README.md).

**O que já existe na v2:**
- **Cliente:**
  - busca por proximidade e vitrine pública do prestador (`/p/[id]`, sem login);
  - agendamento com período preferido e tipo de serviço;
  - avaliação;
  - red flags ao prestador.
- **Prestador:**
  - agenda em janelas, com a hora da visita combinada;
  - serviços e clientes, com endereço e mapa do serviço;
  - anúncios, incluindo "Necessita-se ajudante!";
  - faturamento por tipo e várias chaves Pix, com QR que tem os dados no meio;
  - **Financeiro** (`/meu-financeiro`): clientes × meses, com recibo sem valor fiscal enviado pelo WhatsApp;
  - **Comissão** (`/comissao`): saldo, QR e "Enviei o Pix".
- **Administrador:**
  - Painel da praça, com as abas Serviços, Clientes, Prestadores e **Financeiro** (`/praca/*`);
  - comissões em grade (prestadores × meses), com OK por serviço, "marcar mês como pago", recibo mensal assinado e nota avulsa;
  - alíquotas em quatro níveis;
  - moderação de red flags ("Limpar red flags") e suspensão.
- **SysAdmin:**
  - Painel da plataforma;
  - praças e vínculo de Administrador;
  - logs e pedidos de exclusão (LGPD).
- **Todos:** "Baixar meus dados" e "Excluir meus dados", com carência de 7 dias e anonimização por cron.

## Rodar localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

`.env.local` (não comitado) precisa de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, além de `SUPABASE_TOKEN` (token de gestão, usado só pela CLI para aplicar migrations — ver [CLAUDE.md](./CLAUDE.md#supabase)). O `GEMINI_API_KEY` só é necessário para o juiz de revisão do Converge.

## Produção (Vercel)

- **Endereço:** https://meajudaai-jet.vercel.app. É o projeto `meajudaai` na conta Vercel do Leonardo (`leonardochalhoubs-projects`), ligado ao repositório privado `leonardochalhoub/meajudaai`: **todo push na `main` publica sozinho**.
- **Variáveis de ambiente (Production):**
  - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
  - `SUPABASE_SERVICE_ROLE_KEY` (sensível);
  - `CRON_SECRET` (sensível, gerado no Vercel; os crons do `vercel.json` o enviam sozinhos);
  - `NEXT_PUBLIC_SITE_URL=https://meajudaai-jet.vercel.app`, o host dos links que saem por e-mail. Nunca `localhost`.

  As `NEXT_PUBLIC_*` entram no build: se mudar alguma, faça um redeploy.
- **Região das funções:** `cle1` (Cleveland), a mesma do banco (Supabase us-east-2).
- **Supabase Auth:** o Site URL é o endereço de produção, e os Redirect URLs são `https://meajudaai-jet.vercel.app/**` e `http://localhost:3000/**`. Se trocar de domínio, atualize `NEXT_PUBLIC_SITE_URL` e essas duas configurações. Senão, os e-mails de confirmação e de recuperação de senha apontam para o lugar errado.
- **E-mail:** o projeto usa o SMTP padrão do Supabase, que tem limite baixo de envios por hora e, pela política atual do Supabase, só entrega para endereços da equipe do projeto. Antes de abrir o cadastro para gente de fora, configure um SMTP próprio (Resend, Amazon SES…) em Authentication → SMTP.

## Contas de exemplo

Contas reais (não read-only), uma por papel, com dados e ~3 anos de histórico simulado. Senha única: `MeAjudaAi2026!`.

| Papel | Nome | E-mail |
|---|---|---|
| SysAdmin | Ricardo Bastos | `ricardo.bastos@meajudaai.app` |
| Administrador | Marcelo Lopes | `marcelo.lopes@meajudaai.app` |
| Prestador de Serviço | João Ferreira | `joao.ferreira@meajudaai.app` |
| Funcionário | Beatriz Andrade | `beatriz.andrade@meajudaai.app` |
| Cliente | Marina Costa | `marina.costa@meajudaai.app` |

Para entrar, faça login normal em `/login` ou clique no card correspondente na landing (`/`). O card entra via `/api/exemplo/entrar?papel=...`, com cookie de sessão: fechou o navegador, a sessão cai. Lista completa em `lib/auth/contas-exemplo.ts`. As contas de exemplo vivem num **mundo de exemplo** isolado (`profiles.exemplo`): não veem nem alteram contas reais.

**Dados de exemplo** (idempotentes; rode de novo para voltar ao estado conhecido):

```bash
node scripts/comissao-exemplo.mjs       # alíquotas, chave Pix fictícia do Administrador, comissões de 2026
node scripts/financeiro-exemplo.mjs     # clientes de exemplo, serviços, recebimentos
node scripts/sinalizacoes-exemplo.mjs   # red flags aprovadas na Marina
node scripts/enderecos-exemplo.mjs      # endereço (sem número) + ponto no mapa das contas de exemplo
node scripts/seed-anuncios.mjs          # prestadores e anúncios do mural
```

## Banco (Supabase)

Schema em `supabase/migrations/` (até a `0059`), todas as tabelas com RLS ativa e `COMMENT ON` (tabela, coluna e função). As invariantes de fluxo, dinheiro e PII moram no banco (policy e gatilho), não só na action, porque o navegador fala direto com o Supabase. Peças centrais do modelo v2:

- **Identidade:**
  - `profiles`, com `status`, a marca `exemplo` e `emite_nota_fiscal`;
  - `profiles_pii`: PII separada, com telefone;
  - `chaves_pix`: até 5 por pessoa, uma padrão;
  - `profile_local`: endereço e PIN exato, RLS só do dono e do SysAdmin, nunca exposto por API. `lat_aprox`/`lng_aprox` são a versão segura para mapa.
- **Praça:** `workspaces` é a praça (um tenant por cidade, com Administrador responsável), junto com `workspace_members`.
- **Agenda e serviço:**
  - `agenda_slots`, `servicos` e `tipos_servico`;
  - `servico_logs`, privados de quem escreveu;
  - `servico_comentarios_admin`.
  - O gatilho `validar_transicao_servico` trava a máquina de estados.
- **Anúncios:** `anuncios` e `anuncio_limites`.
- **Moderação:** `suspeitas_prestador`, `sinalizacoes`, `sinalizacoes_cliente` e `suspensoes_prestador`.
- **Comissão e Financeiro:**
  - `aliquotas_comissao`, em quatro níveis;
  - `comissoes`, geradas por gatilho quando o serviço vira realizado;
  - `pagamentos_comissao`, `recebimentos`, `notas_avulsas` e `assinaturas`.
- **LGPD e auditoria:**
  - `pedidos_exclusao`, com a carência travada por gatilho;
  - `login_logs`: IP, dispositivo e geolocalização, só o SysAdmin lê, expurgo com 180 dias.
- **v1 ainda no código:** `vagas`, `vaga_local`, `candidaturas`, `avaliacoes` e `user_modules`.

Proximidade sem vazar coordenada exata: funções `SECURITY DEFINER` (`buscar_prestadores_proximos`, `meus_clientes_no_mapa`) calculam distância/pino aproximado no servidor e nunca devolvem `lat`/`lng` reais. O padrão das funções `SECURITY DEFINER` é fixar `search_path = ''`, com `revoke`/`grant` explícitos.

Aplicar migrations e regenerar tipos: ver [CLAUDE.md](./CLAUDE.md#supabase). A cerca `.cvg/gate.yaml` tranca as migrations já aplicadas. Não se edita migration aplicada: cria-se outra.

## Estrutura

```
app/            Rotas (App Router):
                  (auth) login/cadastro · (app) telas por papel (praca/*, meu-financeiro, comissao…)
                  (documento) recibos sem o menu · (legal) termos/privacidade · p/[id] vitrine pública
                  api/ exemplo, meus-dados, clima, cron (titular, lembretes)
components/     UI, nav, agenda, mapas (Leaflet), financeiro (grade, filtros), pix, recibo, admin
lib/
  supabase/     clientes server/browser/admin + tipos gerados (database.types.ts)
  auth/         papéis, guards, praça ativa, mundo de exemplo
  actions/      server actions (escrita)
  admin/        leituras de servidor do Administrador (server-only) + alcance por praça (alcance.ts)
  comissao/     regras puras da comissão e dos recibos (centavos, taxa média, valor por extenso)
  financeiro/   grade pessoa × mês, avisos do recibo
  titular/      exportar e anonimizar (LGPD)
  pix/          payload do Pix estático (BR Code)
  datas.ts      datas em America/Sao_Paulo (use sempre)
  *.ts          utilitários BR, categorias, validação, formatação, rótulos com gênero
supabase/       migrations do schema (Supabase CLI)
scripts/        dados de exemplo e regressão no navegador (scripts/regressao/)
tests/          unidade + integração (banco real, RUN_INTEGRATION=1)
cvg/            Converge: tech-spec, decisões travadas, ADRs, vistorias do conselho (cvg/brain/refs/)
docs/           documentação e apresentação (HTML) — ainda descrevem a v1, precisam de atualização
refs/           repos de referência p/ portar padrões (não versionar; cada um tem .ua/ pronto pra consulta)
```

## Testes

```bash
npm test                                   # unidade, sem banco (427)
npm run test:integration                   # banco real — exige RUN_INTEGRATION=1 no .env.local
bash scripts/regressao/rodar-fatia1.sh     # build de produção + 10 passos no Chrome
node scripts/regressao/qr-pix.mjs          # decodifica o QR Pix gerado pelo app (jsQR)
npm run test:coverage                      # cobertura de lib/ inteiro
npm run test:coverage:puro                 # cobertura da lógica pura
npx tsc --noEmit                           # tipos
```

A integração cria usuários e dados, verifica isolamento por RLS e ataca as regras **de fora da aplicação** (ex.: `tests/fatia1/servicos.test.ts`), depois limpa o que criou. Não rode `next build` com o `next dev` no ar no mesmo checkout: os dois escrevem em `.next`.
