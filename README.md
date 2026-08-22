# MeAjuda Aí — Protótipo

Marketplace que conecta profissionais autônomos da construção/manutenção (cada um um workspace/empresa com equipe) a ajudantes por diária. Fluxo central: **publicar vaga → candidatar → aceitar → chat → avaliar**.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + Auth + Realtime) · TypeScript · Tailwind (Poppins). Multi-tenant com RLS.

## Documentação

Publicada no **GitHub Pages** (deploy automático via `.github/workflows/deploy-docs.yml` a cada push na `main` que toque em `docs/`):

- 📘 **Documentação técnica** — <https://droqueprogrammer.github.io/meajudaai/documentacao.html> (arquitetura, modelo de dados, RLS, papéis, fluxos, server actions, rotas e setup)
- 🖥️ **Apresentação do produto** — <https://droqueprogrammer.github.io/meajudaai/apresentacao.html> (deck navegável por teclado/clique)
- 🏠 **Central com os dois** — <https://droqueprogrammer.github.io/meajudaai/>

Os arquivos-fonte ficam em [`docs/`](./docs/) (`documentacao.html`, `apresentacao.html`) e também abrem direto no navegador. No banco, toda tabela, coluna e função tem `COMMENT` (migration `0019`); no código, as funções de `lib/`, os componentes e as rotas têm docstrings.

## Contas de demonstração

A página inicial (`/`) é pública e traz dois cards **"Explore sem cadastro"**:

| Conta | Papel | E-mail |
|---|---|---|
| João Eletricista | Profissional | `joao.demo@meajudaai.app` |
| Carlos Silva | Ajudante | `carlos.demo@meajudaai.app` |

Clicar no card entra pela rota `/api/demo/enter?who=joao|carlos`, que grava cookies **session-only** (fecha o navegador, cai a sessão). As contas são **somente leitura**: toda server action de escrita passa por `requireWriter()` (`lib/auth/guard.ts`), e um banner avisa o visitante. Os dados de exemplo (3 vagas, candidatura aceita, conversa e avaliações) são semeados pela migration `0005_seed_demo_accounts.sql`.

## Rodar localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

O `.env.local` já está preenchido com a URL e as chaves do projeto Supabase `meajudaai-mvp`. Para outro ambiente, veja `.env.example`.

## Passo pendente no Supabase (uma vez)

Registre o auth hook para o papel do usuário entrar no JWT:
**Dashboard → Authentication → Hooks → Custom Access Token → `public.custom_access_token_hook`**.
O app funciona sem isso (o papel é lido do banco como fallback), mas o hook é o caminho oficial.

O acesso é por **e-mail e senha**.

## Estrutura

```
app/            Rotas (App Router): (auth) login/cadastro · (app) telas do fluxo
components/     UI, nav, cards, chat, avaliação, notificações
lib/
  supabase/     clientes server/browser/admin + tipos gerados
  auth/         guards de usuário e workspace
  actions/      server actions (escrita, com zod + service-role)
  *.ts          utilitários BR, cidades, categorias, validação
supabase/       (schema aplicado via conector — ver .claude/sdd)
.claude/sdd/    documentos SDD (brainstorm → define → design → build report)
refs/           3 codebases de referência (não versionar)
```

## Banco (Supabase)

19 tabelas no schema `public`, **todas com RLS ativa** e **comentadas** (migration `0019`):

- **Identidade:** `profiles`, `profiles_pii` (PII separada).
- **Empresa (multi-tenant):** `workspaces`, `workspace_members`, `user_modules` (RBAC por módulo), `invite`.
- **Marketplace:** `vagas`, `vaga_local` (coordenada exata protegida), `candidaturas`, `avaliacoes` (trigger de média), `demanda_servico`, `categorias_servico`.
- **Comunicação:** `conversas`, `conversa_membros`, `mensagens` (Realtime), `notificacoes` (Realtime).
- **Agenda / moderação:** `bloqueio_agenda`, `denuncias`, `home_banner`.

As políticas usam funções helper `SECURITY DEFINER` (`is_workspace_member`, `can_manage_vaga`, `is_parte_vaga`, `is_conversa_membro`…) para checar participação sem recursão. Detalhes em [docs/documentacao.html](./docs/documentacao.html).

## Testes

```bash
npm test          # unidade (formatadores + validação zod) — 14 testes
```

Há também um teste de **isolamento RLS** (`tests/rls.test.ts`) que bate no Supabase real: cria dois usuários/workspaces e verifica que um não enxerga a vaga em andamento nem a PII do outro. É opt-in (cria e apaga dados no banco). Para rodá-lo, adicione `RUN_INTEGRATION=1` ao `.env.local` e rode `npm test` novamente.
