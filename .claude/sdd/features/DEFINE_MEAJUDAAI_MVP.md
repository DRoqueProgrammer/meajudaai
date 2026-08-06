# DEFINE: MeAjuda Aí — Protótipo MVP

> Marketplace web/PWA (Next.js + Supabase) que conecta profissionais da construção/manutenção — cada um um workspace/empresa com equipe — a ajudantes por diária, cobrindo o ciclo publicar → candidatar → aceitar → conversar → avaliar.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | MEAJUDAAI_MVP |
| **Date** | 2026-07-23 |
| **Author** | define-agent |
| **Status** | ✅ Complete (Built) |
| **Clarity Score** | 15/15 |

---

## Problem Statement

Profissionais autônomos da construção civil e manutenção precisam, com frequência e de última hora, de ajudantes de confiança para uma diária perto da obra, mas hoje dependem de indicações informais e grupos de mensagem dispersos — sem reputação, sem filtro por região e sem um fluxo padronizado de contratação. Do outro lado, ajudantes não têm um canal único para achar diárias na sua cidade e construir reputação. O MeAjuda Aí resolve isso com um marketplace que padroniza publicar vaga → candidatar → aceitar → conversar → avaliar.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Profissional (dono de workspace/empresa, com equipe opcional) | Publica vagas de diária, seleciona e avalia ajudantes | Precisa de ajudante confiável e próximo, rápido, sem depender de indicação informal |
| Ajudante | Vê e se candidata a vagas, avalia profissionais | Não tem um canal único para achar diárias na sua região e provar reputação |
| Administrador | Modera usuários, vagas e avaliações | Precisa manter a confiança e a segurança da plataforma |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Autenticação Supabase por telefone (OTP) e e-mail/senha, com CPF/telefone/e-mail únicos e PII em tabela separada |
| **MUST** | Multi-tenant: profissional cria um workspace (empresa); RLS isola todos os dados por tenant e por papel |
| **MUST** | Profissional publica vaga de diária (tipo, local cidade/bairro/CEP, data, horário, valor, qtd, descrição, status) |
| **MUST** | Ajudante busca/filtra vagas por cidade/bairro e se candidata; profissional vê candidatos e aceita/recusa |
| **MUST** | Chat in-app em tempo real (Supabase Realtime) liberado entre as partes após o aceite |
| **MUST** | Avaliação 1–5 estrelas com comentário opcional e média recalculada automaticamente |
| **MUST** | Notificações in-app em tempo real para eventos-chave (nova candidatura, aceite, mensagem, avaliação) |
| **SHOULD** | Convidar membro para a equipe do workspace (versão enxuta) |
| **SHOULD** | Abas de status em "Minhas Vagas" e "Minhas Diárias" (ativa/em andamento/concluída/cancelada) e selo "perfil verificado" (flag) |
| **COULD** | Foto de perfil/vaga via Supabase Storage |
| **COULD** | Admin mínimo: bloquear usuário |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] Fluxo central executável ponta a ponta no protótipo: publicar → candidatar → aceitar → chat → avaliar (0 bloqueios).
- [ ] Profissional publica uma vaga em ≤ 1 min (formulário de ≤ 6 campos, como tela 3 do mockup).
- [ ] 100% das tabelas com RLS ativa; dados de um workspace nunca visíveis a outro; PII acessível só ao próprio usuário e ao admin.
- [ ] Unicidade garantida por constraint: 0 duplicatas de CPF, telefone ou e-mail.
- [ ] Mensagens de chat entregues em tempo real em < 2 s (Supabase Realtime).
- [ ] Média de avaliação do perfil atualizada em ≤ 1 s após envio da avaliação.
- [ ] As 10 telas do MVP implementadas, navegáveis e aderentes à identidade visual (tokens/Poppins).

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Publicar vaga (happy path) | Profissional autenticado com workspace | Preenche tipo, local (cidade/bairro), data, horário, valor e publica | Vaga criada com status "aberta", visível na busca por aquela cidade |
| AT-002 | Candidatura e aceite | Ajudante autenticado vê uma vaga aberta | Candidata-se; profissional aceita um candidato | Candidatura fica "aceito", vaga muda para "em andamento", chat é liberado entre as partes |
| AT-003 | Chat em tempo real | Vaga com candidato aceito | Uma parte envia mensagem | A outra parte recebe a mensagem em < 2 s sem recarregar |
| AT-004 | Avaliação e média | Diária concluída entre profissional e ajudante | Cada parte envia nota 1–5 + comentário | Avaliação registrada e a média do avaliado é recalculada e exibida no perfil |
| AT-005 | Unicidade / cadastro | Existe usuário com CPF X | Novo cadastro usa o mesmo CPF/telefone/e-mail | Cadastro é rejeitado com mensagem de duplicidade |
| AT-006 | Isolamento multi-tenant (RLS) | Dois workspaces distintos com vagas | Usuário do workspace A tenta ler vagas/candidatos do workspace B | Acesso negado por RLS |
| AT-007 | Filtro por cidade/bairro | Vagas em várias cidades | Ajudante filtra por sua cidade/bairro | Só as vagas daquela região são listadas |
| AT-008 | Notificação em tempo real | Ajudante com sessão aberta | Profissional aceita sua candidatura | Ajudante recebe notificação in-app (badge/toast) sem recarregar |

---

## Out of Scope

- Push/FCM e notificações fora do app (só in-app + Realtime no MVP).
- Matching por raio geográfico / PostGIS (apenas cidade/bairro).
- Denúncias e fluxo de moderação de conteúdo.
- Painel administrativo completo (apenas "bloquear usuário" como COULD).
- Configurações, Termos de Uso e Política de Privacidade como features (serão páginas estáticas).
- Recuperação de senha customizada (usar o nativo do Supabase Auth).
- Monetização: Premium, destaque de vaga, perfil destacado, anúncios, parcerias.
- Gestão de equipe avançada (permissões granulares, hierarquia) — MVP só convida membro.
- App mobile nativo (web/PWA agora; wrapper nativo é fase futura).
- Verificação de identidade real/KYC (selo "verificado" é flag manual no protótipo).

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | Stack fixa: Next.js (App Router) + Supabase (Postgres/Auth/Storage/Realtime) + TS + Tailwind, espelhando os 3 repos em `refs/` | Design reaproveita `lib/supabase/*`, `lib/actions`, `lib/auth`, migrations RLS e padrão de workspaces das refs |
| Technical | LGPD: CPF/telefone em tabela PII (`profiles_pii`) separada, com RLS estrita | Modelo de dados separa dados sensíveis do perfil público |
| Design | Identidade visual fixa (tokens em `REFERENCIA_VISUAL_MeAjudaAi.md`, Poppins, mockup de 10 telas) | UI deve aderir às cores/tokens e componentes definidos |
| Timeline | É um protótipo (não produção) | Priorizar o caminho mais curto do fluxo central; cortar o resto (ver Out of Scope) |
| Resource | Infra gerenciada (Supabase + deploy Vercel), sem IaC próprio | Sem provisionamento manual; recursos = projeto Supabase + buckets Storage |
| Language | Português (BR) em todo o produto | Conteúdo, rótulos e mensagens em PT-BR |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `app/` (rotas + server actions), `components/`, `lib/` (domínio), `supabase/migrations/` (SQL); deploy Vercel | Espelhar a estrutura em camadas das 3 refs |
| **KB Domains** | `supabase` (rls-policies, multi-tenant-rls, realtime, edge-functions, webhook-edge-function), `data-modeling` (normalization, schema-evolution), `testing` | Design puxa esses padrões |
| **IaC Impact** | New resources (gerenciados): projeto Supabase (Auth/Postgres/Realtime) + buckets Storage; provedor SMS para OTP | Sem IaC próprio; configuração via painel Supabase/Vercel |

---

## Data Contract (if applicable)

N/A — aplicação transacional (OLTP), não é pipeline de dados/ETL/analytics. O esquema relacional detalhado (tabelas `workspaces`, `user_workspace_roles`, `profiles`, `profiles_pii`, `vagas`, `candidaturas`, `avaliacoes`, `mensagens`, `notificacoes`) e suas políticas RLS serão especificados na fase Design, espelhando as migrations das refs.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | Supabase Realtime atende ao volume de chat/notificações do protótipo | Fallback para polling periódico | [ ] |
| A-002 | Filtro por cidade/bairro (texto/IBGE) é suficiente para o matching no protótipo | Introduzir PostGIS/raio geográfico (mais escopo) | [ ] |
| A-003 | Ajudante global + profissional-como-workspace convivem no mesmo modelo de Auth/RLS | Revisar o modelo de tenancy e as políticas RLS | [ ] |
| A-004 | Provedor SMS para OTP de telefone está disponível/configurável no Supabase | Usar e-mail/senha como método primário no protótipo | [ ] |
| A-005 | "Perfil verificado" é uma flag manual (sem KYC) no protótipo | Necessidade de verificação real amplia muito o escopo | [ ] |

**Note:** Validate critical assumptions before DESIGN phase. Unvalidated assumptions become risks.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Dor específica, público e impacto claros |
| Users | 3 | Três personas com dores; papéis definidos |
| Goals | 3 | Metas MoSCoW acionáveis, derivadas do brainstorm validado |
| Success | 3 | Critérios mensuráveis (tempos, %, contagens, 0 duplicatas) |
| Scope | 3 | Out of Scope explícito e extenso |
| **Total** | **15/15** | Acima do gate (12/15) |

**Minimum to proceed: 12/15**

---

## Open Questions

None — ready for Design. Pontos a confirmar na fase Design (não bloqueiam): política exata de quando o chat é liberado (só após aceite) e quando uma diária transita para "concluída" (manual pelo profissional vs. automático por data).

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-23 | define-agent | Versão inicial a partir de BRAINSTORM_MEAJUDAAI_MVP.md |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_MEAJUDAAI_MVP.md`
