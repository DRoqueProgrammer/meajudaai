# Contexto do Projeto — Me Ajuda Aí

Marketplace de agendamento de serviços (construção civil e manutenção): Prestador de Serviço mantém uma agenda de horários, Cliente busca por proximidade e agenda direto — mais parecido com um sistema de salão/clínica do que um mural de vagas. Fase atual: protótipo, em pivô ativo da v1 (mural de vagas por diária) pra essa v2.

**A fonte da verdade do produto é o [ROADMAP.md](./ROADMAP.md)** — papéis, regras de negócio, matriz de visibilidade de logs, decisões (ADR inline) e a auditoria do que falta (seção 0, sempre a primeira coisa a ler numa sessão nova). Continuidade entre sessões (o que mudou de modelo pra modelo) fica em [HANDOVER.md](./HANDOVER.md).

Os arquivos abaixo são a **especificação original da v1** (FlutterFlow + Firebase, mural de vagas) — históricos, não descrevem o produto atual: [ESPECIFICACOES_MeAjudaAi.md](./ESPECIFICACOES_MeAjudaAi.md), [REFERENCIA_VISUAL_MeAjudaAi.md](./REFERENCIA_VISUAL_MeAjudaAi.md), [design/MeAjudaAi_styleguide.html](./design/MeAjudaAi_styleguide.html) (identidade visual ainda válida: azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, fonte Poppins). [docs/documentacao.html](./docs/documentacao.html) e [docs/apresentacao.html](./docs/apresentacao.html) também datam da v1 e precisam de uma atualização pra refletir os papéis/tabelas novos.

## Convenção de documentação
- **Banco:** toda tabela e coluna tem `COMMENT ON` (padrão iniciado na migration `0019`); as funções PL/pgSQL também. Visível no Dashboard do Supabase e no `\d+`. Ao criar/alterar tabela, comente também.
- **Código:** funções de `lib/` têm docstring TSDoc; cada componente e cada rota do App Router têm um comentário de topo. Mantenha o padrão (conciso, explica o "porquê", em PT-BR) ao adicionar código.

## Stack
Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage + RLS) + TypeScript + Tailwind — web/PWA responsivo. Server Actions (`"use server"` + `useActionState` + FormData) como padrão de escrita; formulários funcionam sem JavaScript sempre que possível.

Repos de referência em `refs/` (caixa-forte-app, careconnect, foco-contabil, mirante-dos-dados-br, professional-presentations, vr-pilates) — usados pra portar padrões já resolvidos (Telegram, IBGE, Hero/clima, Pix, mapa de pessoas) em vez de reinventar. Cada um já tem uma pasta `.ua/` (saída de um scan do Understand Anything) pronta pra consumo: `.ua/intermediate/scan-result.json` traz o inventário completo de arquivos por categoria/linguagem/framework. Consulte esse `.ua/` antes de explorar um repo arquivo por arquivo — é bem mais barato que rescanear. O `CLAUDE.md` de cada repo (ex. `refs/foco-contabil/CLAUDE.md`) também condensa padrões e decisões em prosa, geralmente mais direto que o `.ua` pra entender o "porquê".

## Supabase
Projeto `meAjudaAi` · ref `opvdfyyijbgrwztnqldl` · região us-east-2 (substitui o antigo `meajudaai-mvp`/`zisvxszjrylnuqplkrlm` referenciado em docs da v1). Chaves em `.env.local` (não comitado): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Migrations aplicadas via **Supabase CLI**, não MCP: `SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase db push --linked` (o `SUPABASE_TOKEN` do `.env.local` é um Personal/Management API Token — Leonardo autorizou uso livre nele pra este projeto, incluindo criar tabelas e o que for preciso). Depois de toda migration nova, regenerar os tipos: `SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase gen types typescript --linked > lib/supabase/database.types.ts`.

Schema em `supabase/migrations/` (sequencial, sem gaps confiáveis de numeração — confira o mais alto com `ls supabase/migrations` antes de criar o próximo). Falta: registrar o auth hook (`custom_access_token_hook`) no Dashboard — o app funciona sem isso (fallback lê `profiles.tipo_base`).

## Idioma
Comunicação e conteúdo do produto em **português (BR)**.

## Fluxo de trabalho
Sem pressa e sem atalhos. Commits frequentes e pequenos (um por passo/mudança concluída, não um único commit gigante no fim). Toda validação de funcionalidade relevante pra UI é feita **rodando o app no browser localmente** antes de considerar concluído — teste automatizado sozinho não basta.

## Convenção de UI — Hero de boas-vindas
Página inicial de **Cliente e Prestador de Serviço** (só esses dois — Leonardo confirmou ao vivo em 09/09/2026 que SysAdmin e Administrador não devem ver o Hero, precisam de um dashboard operacional próprio, ainda não construído) abre com um card "Hero" (padrão do `refs/caixa-forte-app`): saudação respeitando o gênero cadastrado (Bem-vindo/Bem-vinda/Bem-vinde + nome, ver `lib/saudacao.ts` e `lib/papel-label.ts` pro mesmo padrão aplicado a rótulos de papel), citação aleatória, relógio em tempo real, previsão do tempo dos próximos 4 dias (Open-Meteo), botão de minimizar/expandir. Detalhes em [ROADMAP.md](./ROADMAP.md) §2.5 e §0 (auditoria).
