# Briefing do Conselho — avaliação do web app "Me Ajuda Aí" (10/09/2026)

Você é um dos 9 agentes convocados pelo controller (Opus 5) a pedido do Leonardo, dono do produto.

## O pedido do Leonardo

> "Analisar o web app e melhorar o que for possível, incluindo responsividade. Cada agente dá uma
> nota de 0 a 100, com comentário e contribuição de melhoria. No final, uma nota geral e uma
> recomendação resumida. [...] O nosso design está feio também."

Seu parecer vira insumo de um relatório consolidado que o Leonardo vai ler. Seja específico,
honesto e acionável.

## O produto

- **Marketplace de agendamento de serviços** de construção civil e manutenção. O Prestador de
  Serviço mantém uma agenda de horários; o Cliente busca por proximidade e agenda direto — mais
  parecido com sistema de salão/clínica do que com mural de vagas.
- **Fase:** protótipo, em pivô ativo da v1 (mural de vagas por diária: "Profissional publica
  diária → Ajudante se candidata") para essa v2. Há resíduo da v1 no código e na interface.
- **Papéis:** SysAdmin (dono da plataforma, supra-praça) · Administrador (gere uma "praça") ·
  Prestador de Serviço · Cliente · Funcionário (papel customizado com módulos liberados).
- **Praça** = tenant por cidade (decisão D-001): uma instalação por cidade, com nome próprio,
  isolamento total entre praças.
- **Público real:** eletricistas, pedreiros, encanadores e seus clientes — uso majoritariamente
  **no celular**, muitas vezes na obra, com pouca paciência para interface complicada.
- **Identidade visual (ainda válida):** azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`,
  fonte Poppins. Styleguide v1 em `design/MeAjudaAi_styleguide.html`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 (tokens em CSS variables,
`tailwind.config.ts` + `app/globals.css`) · Supabase (Postgres + Auth + Storage + RLS) ·
Server Actions (`"use server"` + `useActionState` + FormData) · Leaflet (mapas) · PWA ·
Vercel (deploy + cron) · CI em `.github/workflows/ci.yml` · Vitest (20 arquivos de teste,
248 testes unitários; 100% de cobertura na lógica pura de `lib/`; testes de integração de RLS
em `vitest.integration.config.ts`).

## Onde está a verdade do projeto

- `ROADMAP.md` §0 — auditoria do que falta (leia primeiro). `HANDOVER.md` — continuidade.
  `CLAUDE.md` — convenções.
- `cvg/docs/tech-spec/fechar-v2-marketplace.md` (36 requisitos `R-n`), `cvg/docs/adrs/`
  (9 ADRs medidos contra o banco real), `cvg/docs/CONTEXT.md` (vocabulário). O projeto roda sob
  um processo formal ("Converge", 9 passes com gates).
- `ESPECIFICACOES_MeAjudaAi.md`, `REFERENCIA_VISUAL_MeAjudaAi.md`, `docs/*.html` = **v1,
  históricos**. Não descrevem o produto atual.

## Já conhecido e registrado (não é descoberta nova — mas pode e deve pesar na nota e na prioridade)

- **ADR 0002:** a policy `profiles_select_all` usa `using (true)` — qualquer autenticado lê todos
  os perfis.
- **ADR 0009:** o "god mode" do SysAdmin nas policies está inerte — o auth hook
  `custom_access_token_hook` nunca foi registrado no painel; `current_app_role()` cai no default
  `'ajudante'` (papel que não existe mais). 45 cláusulas de policy dependem disso. O app disfarça
  com fallback próprio (`profiles.tipo_base`).
- **Hero "feio"** (card de boas-vindas de Cliente/Prestador) — pendência de design sem direção
  (GAP-002).
- **SysAdmin e Administrador caem no `/inicio` genérico** — precisam de dashboard próprio.
- **Não construídos (declarado):** cobrança Pix, comissão da plataforma, recibos, aba Financeiro
  do prestador, dashboard do prestador, carrossel de fotos, aprovação de cadastro de prestador,
  Telegram, papéis dinâmicos, home do cliente com últimos serviços.
- **Contas de exemplo** reais e editáveis (`lib/auth/contas-exemplo.ts`), entrada em 1 clique na
  landing (`/api/exemplo/entrar?papel=...`).

Não penalize a *ausência* de algo listado como "não construído" como se fosse bug. Avalie a
qualidade do que existe HOJE e se as prioridades fazem sentido.

## Kit de evidências (gerado hoje contra o build de produção, `next start` em localhost)

Pasta: `C:\Users\leoch\AppData\Local\Temp\claude\C--Users-leoch-projects-meajudaai\77d53f84-d612-4728-9ffa-b8d2df3d75b7\scratchpad\evidencias\`

- `INDICE.md` — lista de todas as telas capturadas, por papel e página. **Comece por aqui.**
- `RESUMO-METRICAS.md` — tabela por página × viewport: estouro horizontal, alvos de toque
  < 24px / < 44px, fonte mínima, nº de tamanhos de fonte distintos, contraste abaixo do mínimo
  (aproximado), interativos sem nome acessível, campos sem label, erros de console, TTFB. Mais um
  passe de performance em celular médio (4G lenta 1,6 Mbps / 150 ms + CPU 4x, cache frio):
  TTFB, FCP, LCP, CLS, TBT, KB, requisições.
- `manifest.json` — os mesmos dados com os **exemplos** de cada infração (seletor + texto do
  elemento), H1/H2 de cada página, erros de console.
- `perf-mobile-4g.json` — passe de performance detalhado.
- `build-output.txt` — saída do `next build` (tamanho e First Load JS por rota).
- `shots/` — screenshots PNG. Nome: `{papel}__{página}__{viewport}__{N}de{Total}.png`. Cada
  arquivo é **uma tela**: o que o usuário vê numa posição de rolagem (header sticky e nav fixa
  aparecem como na vida real). Viewports: `mobile` 390×844 @2x · `tablet` 768×1024 ·
  `desktop` 1440×900. Sufixos de página: `-escuro` (tema escuro), `-primeira-visita` (landing
  com o banner de cookies, sem consentimento prévio). Abra com a ferramenta Read.
- O login foi feito como: Marina Costa (cliente), João Ferreira (prestador, eletricista),
  Marcelo Lopes (administrador), Ricardo Bastos (sysadmin), Beatriz Andrade (funcionário).

## Quem mais está no conselho (foque na SUA lente; não gaste tempo no escopo dos outros)

| Agente | Lente |
|---|---|
| conselheira-design (Mirante) | visual, UX, tipografia, responsividade, acessibilidade, design system |
| conselheiro-eng-software (Mirante) | arquitetura, testes, CI/CD, reprodutibilidade, observabilidade |
| claude-best-practices-specialist (Mirante) | simplicidade, over-engineering, código morto, duplicação |
| conselheiro-administrador (Mirante) | propósito, utilidade real, jornada, prioridades, monetização |
| marketing-specialist (foco-contabil) | landing, posicionamento, copy, onboarding, go-to-market por praça |
| conselheira-protecao-dados (caixa-forte) | LGPD — dados pessoais, consentimento, direitos do titular, políticas |
| performance-optimizer (caixa-forte) | Core Web Vitals, bundles, renderização, fontes, imagens, mobile |
| supabase-specialist (AgentSpec) | RLS, Auth, migrations, funções SECURITY DEFINER, Storage |
| code-reviewer (AgentSpec) | segurança de aplicação (OWASP) e corretude: actions, rotas, middleware |

## Regras (obrigatórias)

- **SOMENTE LEITURA.** Não edite nem crie arquivos no repositório, não faça commit, não rode
  migration nem SQL, não instale pacotes, não suba servidor, não abra navegador, não tente logar
  no app. Não use a chave de serviço do Supabase (o banco é o protótipo real).
- **Nunca rode `npm run build` / `next build`** (quebraria o servidor de produção em execução) nem
  `npm run test:integration` (escreve no banco real).
- Pode: ler código e docs, `grep`/`ls`/`git log`/`git show`, e ver os screenshots.
- Ignore partes da sua persona que dependam de ferramentas indisponíveis aqui (MCP `conselho`,
  MCP do Supabase, KB `${CLAUDE_PLUGIN_ROOT}/kb/...`, projetos de outros repositórios) e ignore o
  formato de parecer da persona — use o formato abaixo, mantendo a voz, o rigor e a régua dela.
- Caminhos no repo: `C:\Users\leoch\projects\meajudaai\`. Cite evidência como `arquivo:linha` ou
  pelo nome do screenshot.

## Formato de entrega (obrigatório — o controller consolida a partir dele)

Responda em **português do Brasil**, em markdown, exatamente nesta estrutura:

```
### <nome-do-agente> — NOTA: NN/100
**Conceito na sua régua (se você tiver uma):** <ex.: B (2,0)>
**Veredito (2-3 linhas):** ...

**Como cheguei na nota:** 3 a 5 sub-critérios, cada um com peso (%) e nota parcial 0-100,
que compõem a nota final.

**O que está bom** — 3 a 6 bullets, cada um com evidência.

**Problemas** — ordenados por gravidade. Cada um:
[CRÍTICO|ALTO|MÉDIO|BAIXO] descrição — evidência (arquivo:linha ou screenshot) — impacto.

**Contribuições de melhoria** — priorizadas. Cada uma: o quê · como, concretamente ·
esforço (P ≤ 1 dia / M ≤ 1 semana / G > 1 semana) · impacto esperado.

**Quick wins** — até 5 coisas de até ~1h cada.

**Se eu só pudesse mudar uma coisa:** ...
```

**Calibragem da nota (use esta, para as notas serem comparáveis entre agentes):**
90–100 pronto para produção / referência de mercado · 75–89 bom, ajustes pontuais ·
60–74 funcional, com lacunas visíveis · 40–59 protótipo com problemas estruturais ·
abaixo de 40 precisa ser refeito.

Tamanho: 900–1.500 palavras (a conselheira-design pode ir até ~2.500, porque também entrega
direção de design). Nada de "poderia melhorar a UX" — diga o quê, onde e como.
