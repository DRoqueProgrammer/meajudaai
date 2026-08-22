# Contexto do Projeto — MeAjuda Aí

Aplicação web responsiva (PWA) que conecta profissionais autônomos da construção civil e manutenção com ajudantes para trabalho por diária. Fase atual: protótipo.

**Especificação completa:** [ESPECIFICACOES_MeAjudaAi.md](./ESPECIFICACOES_MeAjudaAi.md)
**Referência visual:** [REFERENCIA_VISUAL_MeAjudaAi.md](./REFERENCIA_VISUAL_MeAjudaAi.md) · style guide em [design/MeAjudaAi_styleguide.html](./design/MeAjudaAi_styleguide.html). Identidade: azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, fonte Poppins.
**Documentação técnica:** [docs/documentacao.html](./docs/documentacao.html) (arquitetura, modelo de dados, RLS, fluxos, setup) · **Apresentação:** [docs/apresentacao.html](./docs/apresentacao.html) (deck do produto). Ambos autocontidos, na identidade da marca.

## Convenção de documentação
- **Banco:** toda tabela e coluna tem `COMMENT ON` (migration `0019_comentarios_documentacao.sql`); as funções PL/pgSQL também. Visível no Dashboard do Supabase e no `\d+`. Ao criar/alterar tabela, comente também.
- **Código:** funções de `lib/` têm docstring TSDoc; cada componente e cada rota do App Router têm um comentário de topo. Mantenha o padrão (conciso, explica o "porquê", em PT-BR) ao adicionar código.

## Stack
Spec original: FlutterFlow + Firebase (mobile). **Decisão para o protótipo:** Next.js (App Router) + Supabase + TypeScript + Tailwind (web/PWA responsivo), espelhando os 3 repos-referência em `refs/`. Ver [[meajudaai-reference-repos]].

## Tipos de usuário
- **Profissional** — publica vagas de diária, seleciona e avalia ajudantes.
- **Ajudante** — visualiza e se candidata a vagas, avalia profissionais.
- **Administrador** — modera usuários, vagas, avaliações, denúncias e anúncios.

## Escopo do protótipo
20 telas obrigatórias (ver spec). Funcionalidades centrais: publicar vaga, candidatura, avaliação (1–5 estrelas), chat, notificações, denúncias.

## Coleções Firestore
`usuarios`, `vagas`, `candidaturas`, `avaliacoes`, `mensagens`, `notificacoes`, `denuncias`.

## Regras de segurança
Telefone/email únicos · autenticação Supabase (e-mail e senha) · bloqueio por admin · logs de atividade.

## Supabase (protótipo)
Projeto `meajudaai-mvp` · ref `zisvxszjrylnuqplkrlm` · região us-east-1 · org DRoqueProgrammer. URL/anon em `.env.local` (não comitado). Conector Supabase MCP ativo — migrations/SQL aplicáveis via conector. Schema em `supabase/migrations/0001–0019` (19 tabelas, todas com RLS; a `0019` anexa os comentários de schema). `service_role` key presente em `.env.local` (integração passa: `npm run test:integration`). Falta: registrar auth hook após migration 0002.

## Idioma
Comunicação e conteúdo do produto em **português (BR)**.
