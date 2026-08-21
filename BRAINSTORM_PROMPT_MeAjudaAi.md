# Prompt para `/agentspec:sdd-brainstorm` — Protótipo MeAjuda Aí

> Cole o conteúdo abaixo (da linha `---` em diante) como mensagem ao rodar a skill `/agentspec:sdd-brainstorm`.

---

Quero fazer o **brainstorm (Fase 0 / SDD)** do protótipo do app **MeAjuda Aí**.

## O produto
Marketplace que conecta **profissionais autônomos da construção civil e manutenção** (eletricista, pedreiro, pintor, encanador, etc.) com **ajudantes** disponíveis para trabalho por **diária**. Fase atual: protótipo. Idioma do produto: **português (BR)**. Spec completa em `ESPECIFICACOES_MeAjudaAi.md`.

Três papéis: **Profissional** (publica vagas de diária, seleciona e avalia ajudantes), **Ajudante** (vê e se candidata a vagas, avalia profissionais) e **Administrador** (modera usuários, vagas, avaliações e denúncias).

## Stack já decidida
**Next.js (App Router) + Supabase (Postgres + Auth + Storage) + TypeScript + React + Tailwind CSS** — web responsivo/PWA. Essa decisão substitui o FlutterFlow + Firebase citado na spec original; o objetivo é **reaproveitar a arquitetura de três codebases de referência** já analisados.

## Codebases de referência (fonte primária — use como base)
Em `refs/`, com grafo de conhecimento em cada `refs/<repo>/.ua/knowledge-graph.json`:
- **`refs/petvarejo`** — varejo/PDV multi-tenant + RBAC.
- **`refs/careconnect`** — gestão de home-care: pacientes com PII separada, escala/plantões, avaliações, billing.
- **`refs/foco-contabil`** — SaaS contábil server-actions-only, com CRM, notificações, cron/webhooks, testes.

Os três compartilham a **mesma arquitetura em camadas**: UI Components → App Routes + Server Actions → Domain (`lib/`) → Database (migrations SQL) → Scripts → Config. Ao recomendar, **cite tabelas e módulos concretos dessas refs**.

## Padrões reaproveitáveis já identificados nos grafos
| Necessidade do MeAjuda Aí | Padrão nas referências |
|---|---|
| Papéis Profissional/Ajudante/Admin | RBAC: `user_roles` / `user_module_permissions` + RLS (petvarejo, foco-contabil) |
| Autenticação + validação SMS | Supabase Auth (telefone/OTP); `lib/auth` guards |
| Perfil com CPF/telefone privados | Separação de PII: `paciente_pii` (careconnect) |
| Publicar vaga / candidatura | Modelo de pipeline/status: `deals`+`pipeline_stages` / status enum (foco, petvarejo) |
| Avaliação 1–5 ⭐ + média | `profissional_feedback` (careconnect) |
| Chat / mensagens | Supabase Realtime + tabela `mensagens` |
| Notificações | `notification_events` + `lib/notifications`; cron/webhooks (`cron_runs`, `webhook_events`) |
| Denúncias / moderação | `audit_log` + fluxo de moderação no painel admin |
| Localização (cidade/bairro/CEP, matching) | `ibge.ts`, `maps-share.ts`, Google Maps |
| Clientes Supabase (server/browser/admin) | `lib/supabase/*` (padrão idêntico nos 3) |
| Utilitários BR | `money.ts`, `phone.ts`, `masks`, PIX (`pix.ts`/`pix-qr.ts`) |

## Identidade visual (já definida — use ao propor telas)
Referência completa em `REFERENCIA_VISUAL_MeAjudaAi.md` e style guide em `design/MeAjudaAi_styleguide.html`. Fonte **Poppins**. Existe um mockup mobile com 10 telas que devem ser **adaptadas para web responsivo/PWA** (bottom-nav no mobile → sidebar no desktop; listas → grid).

Tokens de cor (Tailwind `theme.extend.colors`):
```js
brand:   { DEFAULT: '#0D47A1', dark: '#0A3A85' }, // azul — marca, navegação, CTAs neutros
accent:  { DEFAULT: '#FFC107' },                   // amarelo — destaque principal, realces, estrelas
action:  { DEFAULT: '#43A047', dark: '#388E3C' },  // verde — publicar, candidatar, aceitar, WhatsApp, sucesso
surface: '#F5F7FA',  ink: '#212121',  muted: '#5B6472',  line: '#E2E6EC',  danger: '#E53935'
```
**Convenções:** verde = ações positivas; amarelo = destaque principal; azul = marca/navegação. Status: Ativa/Sucesso=verde, Agendada/Info=azul, Pendente=amarelo, Cancelada/Erro=vermelho. Componentes recorrentes a padronizar: card de vaga, card de pessoa (avatar + nota em estrelas + selo "verificado"), abas de status, badge de status, avaliação por estrelas, busca com filtros-chip.

Ao propor a fatia de MVP e as telas, **respeite essa identidade** (mesmas cores/tokens, Poppins, cantos arredondados, cards) e cite qual das 10 telas do mockup cada proposta corresponde.

## Mapa das entidades (Firestore da spec → Postgres/Supabase)
`usuarios` → `profiles` (+ tabela de PII); `vagas` → `vagas`; `candidaturas` → `candidaturas`; `avaliacoes` → `avaliacoes`; `mensagens` → `mensagens`; `notificacoes` → `notificacoes`; `denuncias` → `denuncias`. Modelar como migrations SQL com RLS por papel, como nas refs.

## O que eu preciso deste brainstorm
1. Fundamente as recomendações **nas três refs** (cite os arquivos/tabelas equivalentes que eu já tenho pronto para copiar).
2. Proponha uma **fatia de MVP** enxuta para o protótipo (aplicando YAGNI) — quais das 20 telas da spec são essenciais para provar o conceito, e o que fica para depois.
3. Compare **2–3 abordagens** para as partes mais incertas, com trade-offs: **(a)** matching/localização (por cidade/bairro vs. raio geográfico), **(b)** chat (Realtime desde o MVP ou só liberar contato após o match), **(c)** notificações (in-app/Realtime vs. push/FCM).
4. Valide comigo, **uma pergunta por vez**, as decisões em aberto abaixo.

## Decisões em aberto para explorar
- **Multi-tenant?** As refs são multi-tenant por empresa; o MeAjuda Aí parece ser marketplace P2P (papéis, não workspaces). Confirmar se RBAC simples basta.
- **Auth:** telefone + OTP como método primário? Regras de unicidade CPF/telefone/email.
- **Escopo do protótipo:** monetização (Premium, destaque de vaga, anúncios) fica fora do MVP?
- **Mobile:** web responsivo/PWA agora e wrapper nativo depois, ou já pensar em nativo?
- **Localização/matching:** como o ajudante encontra vagas próximas?

## Restrições
Português (BR) em todo o produto. Dados pessoais sensíveis (CPF, telefone) → considerar **LGPD** e separação de PII. É um **protótipo**, não produção — priorizar o caminho mais curto para validar o fluxo Profissional↔Ajudante (publicar vaga → candidatar → aceitar → avaliar).

Ao final, gere o documento BRAINSTORM e sugira seguir para `/agentspec:sdd-define`.
