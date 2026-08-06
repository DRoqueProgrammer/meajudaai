# Contexto do Projeto — MeAjuda Aí

App mobile (Android/iOS) que conecta profissionais autônomos da construção civil e manutenção com ajudantes para trabalho por diária. Proprietário: Henrique. Fase atual: protótipo.

**Especificação completa:** [ESPECIFICACOES_MeAjudaAi.md](./ESPECIFICACOES_MeAjudaAi.md)
**Referência visual:** [REFERENCIA_VISUAL_MeAjudaAi.md](./REFERENCIA_VISUAL_MeAjudaAi.md) · style guide em [design/MeAjudaAi_styleguide.html](./design/MeAjudaAi_styleguide.html). Identidade: azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, fonte Poppins.

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
CPF/telefone/email únicos · validação SMS · autenticação Firebase · bloqueio por admin · logs de atividade.

## Supabase (protótipo)
Projeto `meajudaai-mvp` · ref `zisvxszjrylnuqplkrlm` · região us-east-1 · org DRoqueProgrammer. URL/anon em `.env.local` (não comitado). Conector Supabase MCP ativo — migrations/SQL aplicáveis via conector. `service_role` key presente em `.env.local` (integração passa: `npm run test:integration`). Falta: provedor SMS p/ OTP (opcional), registrar auth hook após migration 0002.

## Idioma
Comunicação e conteúdo do produto em **português (BR)**.
