# Roadmap — Evolução do MeAjuda Aí

> Documento vivo. Captura a visão ditada por Leonardo (sessões de 09/09/2026) para a próxima fase do produto — um pivô/evolução do modelo atual de "vagas por diária" para um **marketplace de agendamento de serviços** com estrutura multi-empresa. Seções marcadas com ❓ são decisões em aberto para conversas futuras.

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
| — | **Administrador** | Novo — dono/gestor de um workspace (empresa); pode criar papéis extras (ver §4) |
| — | **Prestador de Serviço** | Agenda própria, preço variável, perfil público, cadastro sujeito a aprovação |
| — | **Cliente** | Busca, agenda direto; cadastro simplificado, sem aprovação |

❓ **A confirmar:** o schema atual (`profiles`, `workspaces`, `workspace_members`, `vagas`, `candidaturas`) já tem parte da infra multi-tenant. Decidir se migramos incrementalmente ou se é redesenho maior — tema de uma sessão `/agentspec:sdd-design` dedicada.

---

## 2. Papéis e páginas

### 2.1 SysAdmin (dono da plataforma)
- Enxerga tudo que um Administrador enxerga, em **qualquer workspace**.
- Pode criar contas de Administrador e criar novos workspaces.
- Pode desativar administradores.
- Vê **todos os logs de auditoria envolvendo administradores** também (não só os logs operacionais que o Administrador já vê) — ver §5.
- Única página com a aba "SysAdmin"; essa aba **não aparece** para o Administrador.

### 2.2 Administrador (dono/gestor de um workspace)
- Página própria, **sem a aba de SysAdmin**, mostrando apenas os workspaces onde ele está inserido (pode ter mais de um — seletor de workspace fica numa futura seção de administração, não na de perfil).
- Cria contas via **convite enviado por WhatsApp**, para: outros administradores, clientes, prestadores de serviço, e **papéis customizados** (ver §4, ex.: "Funcionário").
- Acesso total aos dados operacionais do workspace, organizado em **módulos** (ver §4): módulo de Clientes, módulo de Prestadores de Serviço, etc.
- Dentro de cada módulo, ao clicar no nome de uma pessoa vê o cadastro completo **e** um relatório de auditoria: histórico de login com data/hora, dispositivo usado e IP/geolocalização por IP (ver §5).
- Vê a **agenda completa** do workspace (todos os prestadores).
- Pode comentar em um serviço (ver §6.4).

### 2.3 Prestador de Serviço

**Cadastro e aprovação:**
- Se cadastra publicamente na plataforma (dados básicos + endereço/PIN obrigatórios, ver §3).
- Ao enviar o cadastro, recebe uma mensagem avisando que o cadastro **será analisado**.
- O Administrador do workspace recebe uma notificação por **Telegram** com um resumo dos dados cadastrados, e pode aprovar (`ok`) tanto pelo Telegram quanto pelo site.
- Enquanto pendente, o perfil exibe um selo/estado temporário de "aguardando aprovação". ❓ *Confirmar redação exata e onde esse selo aparece (perfil público? só painel do prestador?).*

**Perfil (o prestador monta e mantém):**
- Descrição do serviço, fotos opcionais (carrossel só se houver fotos — nunca seção vazia), telefone com link/ícone de WhatsApp se aplicável.
- Define preço: por hora (padrão) ou por serviço fechado (ver §6.1).
- **Aviso de preço variável** — obrigatório, elegante e pequeno mas legível, junto ao preço: alerta de que o valor pode ser renegociado depois de avaliar o serviço no local (ver §6.2).

**Agenda própria:**
- Define horários disponíveis.
- Visualiza os agendamentos recebidos organizados por dia, em ordem de horário.
- Cada agendamento é clicável → detalhe do serviço → pode marcar status: **agendado / realizado / cancelado**.

**Aba de Clientes (visão limitada, não igual à do Administrador):**
- Lista de clientes que já solicitaram serviço.
- Por cliente: nome, como gosta de ser chamado, telefone — se marcado como WhatsApp, aparece direto o número com link para o WhatsApp (sem etapa extra).
- Prestador pode registrar **logs privados sobre o cliente** (ex.: "cliente bom", "cliente mal educado") — visíveis **só para o próprio prestador** que escreveu (ver §5).

**Aba de Serviços (dentro do perfil de um cliente):**
- Um **serviço** é criado quando uma solicitação do cliente é aceita.
- Um cliente pode ter vários serviços (histórico).
- Cada serviço tem um preço inicial; botão **"Renegociar"** abre modal para alterar o valor — a alteração gera um **log do serviço** (ex.: "renegociado de R$100 para R$500"), com timestamp.
- Prestador também pode registrar logs sobre o serviço em si (não só sobre o cliente).

### 2.4 Cliente
- Cadastro **simplificado, sem aprovação** (diferente do prestador).
- Página própria — não pode ser uma tela vazia com só uma barra de busca; precisa ter conteúdo relevante (ex.: prestadores em destaque, categorias) além da busca (ex.: "encanador"). ❓ *Leonardo pediu para explorar isso com criatividade — vale gerar 2-3 propostas visuais (ex.: usando a skill `visual-explainer` ou um mockup) antes de implementar.*
- A própria localização do cliente aparece na página (usada para ordenar resultados).
- Endereço + PIN no mapa (Leaflet) são **obrigatórios** também para o cliente (não só para o prestador) — necessário para o cálculo de proximidade.
- Resultado de busca (ex.: "encanador") sempre **ordenado por proximidade**: prestador mais próximo primeiro, mais distante por último.
- Ao clicar num prestador (ex. João da Silva): abre o perfil dele (descrição, fotos, WhatsApp, agenda) → cliente escolhe horário disponível → descreve o que precisa → aguarda aceite (fluxo já detalhado em §5 do roadmap anterior / seção de agendamento abaixo).

---

## 3. Ciclo de vida de conta — nunca deletar

**Regra central: nunca fazemos exclusão permanente de pessoas/papéis.** Toda conta (Administrador, Prestador de Serviço, Cliente ou papel customizado) pode ser **desativada** pelo próprio usuário e **reativada** depois, retomando exatamente do ponto onde parou.

Ao reativar uma conta (qualquer papel):
- Pede para atualizar/confirmar dados importantes.
- Atualização de foto é **opcional**.
- Senha: delegado ao Supabase Auth.

---

## 4. Módulos e papéis customizados (RBAC)

- O Administrador ("sócio") pode criar **papéis novos além dos padrão** — ex.: "Funcionário" — e convidar pessoas para eles (convite por WhatsApp, pessoa define a própria senha no primeiro acesso).
- O que cada papel customizado pode fazer dentro do app deve ser modelado como **módulos** habilitáveis/desabilitáveis (ex.: módulo "Clientes", módulo "Prestadores de Serviço", possivelmente módulo "Agenda", "Relatórios" etc. — a listar conforme o produto cresce).
- Isso é essencialmente um RBAC granular por módulo, por workspace — não papéis fixos no código, e sim uma tabela de permissões configurável pelo Administrador.

❓ **A confirmar:** lista completa de módulos a existir no protótipo; se um "Funcionário" pode, por exemplo, ver a agenda completa como o Administrador ou só um subconjunto.

---

## 5. Auditoria e Logs

Requisito explícito: **capturar tudo** em cada acesso/login — dispositivo usado, data e hora, IP e localização geográfica derivada do IP.

### 5.1 O que logar
- Login de qualquer papel: timestamp, dispositivo, IP, geolocalização por IP.
- Renegociação de valor de um serviço (log automático, não editável).
- Anotações manuais do Prestador sobre um Cliente (ex.: "bom cliente", "mal educado").
- Anotações manuais do Prestador sobre um Serviço específico.
- Comentários do Administrador sobre um Serviço (ver §6.4).

### 5.2 Regras de visibilidade (importante — é uma matriz de permissão, não um log único)
| Quem escreveu | Quem pode ver |
|---|---|
| Log do Prestador sobre um Cliente/Serviço | **Só o próprio Prestador** que escreveu |
| Log/relatório de auditoria (login, dispositivo, IP) de Clientes e Prestadores | Administrador (todos) e SysAdmin |
| Log/relatório de auditoria envolvendo Administradores | Só SysAdmin |
| Comentário de Administrador sobre um Serviço | Por padrão só Administradores; se marcada a checkbox "tornar público", visível também fora do círculo de administradores (ver §6.4) |

**Regra dura:** um Prestador de Serviço **nunca** pode ler um log feito por um Administrador — nem sobre um Cliente, nem sobre o próprio Prestador.

---

## 6. Precificação e serviços

### 6.1 Modelo de cobrança
- **Por hora** (padrão inicial) ou **por serviço** (valor fechado) — escolha feita pelo prestador na configuração do perfil, não por pedido individual.

### 6.2 Preço não é fixo — aviso obrigatório no perfil
Sob o preço, de forma elegante/pequena mas legível, deve constar que o valor pode ser ajustado após avaliação do serviço no local (ex.: diária de R$100/hora pode virar R$500 se o problema for maior do que o esperado) — para evitar confronto de expectativa. ❓ *Leonardo vai revisar/aprovar o texto exato desse aviso.*

### 6.3 Serviços
- Um **serviço** nasce quando uma solicitação de cliente é aceita pelo prestador.
- Um cliente pode ter múltiplos serviços ao longo do tempo (histórico, dentro da aba de Clientes do prestador).
- Cada serviço tem status: agendado / realizado / cancelado.
- Botão de **renegociação** de valor por serviço, com log automático da mudança.

### 6.4 Comentário do Administrador em um serviço
- Administrador pode comentar em qualquer serviço.
- Checkbox com padrão **desmarcado** = comentário privado (só admins veem). Se marcada, comentário fica **público**. ❓ *Confirmar "público" = visível para quem exatamente (cliente? prestador? qualquer um)?*

---

## 7. Cadastro público e localização

Campos do cadastro (Prestador e Cliente):

| Campo | Obrigatório? | Observação |
|---|---|---|
| Nome | Sim | |
| Como gostaria de ser chamado | Não (opcional) | Apelido/nome social |
| Endereço | **Sim, para os dois papéis** | Com **mapa Leaflet** logo abaixo, PIN de localização exata — obrigatório para calcular proximidade nas buscas |
| Telefone | Sim | |
| É WhatsApp? | Sim/Não | Se sim, gera link clicável (`wa.me/<numero>`) com ícone do WhatsApp |

Prestador passa por aprovação do Administrador (via Telegram ou site); Cliente não.

---

## 8. Agenda e fluxo de agendamento

1. Prestador de serviço cadastra horários disponíveis na própria agenda.
2. Cliente busca por categoria (ordenado por proximidade, ver §2.4), entra no perfil do prestador, vê horários livres.
3. Cliente seleciona um horário → modal → escreve o que precisa/espera do serviço → confirma.
4. Esse horário fica **pendente** (bloqueado na agenda, não confirmado).
5. Mensagem enviada via **Telegram** para o prestador (WhatsApp fica para o futuro — API paga; Telegram é grátis, serve para o protótipo).
6. Prestador responde no Telegram com um comando (ex.: `/ok`) para aceitar → gera o **serviço** (ver §6.3).
7. Cliente recebe no Telegram confirmação com: dia, horário, serviço e valor.

**Painel do Administrador:** vê a agenda completa — todos os prestadores do workspace, todos os horários (livres/pendentes/confirmados).

❓ **A definir em conversa futura:**
- Fluxo de recusa/renegociação simétrico ao "ok".
- Origem do valor mostrado na confirmação quando a cobrança é "por serviço" (descrição livre do cliente) — alguém precisa arbitrar o valor antes da confirmação sair.
- Vínculo da conta Telegram de cada prestador/administrador (bot único com roteamento por chat-id cadastrado no perfil, provavelmente).
- O que acontece com um horário "pendente" sem resposta do prestador (expira?).

---

## 9. Integrações técnicas previstas

| Necessidade | Solução provável |
|---|---|
| Auth, banco, reset de senha por e-mail | Supabase (já em uso) |
| Mapa com PIN de localização no cadastro (Cliente e Prestador) | Leaflet + OpenStreetMap (já citado na spec) |
| Ordenar busca por proximidade | Cálculo de distância a partir das coordenadas do PIN (Postgres/PostGIS ou fórmula haversine) |
| Exportar localização | Deep link `https://wa.me/?text=...` e/ou `https://maps.google.com/?q=lat,lng` |
| Link direto para WhatsApp do contato | Deep link `https://wa.me/<numero>` |
| Convite de Administrador/Cliente/Prestador/Funcionário | Envio por WhatsApp (`wa.me` com texto pré-preenchido contendo link de cadastro) |
| Notificação de novo cadastro de prestador (aprovação) | Telegram Bot API → Administrador |
| Notificação de novo agendamento pendente + confirmação | Telegram Bot API (webhook + comando `/ok`) |
| Log de IP e geolocalização por IP em cada login | Serviço de IP geolocation (a escolher) + captura de user-agent/dispositivo |

---

## 10. Relação com o schema atual

Tabelas existentes que já cobrem parte disso: `workspaces`, `workspace_members`, `profiles` + `profiles_pii`, `vagas`, `candidaturas`, `conversas`/`mensagens`, `notificacoes`, `avaliacoes`.

Prováveis mudanças de schema (a confirmar em sessão de design):
- Novo papel **SysAdmin**, acima de `workspace_members` (papel global, não escopado a um workspace).
- **RBAC por módulo**: tabela de papéis customizados por workspace + tabela de permissões por módulo (§4).
- Substituir/estender `vagas` + `candidaturas` por `agenda_slots` (horário do prestador) + `agendamentos`/`servicos` (reserva do cliente → serviço, com status: livre → pendente → confirmado/realizado/cancelado, + histórico de renegociação de preço).
- Campos de localização (lat/lng do PIN) para **Cliente e Prestador** — a spec já tem ADR sobre localização aproximada (`docs/adr/0004-localizacao-aproximada.md`) — **revisar**, porque aqui o pedido é localização **exata** via PIN, não aproximada, e obrigatória para os dois papéis.
- Configuração de cobrança no perfil do prestador (`preco_tipo`: hora | servico, `preco_valor`, texto de aviso).
- Registro de handle/chat-id do Telegram por prestador (e por administrador, para aprovação de cadastro).
- Fluxo de convite (`invite` já existe — verificar se cobre convite por WhatsApp com papel-alvo, incluindo papéis customizados).
- Tabela de **logs** com escopo de visibilidade (prestador-privado vs. admin-only vs. público) — nova tabela, não reaproveita `denuncias`.
- Estado de aprovação do cadastro do Prestador (`pendente` / `aprovado`) + quem aprovou e quando.
- Tabela de **logins/auditoria de acesso**: user_id, timestamp, device, ip, geo (cidade/região a partir do IP).

---

## 11. Próximos passos

1. Leonardo continua detalhando a visão (telas, casos de borda, etc.).
2. Consolidar num `DEFINE_*.md` (SDD Fase 1) quando o escopo estabilizar.
3. Decidir: iterar o schema existente ou desenhar do zero as tabelas de agenda/agendamento/logs.
4. Fechar as perguntas ❓ marcadas ao longo do documento.
5. Antes de implementar a página do Cliente, gerar propostas visuais para escolher direção (não é um requisito técnico, é uma decisão de design).
