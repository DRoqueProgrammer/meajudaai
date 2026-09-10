# Me Ajuda Aí — Protótipo (v2)

**Versão 0.0.2** — a versão vive no `version` do [package.json](./package.json) e é lida de lá pelo rodapé do site (`components/footer.tsx`), que a mostra em todas as páginas. Fonte única: bumpe no `package.json` e o site acompanha.

**Convenção de bump:** toda entrega que muda o produto sobe a versão e reporta a cobertura junto. A meta é **100%**, medida em dois números separados porque a maquinaria é diferente:

| Medida | Comando | Hoje | Meta |
|---|---|---|---|
| Lógica pura de `lib/` (teste unitário) | `npm run test:coverage:puro` | 81,42% | 100% |
| `lib/` inteiro, incluindo ações de servidor | `npm run test:coverage` | 9,84% | 100% (via teste de integração) |

O que ainda falta na lógica pura são módulos que **exigem contexto de servidor**: `auth/*` (cliente de servidor e cookies), `site-url.ts` (lê cabeçalhos) e `log.ts`. Esses caem na segunda medida, por integração.

As ações de servidor estão em 0% porque todo o corpo delas fala com o banco — cobri-las exige teste de integração contra banco real (`npm run test:integration`), não banco falso. O primeiro passo nessa direção são os **22 testes de regra de permissão já escritos** em `tests/rls.test.ts`, hoje desligados atrás de `RUN_INTEGRATION`. Ver R-33 a R-36 no [tech-spec](./cvg/docs/tech-spec/fechar-v2-marketplace.md).

Marketplace de agendamento de serviços de manutenção civil: **Prestador de Serviço** mantém uma agenda de horários disponíveis, **Cliente** busca por proximidade e agenda direto com ele — mais parecido com um sistema de salão/clínica do que um mural de vagas. Quatro papéis: **SysAdmin** (dono da plataforma), **Administrador** (dono/gestor de um workspace), **Prestador de Serviço** e **Cliente**.

Este é um pivô em andamento a partir de uma v1 (mural de vagas por diária, ainda usada por Administrador/Funcionário em paralelo). A especificação completa, decisões de arquitetura e a lista do que falta vivem em **[ROADMAP.md](./ROADMAP.md)** — leia a seção 0 (Auditoria) primeiro. Continuidade entre sessões de trabalho fica em **[HANDOVER.md](./HANDOVER.md)**.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Postgres + Auth + Storage, RLS em toda tabela) · TypeScript · Tailwind CSS. Server Actions como padrão de escrita.

## Rodar localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

`.env.local` (não comitado) precisa de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_TOKEN` (Personal/Management API Token, usado só pela CLI pra aplicar migrations — ver [CLAUDE.md](./CLAUDE.md#supabase)).

## Contas de exemplo

Contas reais (não read-only), uma por papel, com dados e ~3 anos de histórico simulado. Senha única: `MeAjudaAi2026!`.

| Papel | Nome | E-mail |
|---|---|---|
| SysAdmin | Ricardo Bastos | `ricardo.bastos@meajudaai.app` |
| Administrador | Marcelo Lopes | `marcelo.lopes@meajudaai.app` |
| Prestador de Serviço | João Ferreira | `joao.ferreira@meajudaai.app` |
| Funcionário | Beatriz Andrade | `beatriz.andrade@meajudaai.app` |
| Cliente | Marina Costa | `marina.costa@meajudaai.app` |

Login normal em `/login`, ou clicando no card correspondente na landing (`/`), que entra via `/api/exemplo/entrar?papel=...` com cookie de sessão (fecha o navegador, cai a sessão). Lista completa em `lib/auth/contas-exemplo.ts`.

## Banco (Supabase)

Schema em `supabase/migrations/`, todas as tabelas com RLS ativa e `COMMENT ON` (tabela, coluna e função). Peças centrais do modelo v2:

- **Identidade:** `profiles` (+ `profiles_pii` — PII separada, inclui telefone e chave Pix), `profile_local` (PIN exato, RLS owner+sysadmin-only — nunca exposto por API; `lat_aprox`/`lng_aprox` são a versão segura pra mapa).
- **Agenda / serviço:** `agenda_slots`, `servicos`, `servico_logs` (privados de quem escreveu), `servico_comentarios_admin`.
- **Auditoria:** `login_logs` (IP/dispositivo/geolocalização, só SysAdmin lê).
- **v1 ainda em uso** (Administrador/Funcionário, fluxo de diária por workspace): `workspaces`, `workspace_members`, `vagas`, `vaga_local`, `candidaturas`, `avaliacoes`, `user_modules`.

Proximidade sem vazar coordenada exata: funções `SECURITY DEFINER` (`buscar_prestadores_proximos`, `meus_clientes_no_mapa`) calculam distância/pino aproximado no servidor e nunca devolvem `lat`/`lng` reais. Padrão espelhado nas policies gerais (`is_workspace_member`, `tem_servico_com`, etc.) pra evitar recursão de RLS.

Aplicar migrations e regenerar tipos: ver [CLAUDE.md](./CLAUDE.md#supabase).

## Estrutura

```
app/            Rotas (App Router): (auth) login/cadastro · (app) telas por papel · (legal) termos/privacidade
components/     UI, nav, agenda (calendário + linha do tempo), mapas (Leaflet), popovers, formulários
lib/
  supabase/     clientes server/browser/admin + tipos gerados (database.types.ts)
  auth/         roles, guards de usuário/workspace/módulo
  actions/      server actions (escrita, zod + service-role quando precisa bypassar RLS)
  ibge.ts       cidades do IBGE (busca completa, cache local)
  papel-label.ts, saudacao.ts   rótulos/saudação respeitando gênero
  *.ts          utilitários BR, categorias, validação, formatação
supabase/       migrations do schema (Supabase CLI)
scripts/        seed de dados de demonstração/dev
docs/           documentação e apresentação (HTML) — ainda descrevem a v1, precisam de atualização
refs/           repos de referência p/ portar padrões (não versionar; cada um tem .ua/ pronto pra consulta)
```

## Testes

```bash
npm test          # unidade (formatadores + validação zod)
```

Há também um teste de **isolamento RLS** (`tests/rls.test.ts`) que bate no Supabase real: cria usuários/workspaces e verifica que um não enxerga dado do outro. É opt-in — adicione `RUN_INTEGRATION=1` ao `.env.local` e rode `npm test` de novo.
