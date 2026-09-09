# Roadmap — Evolução do MeAjuda Aí

> Documento vivo. Captura a visão ditada por Leonardo em 09/09/2026 para a próxima fase do produto — um pivô/evolução do modelo atual de "vagas por diária" para um **marketplace de agendamento de serviços** com estrutura multi-empresa. Ainda em construção: seções marcadas com ❓ são decisões em aberto que serão fechadas em conversas futuras.

---

## 1. Mudança de escopo em relação à v1

A v1 (spec original, `ESPECIFICACOES_MeAjudaAi.md`) modelava um quadro de vagas: Profissional publica diária → Ajudante se candidata → Profissional aceita. A v2 descrita aqui é diferente: um **prestador de serviço mantém uma agenda de horários disponíveis**, e o **cliente agenda diretamente** um horário com ele — mais parecido com um sistema de agendamento (tipo salão/clínica) do que um mural de vagas.

Isso também introduz uma camada de **multi-tenant real**: várias empresas (workspaces), cada uma com seu próprio administrador, prestadores e clientes, sob um super-admin único da plataforma.

**Mapeamento de papéis (v1 → v2):**
| v1 | v2 | Observação |
|---|---|---|
| Profissional (publica vaga) | — | Papel substituído pelo novo modelo |
| Ajudante (se candidata) | — | Papel substituído pelo novo modelo |
| — | **SysAdmin** | Novo — dono/operador da plataforma |
| — | **Administrador** | Novo — dono/gestor de um workspace (empresa) |
| — | **Prestador de Serviço** | Equivalente ao antigo "profissional" mas agora com agenda própria e preço |
| — | **Cliente** | Contrata/agenda; antes não existia como papel — vagas eram abertas a "ajudantes" |

❓ **A confirmar:** o schema atual (`profiles`, `workspaces`, `vagas`, `candidaturas`) já tem `workspaces` e `workspace_members` — parte da infra multi-tenant já existe. Precisamos decidir se migramos incrementalmente esse schema ou se é um redesenho maior. Tratar como tema de uma sessão de `/agentspec:sdd-iterate` ou `sdd-design` dedicada.

---

## 2. Papéis e hierarquia

### 2.1 SysAdmin (dono da plataforma)
- Enxerga tudo que um Administrador enxerga, em **qualquer workspace**.
- Pode criar contas de Administrador e criar novos workspaces.
- Pode desativar administradores.
- Único papel acima do nível de workspace.

### 2.2 Administrador (dono/gestor de um workspace)
- Pode ter e gerenciar **mais de um workspace**.
- Seleção de "em qual workspace estou trabalhando agora" fica numa futura **seção de administração** (não na seção de perfil — foi a correção explícita do Leonardo).
- Cria contas via **convite enviado por WhatsApp**, para três públicos: outros administradores, clientes, prestadores de serviço.
- Tem acesso total a todos os dados operacionais importantes do workspace.
- Vê a **agenda completa** do workspace (todos os prestadores).

### 2.3 Prestador de Serviço
- Perfil público com: contato, descrição do que faz, fotos opcionais (carrossel só aparece se houver fotos — nunca uma seção vazia), telefone com ícone de WhatsApp linkável (se aplicável).
- Mantém sua **própria agenda**: define horários disponíveis.
- Define seu **modelo de cobrança**: por hora (padrão inicial) ou por serviço fechado — evita divergência tipo "achei que ia custar R$150 e chegou R$500".

### 2.4 Cliente
- Busca prestadores por categoria (ex.: "encanador" → encontra "João da Silva").
- Vê o perfil do prestador (descrição, fotos, WhatsApp, agenda de horários disponíveis).
- Agenda um horário disponível → escreve o que precisa numa janela/modal → confirma.

---

## 3. Ciclo de vida de conta — nunca deletar

**Regra central: nunca fazemos exclusão permanente de pessoas/papéis.** Toda conta (Administrador, Prestador de Serviço ou Cliente) pode ser **desativada** pelo próprio usuário (ex.: prestador que não quer mais receber propostas) e **reativada** depois, retomando exatamente do ponto onde parou.

Ao reativar uma conta (qualquer papel):
- Pede para atualizar/confirmar dados importantes.
- Atualização de foto é **opcional**.
- Senha: delegado ao Supabase Auth (login/senha, fluxo de troca de senha por e-mail já resolvido pela infra).

---

## 4. Cadastro público (landing page)

Na página principal, qualquer pessoa pode criar conta como **Prestador de Serviço** ou **Cliente**. Campos do cadastro:

| Campo | Obrigatório? | Observação |
|---|---|---|
| Nome | Sim | |
| Como gostaria de ser chamado | Não (opcional) | Apelido/nome social |
| Endereço | Sim | Com **mapa interativo logo abaixo** onde a pessoa arrasta um PIN para marcar a localização exata |
| Telefone | Sim | |
| É WhatsApp? | Sim/Não | Se sim, gera link clicável para abrir o WhatsApp Web daquela pessoa, com ícone do WhatsApp |

**Uso do PIN de localização:** quando um cliente pede algo a um prestador (ou vice-versa, contexto de atendimento), a outra parte vê o mapa + endereço + um botão para **exportar a localização** direto para WhatsApp ou Google Maps, facilitando achar o endereço.

❓ Biblioteca de mapa: a spec original já cita **Leaflet + OpenStreetMap** (`ESPECIFICACOES_MeAjudaAi.md` §1) — manter essa escolha, a menos que o Leonardo peça Google Maps (ele cita "exportar pro Google Maps" só como destino do link, não como provedor do mapa embutido).

---

## 5. Agenda e fluxo de agendamento

1. Prestador de serviço cadastra horários disponíveis na própria agenda.
2. Cliente busca por categoria, entra no perfil do prestador, vê horários livres.
3. Cliente seleciona um horário → abre modal → escreve o que precisa/espera do serviço → confirma.
4. Esse horário fica **pendente** (bloqueado na agenda, mas não confirmado).
5. Mensagem é enviada via **Telegram** para o prestador (WhatsApp fica para o futuro — API paga; Telegram é grátis, serve para o protótipo).
6. Prestador responde no Telegram com um comando (ex.: `/ok`) para aceitar.
7. Cliente recebe no Telegram uma mensagem de confirmação com: dia, horário, serviço e valor.

**Painel do Administrador:** vê a agenda completa — todos os prestadores do workspace, todos os horários (livres/pendentes/confirmados).

❓ **A definir em conversa futura:**
- Como o prestador recusa/renegocia um pedido (fluxo simétrico ao "ok")?
- O valor mostrado na confirmação vem de onde quando a cobrança é "por serviço" (o cliente descreve livremente o que precisa — alguém precisa arbitrar o valor antes da mensagem de confirmação sair)?
- Cadastro/vínculo da conta Telegram de cada prestador (bot próprio? handle informado no cadastro?).
- O que acontece com o horário "pendente" se o prestador não responder (expira? fica pendente indefinidamente)?

---

## 6. Precificação do prestador

- **Por hora** — modelo inicial/padrão.
- **Por serviço** (valor fechado, negociado por pedido) — alternativa que o prestador pode escolher.

O prestador escolhe qual dos dois modelos usa (não é por pedido individual, é uma configuração do perfil/serviço, conforme dito: "você vai ser por serviço [...] ou você é por hora").

---

## 7. Convites

Administrador convida (Administrador, Cliente ou Prestador de Serviço) **via WhatsApp**. ❓ Formato do convite: link mágico (magic link) de cadastro pré-preenchido enviado por `wa.me/`? Confirmar mecanismo exato (Supabase Auth invite + link customizado, provavelmente).

---

## 8. Integrações técnicas previstas

| Necessidade | Solução provável |
|---|---|
| Auth, banco, reset de senha por e-mail | Supabase (já em uso) |
| Mapa com PIN de localização no cadastro | Leaflet + OpenStreetMap (já citado na spec) |
| Exportar localização | Deep link `https://wa.me/?text=...` e/ou `https://maps.google.com/?q=lat,lng` |
| Link direto para WhatsApp do contato | Deep link `https://wa.me/<numero>` |
| Notificação de novo agendamento pendente | **Telegram Bot API** (grátis, protótipo) |
| Confirmação de agendamento (comando do prestador) | Telegram Bot API (webhook + comando `/ok`) |

---

## 9. Relação com o schema atual

Tabelas existentes que já cobrem parte disso: `workspaces`, `workspace_members`, `profiles` + `profiles_pii`, `vagas`, `candidaturas`, `conversas`/`mensagens`, `notificacoes`, `avaliacoes`.

Prováveis mudanças de schema (a confirmar em sessão de design):
- Novo papel **SysAdmin**, acima de `workspace_members` (papel global, não escopado a um workspace).
- Substituir/estender `vagas` + `candidaturas` por algo como `agenda_slots` (horário do prestador) + `agendamentos` (reserva do cliente, com status: livre → pendente → confirmado/recusado).
- Campos de localização (lat/lng do PIN) — a spec já tem ADR sobre localização aproximada (`docs/adr/0004-localizacao-aproximada.md`) — **revisar**, porque aqui o pedido é localização **exata** via PIN, não aproximada.
- Configuração de cobrança no perfil do prestador (`preco_tipo`: hora | servico, `preco_valor`).
- Registro de handle/chat-id do Telegram por prestador.
- Fluxo de convite (`invite` já existe na tabela conforme CLAUDE.md — verificar se cobre convite por WhatsApp com papel-alvo).

---

## 10. Próximos passos

1. Leonardo continua detalhando a visão (telas, casos de borda, etc.).
2. Consolidar num `DEFINE_*.md` (SDD Fase 1) quando o escopo estabilizar.
3. Decidir: iterar o schema existente ou desenhar do zero as tabelas de agenda/agendamento.
4. Fechar as perguntas ❓ marcadas acima.
