# DEFINE: Chat Duplo + Permissão Granular por Funcionário

> Um motor de conversa único (canal da equipe + DMs internas e externas, em tempo real) com liberação, por funcionário, de publicar vagas e falar com ajudantes — sem que ninguém acesse conversa ou dado fora da sua permissão.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CHAT_E_PERMISSOES |
| **Date** | 2026-08-05 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

Sócios e funcionários não têm onde conversar de forma contínua — entre a equipe e com os ajudantes contratados — e o sócio não consegue controlar, por funcionário, quem representa a empresa para fora (publicar vagas, falar com ajudantes); hoje o chat existente fica preso a uma vaga e não há esse controle fino, e qualquer generalização mal-feita arrisca expor conversas a quem não participa delas.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Sócio | `admin` (dono/owner da equipe) | Precisa coordenar a equipe e falar com ajudantes, e decidir quem da equipe pode publicar vagas e conversar com ajudantes |
| Funcionário | `funcionario` (membro da equipe) | Quer conversar com a equipe e, quando liberado, publicar vagas e falar com ajudantes contratados |
| Ajudante | `ajudante` | Quer conversar com quem o contratou de forma contínua, não presa a uma única diária |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Motor de conversa único: `conversas` + `conversa_membros` + `mensagens.conversa_id`, suportando canal da equipe e DMs |
| **MUST** | Chat interno: canal da equipe (1 por workspace, todos os membros) + DMs 1-a-1 entre membros |
| **MUST** | Chat externo: DM sócio/funcionário ↔ ajudante criada ao aceitar a candidatura, persistente entre diárias |
| **MUST** | Realtime via `postgres_changes` filtrado por RLS participante-only (mesma regra entrega ao vivo **e** barra acesso indevido) |
| **MUST** | Capacidades `publicar_vagas` e `chat_ajudantes` em `user_modules`, **default OFF**, com guard nas ações; `admin`/`sysadmin` sempre liberados |
| **MUST** | Liberação pelo mesmo toggle de chips existente (`ModulosFuncionario`), estendido para as capacidades |
| **SHOULD** | Notificação in-app de nova mensagem (reusar `notificacoes`) |
| **SHOULD** | Migrar/backfill o chat de vaga atual (`mensagens.vaga_id`) para o novo modelo de conversa sem perda |
| **COULD** | Badge de não-lidas na navegação |
| **COULD** | Ordenar a lista de conversas pela última mensagem |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] Nova mensagem aparece para o destinatário em **< 2s (p95)** sem recarregar a página.
- [ ] **0** casos de leitura de mensagens de uma conversa da qual o usuário não é membro (testado por acesso direto ao ID/URL da conversa).
- [ ] **0** eventos de realtime entregues a um usuário que não participa da conversa (testado subscrevendo o canal de uma conversa alheia).
- [ ] **100%** das ações de publicar vaga bloqueadas para funcionário sem `publicar_vagas`; **100%** das ações de abrir/enviar em DM externa bloqueadas sem `chat_ajudantes`.
- [ ] Todo membro da equipe (sócio + funcionários) enxerga e usa o canal da equipe; DM interna entre quaisquer dois membros funciona.
- [ ] Ao aceitar uma candidatura, existe **exatamente 1** DM externa entre o lado-equipe e aquele ajudante, e ela continua acessível após a diária ser finalizada.
- [ ] O sócio liga/desliga cada capacidade de cada funcionário pelo chip e o efeito vale na ação seguinte.

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Canal da equipe (happy) | Sou membro de um workspace | Abro o chat interno | Vejo o canal da equipe com todos os membros e consigo enviar mensagem |
| AT-002 | DM interna (happy) | Dois membros da mesma equipe | Um inicia DM com o outro e envia | A conversa 1-a-1 é criada e a mensagem chega ao vivo ao outro |
| AT-003 | Criação do chat externo | Uma vaga com candidatura em `aguardando` | O sócio/funcionário aceita a candidatura | Uma DM externa (lado-equipe ↔ ajudante) é criada e persiste após a diária finalizar |
| AT-004 | Entrega em tempo real | Dois participantes com a conversa aberta | Um envia uma mensagem | O outro a vê em < 2s sem recarregar |
| AT-005 | Bloqueio de publicar | Funcionário **sem** `publicar_vagas` | Tenta publicar uma vaga | A ação é recusada e nenhuma vaga é criada |
| AT-006 | Bloqueio de chat externo | Funcionário **sem** `chat_ajudantes` | Tenta abrir/enviar em DM externa | A ação é recusada |
| AT-007 | Anti-IDOR — leitura | Usuário que não é membro de uma conversa | Acessa o ID/URL da conversa diretamente | Não recebe nenhuma mensagem (RLS nega) |
| AT-008 | Anti-IDOR — realtime | Usuário que não é membro de uma conversa | Tenta subscrever o canal realtime dela | Não recebe nenhum evento (RLS filtra a subscription) |
| AT-009 | Liberação pelo sócio | Sócio na tela da equipe | Liga o chip `chat_ajudantes` de um funcionário | O funcionário passa a conseguir abrir DM externa |

---

## Out of Scope

- Indicador de "digitando…", confirmação de leitura ("visto") e status online/presença.
- Anexos/foto no chat; editar/apagar mensagem; busca no histórico.
- Push notification nativo (o app já tem `notificacoes` in-app).
- Grupos arbitrários além do canal da equipe (só canal + DM 1-a-1).
- Feature 4 (convite por link) — compartilha a engrenagem de papéis, mas é outro documento.
- Compartilhar localização / "estou chegando" — pertence ao DEFINE do MAPA_VAGAS.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | RLS é a **fronteira de autorização**, inclusive para a subscription de realtime | Autorização mora no banco (policies), não só no app; design precisa validar RLS-on-realtime |
| Technical | Realtime é peça **inédita** no repo (nenhum ref implementa) | Design precisa provar `postgres_changes` + Realtime Authorization com a RLS pretendida |
| Technical | `mensagens` já existe e é usada pelo chat de vaga | Migração aditiva (`conversa_id`) + backfill, sem quebrar o fluxo atual |
| Technical | Migrations via conector Supabase MCP; `database.types.ts` mantido à mão | Sem CLI local; atualizar tipos após DDL |
| Product/Locale | pt-BR; termo de UI "equipe" (não "empresa") | Copy e rótulos |
| Resource | Sem serviço externo novo para esta feature | Fica tudo em Supabase (Postgres/Auth/Realtime/RLS) |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `app/(app)/chat/*`, `app/(app)/mensagens`, `lib/actions/mensagens.ts`, `lib/auth/modules.ts`, `lib/modules.ts`, `components/chat/*`, `supabase/migrations/*` | Evoluir chat e `user_modules` existentes |
| **KB Domains** | `supabase` → `rls-policies`, `realtime`, `multi-tenant-rls` | Policies participante-only, subscription realtime, capacidades por usuário |
| **IaC Impact** | New resources + Modify existing | Novas tabelas `conversas`/`conversa_membros`; `ALTER TABLE mensagens ADD conversa_id`; habilitar Realtime na `mensagens`; novas chaves de capacidade em `user_modules` |

**Why This Matters:**
- **Location** → Design reaproveita o motor de chat e o mecanismo de módulos em vez de recriar.
- **KB Domains** → Design puxa os padrões de RLS/realtime corretos.
- **IaC Impact** → Migration + habilitar Realtime + tipos à mão são passos que precisam entrar no plano.

---

## Data Contract (if applicable)

N/A — feature de produto (mensageria + autorização); não envolve pipelines/ETL/analytics.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | O Supabase Realtime (`postgres_changes`) entrega **apenas** as linhas que o assinante pode `SELECT` sob RLS (RLS filtra o realtime) | Precisaria de outra abordagem (Realtime Authorization por broadcast, canais por conversa com auth explícita) — muda o design do realtime | [ ] |
| A-002 | Dá para migrar `mensagens` (adicionar `conversa_id`) e fazer backfill das diárias atuais sem perda nem downtime relevante | Migração mais elaborada ou período de dupla-escrita | [ ] |
| A-003 | `admin` (sócio) e `sysadmin` sempre podem publicar vaga e falar com ajudante (bypass das capacidades), espelhando `getAllowedModules` | Se sócios também precisarem de grant, o modelo de permissão muda | [ ] |
| A-004 | O canal da equipe é 1 por workspace, criado automaticamente, com todos os `workspace_members`; entra/sai acompanha a associação à equipe | Precisaria de UI de gestão de canais | [ ] |
| A-005 | **Confirmado (2026-08-05):** a DM externa é **uma só por (equipe, ajudante)**, com **vários participantes do lado-equipe** (todos os que têm `chat_ajudantes`); cada ajudante aceito ganha a **própria** DM externa | Modelo de `conversa_membros` no caso externo: N participantes-equipe + 1 ajudante por conversa | [x] |

**Note:** A-005 confirmada pelo dono (2026-08-05). Falta validar **A-001** (RLS filtra o realtime) na DESIGN — é a que mais mexe na arquitetura.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Dor clara, com quem sofre e o impacto (conversa contínua + controle fino sem vazamento) |
| Users | 3 | Três personas com papel e dor definidos |
| Goals | 3 | MoSCoW explícito, derivado de decisões já validadas no brainstorm |
| Success | 3 | Critérios mensuráveis/testáveis (latência p95, 0 acessos indevidos, 100% de bloqueio) |
| Scope | 3 | Fora-de-escopo explícito (YAGNI + fronteiras com features 4 e mapa) |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15**

---

## Open Questions

Nenhuma — as duas em aberto foram resolvidas pelo dono em 2026-08-05:

- **Participação na DM externa:** uma só conversa por (equipe, ajudante), com **vários participantes do lado-equipe** (quem tiver `chat_ajudantes`). Registrado em A-005.
- **Vaga com vários ajudantes:** **cada aceito ganha a própria DM externa.**

**Pronto para Design.**

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-05 | define-agent | Versão inicial a partir de BRAINSTORM_CHAT_E_PERMISSOES.md |
| 1.1 | 2026-08-05 | define-agent | Resolvidas as 2 perguntas em aberto (participação na DM externa; DM por ajudante aceito); A-005 confirmada |
| 1.2 | 2026-08-05 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_CHAT_E_PERMISSOES.md` — após aplicar a migration `0013` e verificar ao vivo.
