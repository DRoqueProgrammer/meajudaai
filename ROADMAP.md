# Roadmap — Evolução do Me Ajuda Aí

> Documento vivo. Captura a visão ditada por Leonardo (sessões de 09/09/2026) para a próxima fase do produto — um pivô/evolução do modelo atual de "vagas por diária" para um **marketplace de agendamento de serviços** com estrutura multi-empresa. Seções marcadas com ❓ são decisões em aberto para conversas futuras.

---

## 0. Auditoria — o que falta (atualizada em 10/09/2026 — vistoria dos 9 agentes e fatias do Converge)

> **Este documento continua sendo a fonte da intenção — e virou o BRD de uma cadeia formal.**
> Desde 09/09/2026 o projeto roda sob **Converge**: o backlog abaixo foi compilado num
> tech-spec assinado com 36 requisitos falsificáveis, fundamentado contra o banco real em
> 9 ADRs, decomposto em 6 raias com 24 legs, e atacado por um adversário de outra família.
> Antes de implementar qualquer item desta lista, leia nesta ordem:
> [`cvg/docs/tech-spec/fechar-v2-marketplace.md`](./cvg/docs/tech-spec/fechar-v2-marketplace.md)
> (o requisito, com id estável `R-n`) → [`cvg/docs/adrs/`](./cvg/docs/adrs/) (o terreno medido)
> → [`cvg/docs/CONTEXT.md`](./cvg/docs/CONTEXT.md) (o vocabulário) →
> [`cvg/swimlanes/`](./cvg/swimlanes/) (o plano de construção).
>
> **A ordem de construção não é a ordem desta lista.** O primeiro item do programa é o spike
> do QR (`swimlane-jornada-leg-01`), porque é o maior risco: ver
> `design/spike-qr/index.html`.

> **Vistoria de 10/09/2026.** Nove agentes especialistas avaliaram o app (nota geral
> **48/100**) — pareceres, métricas e telas "antes" em
> [`cvg/brain/refs/2026-09-10-vistoria/`](./cvg/brain/refs/2026-09-10-vistoria/README.md).
> Leonardo, no mesmo dia: *"Vamos melhorar. Faça todas as recomendações destes agentes."*
> As recomendações descem o Converge em **5 fatias**, cada uma com a lane que o `cvg lane`
> deu ([decisão](./cvg/brain/decisions/2026-09-10-vistoria-em-fatias.md)):
> **1 · Segurança** (NORMAL) → **2 · Vitrine v2 e LGPD** (NORMAL) → **3 · Redesign**
> (FULL) e **4 · Agenda e desempenho** (NORMAL) → **5 · Crescer** (FULL, emenda do
> programa "Fechar a v2"). **Isso muda a ordem de construção acima:** a segurança e a
> vitrine vêm antes do spike do QR e da fronteira de praça. **A Fatia 1 (segurança) está
> entregue** — 12 tarefas, migrations 0038–0041, 95 gabaritos contra o banco e a regressão
> de 10 passos no navegador verdes
> ([spec](./cvg/docs/tech-spec/fatia-1-seguranca.md), tarefas em `cvg/tasks/done/`).
> O Hero "feio" (GAP-002) agora tem direção: a da conselheira-design, no parecer 01.

Lista de tudo que foi pedido e ainda **não está construído**, pra não perder de vista no meio da implementação incremental. Ver também [HANDOVER.md](./HANDOVER.md) pra continuidade entre sessões/modelos.

- [ ] **Recomendações da vistoria de 10/09** — todas, pedido do Leonardo, em 5 fatias (ver o bloco acima). **Fatias 1 (segurança), 3 (redesign, lotes A–D) e 2 (vitrine e LGPD: privacidade/termos, baixar e excluir meus dados, cookies, SEO, clima no servidor, endereço e mapa no perfil) entregues em 10/09.** Na mesma noite, a pedido do Leonardo ao vivo (D-034 a D-039): anúncios do prestador com mural público e painel da praça do Administrador, Hero novo com as frases de volta, fotos públicas para toda conta, cadastro em duas colunas, agenda com fechar e faixa aberta, tipos de serviço e faturamento empilhado — e parte da Fatia 4 (sessão memoizada, fuso de São Paulo, horário cancelado liberado, D-031 mitigado). Faltam o resto da Fatia 4 (zod/`useActionState` na agenda, testes de integração das actions) e a Fatia 5.
- [ ] **Defeitos achados na Fatia 1, fora do escopo dela:** ~~a tela de cancelar serviço às vezes ficava em "Cancelando…"~~ (D-031 mitigado na Fatia 4: formulário inline e recarga de segurança; causa de fundo não isolada); ~~o "Localizar" do cadastro exigia login~~ (resolvido na Fatia 2, lote 2C); banner da home e comentário do SysAdmin não salvam para ninguém porque o auth hook nunca foi registrado (ADR 0009) — e o hook só pode ser registrado depois de escopar as cláusulas de SysAdmin pela marca de exemplo (D-030).
- [x] ~~Cobrança Pix por serviço~~ — **construída** no commit `541d6e0` (a vistoria de 10/09 apontou que esta linha estava desatualizada): `lib/pix/static-qr.ts`, card `components/pix/cobranca-pix.tsx` exibido em `/agenda/[slotId]`, campo "Chave Pix" no perfil gravando em `profiles_pii`. **Resta:** "o administrador configura a chave Pix em nome do prestador" continua sem solução — hoje só o dono edita `profiles_pii` (RLS `pii_update_self`).
- [ ] **Comissão da plataforma (Pix)** — pedido novo de 09/09/2026, escopo grande. O Prestador de Serviço paga um percentual de cada serviço à plataforma; o Administrador define a alíquota e a chave Pix da plataforma no próprio perfil; o prestador vê a alíquota e o quanto deve "naquele dia", clica e abre um QR com o valor já preenchido; um botão "Enviei o Pix" gera pendência que o Administrador confirma. Alíquota em três níveis (geral / por prestador / por serviço), configurável só por Administrador ou SysAdmin. **Bloqueado por decisão de produto:** no modelo P2P o prestador não pertence a workspace nenhum, então falta definir qual Administrador o cobra (mesma tensão ❓ do fim desta seção). Detalhamento e as 7 lacunas em [§16](#16-comissão-da-plataforma-pix) e em `cvg/brain/notes/2026-09-09-comissao-da-plataforma.md`.
- [ ] **Recibos de serviço** — ainda não iniciado. Leonardo apontou que o padrão já está resolvido em `refs/foco-contabil` (recibos de fatura) e em `refs/careconnect` — ler o `.ua/` desses dois repos antes de desenhar do zero.
- [ ] **Aba "Financeiro" pro Prestador de Serviço** — ainda não iniciada. Leonardo quer o mesmo padrão de `foco-contabil` e `careconnect` (e citou um repo "amazing-school", não clonado em `refs/`). Provável escopo: faturamento por período, histórico de recebimentos, talvez ligado à cobrança Pix acima.
- [ ] **Página inicial do Cliente** — mostrar os últimos serviços (mais recente → mais antigo, últimos 5, botão "mostrar todos"). Ideias adicionais a avaliar: próximo agendamento em destaque, atalho pra renegociação pendente, prestadores já usados (recontratar em 1 clique), aviso de serviço concluído aguardando avaliação.
- [x] ~~Cobertura de teste sem meta~~ — **resolvido**: meta de 100% definida, medida em duas escalas separadas (R-33/R-34). A lógica pura de `lib/` já está em **100%**; as ações de servidor exigem teste de integração e seguem pendentes.
- [x] ~~Hero card "feio"~~ — redesenhado de novo em 10/09 a pedido do Leonardo (D-035): saudação grande, frases sorteadas de volta, relógio grande, tempo agora e 4 dias.
- [ ] SysAdmin cai no `/inicio` genérico — precisa de dashboard próprio (KPIs + atalhos), sem Hero. ~~Administrador~~: resolvido em 10/09 com o **Painel da praça** (D-034).
- [ ] Painel/dashboard do Prestador com KPIs e gráficos (§2.3, aba Painel) — pode fazer sentido desenhar junto com a aba Financeiro acima.
- [ ] Carrossel de fotos no perfil do prestador (hoje só uma foto via `foto_url`)
- [ ] Cadastro do prestador com aprovação (Telegram ou site) + selo "aguardando aprovação" (§2.3)
- [ ] **Telegram** (bot de notificação de agendamento/aprovação) — bloqueado: precisa de credenciais de bot do Leonardo
- [ ] Papéis customizados dinâmicos além de "funcionário" fixo (§4) — hoje o admin convida como funcionário, mas não cria papéis novos
- [ ] Seletor de ícone/logo do workspace pelo Administrador (§15) — só o ícone global do app (favicon/logo) foi trocado
- [ ] Mostrar o comentário público do admin na UI do prestador/cliente (a permissão RLS já existe, falta só a leitura+exibição nas telas de serviço)
- [x] ~~Verificar se `login_logs` está gravando~~ — **resolvido**: 11 linhas na base, medido no Pass 2. A tabela grava. Virou verificação de não-regressão (R-29), não construção. Ver [ADR 0000](./cvg/docs/adrs/0000-context.md).

✅ **Tensão RESOLVIDA em 09/09/2026 (D-001).** A pergunta era se prestadores autônomos viram
membros de um workspace. A resposta do Leonardo redefiniu o próprio termo: **workspace não é
"uma empresa dentro do app", é uma praça** — uma instalação por cidade, com nome próprio
(*"podemos deployar em Niterói com um nome e em Maceió com outro; o workspace deve ser
respeitado"*). Prestador **e** cliente pertencem a uma praça, com isolamento total, e a pessoa
entra na praça pela instalação, sem escolher (D-006, D-007). Isso destrava de uma vez a
comissão, o dashboard do Administrador, a agenda completa e o comentário de admin em serviço.
Consequência descoberta pelo adversário do Pass 4 e declarada: como a base é compartilhada
(o SysAdmin é supra-praça), **uma pessoa não pode existir em duas praças com o mesmo e-mail**.
Detalhes em [`cvg/docs/tech-spec/_decisoes-travadas.md`](./cvg/docs/tech-spec/_decisoes-travadas.md).

**Já feito** (pra referência, não repetir): pivô de papéis (SysAdmin/Administrador/Prestador/Cliente) com rótulos respeitando gênero (masculino/feminino/neutro, `lib/papel-label.ts`) aplicados em nav/perfil/logs/usuários; correção do seletor de papel em `/admin/usuarios` (opções v1 tinham sumido cliente/prestador_servico); Agenda v2 com horário recorrente + calendário mês/semana + linha do tempo por hora, agora também pro Cliente (aba Agenda própria); resumo em texto de "você está aberto para X, dias Y, até Z" acima do formulário de abrir horário; células do mês mostrando hora+descrição de cada evento (não só um pontinho); card efêmero ao clicar num evento da agenda (`EventoPopover`), com link pra página de detalhe completo em `/agenda/[slotId]` (ações de aceitar/cancelar/log ficaram lá, não mais expandindo inline); "Meus serviços" do cliente com cards compactos, popover de perfil do prestador (clica no nome, abre card efêmero, fecha ao clicar fora) e filtro/paginação (10 + "ver todos"); `/admin/logs` com abas SysAdmin (log geral) / Administração (log só de admins), conforme a matriz de visibilidade do §5.2; cidades via IBGE completo (~5.570 municípios, busca com cache, substitui a lista fixa de 14); mapa reconstruído pro modelo P2P (`/buscar-prestador` com prestadores próximos no mapa, `/mapa` do prestador com clientes de serviço pendente/confirmado — pino sempre aproximado, nunca coordenada exata); categorias de prestador com nomes reais (Eletricista, Pedreiro, Mestre de Obras, etc.) em vez de "Ajudante de X"; nome da marca corrigido ("Me Ajuda Aí", com espaço); busca por proximidade sem expor coordenada exata; cadastro de Cliente/Prestador com PIN exato obrigatório; preço e categoria do prestador; cancelamento com justificativa; login completo (mostrar/ocultar senha com ícone, salvar credenciais, esqueci senha); logout sempre pra home; Hero (saudação por gênero/citação/relógio/previsão do tempo); banner de cookies; ícone da chave inglesa (logo + favicon), corrigido pra não sumir em zoom/tela estreita; RLS de PII entre partes de um serviço; link de WhatsApp (`lib/whatsapp.ts`); dataset de demonstração com 3 anos de histórico + fotos licenciadas; ciclo de vida de conta (desativar/reativar).

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
- Lista sempre **ordenada do mais recente para o mais antigo**, mostrando os últimos 10 com botão "ver todos"; precisa de **filtros** (nome do cliente, tipo de serviço, etc.).
- Cada serviço tem um preço inicial; botão **"Renegociar"** abre modal para propor um novo valor (ver §6.3 — exige aceite do cliente).
- Prestador também pode registrar logs sobre o serviço em si (não só sobre o cliente).

**Aba Painel (dashboard profissional):**
- Dashboard próprio do prestador com KPIs e gráficos relevantes (ex.: faturamento, nº de serviços no período, taxa de aceite, avaliação média, próximos agendamentos). ❓ *Lista final de KPIs/gráficos a definir — Leonardo quer algo "top", vale propor um layout antes de implementar.*

### 2.4 Cliente
- Cadastro **simplificado, sem aprovação** (diferente do prestador).
- Página própria — não pode ser uma tela vazia com só uma barra de busca; precisa ter conteúdo relevante (ex.: prestadores em destaque, categorias) além da busca (ex.: "encanador"). ❓ *Leonardo pediu para explorar isso com criatividade — vale gerar 2-3 propostas visuais (ex.: usando a skill `visual-explainer` ou um mockup) antes de implementar.*
- A própria localização do cliente aparece na página (usada para ordenar resultados).
- Endereço + PIN no mapa (Leaflet) são **obrigatórios** também para o cliente (não só para o prestador) — necessário para o cálculo de proximidade.
- Resultado de busca (ex.: "encanador") sempre **ordenado por proximidade**: prestador mais próximo primeiro, mais distante por último.
- Ao clicar num prestador (ex. João da Silva): abre o perfil dele (descrição, fotos, WhatsApp, agenda) → cliente escolhe horário disponível → descreve o que precisa → aguarda aceite (fluxo já detalhado em §5 do roadmap anterior / seção de agendamento abaixo).

### 2.5 Hero — cabeçalho de boas-vindas (Cliente, Administrador, Prestador de Serviço)

No topo da página inicial desses três papéis (mesmo padrão do `caixa-forte-app`, já em `refs/`):
- **Saudação** respeitando o gênero cadastrado (mesma regra do §12: Bem-vindo/Bem-vinda/Bem-vinde + nome).
- **Citação/frase inspiradora**, sorteada aleatoriamente de um banco de ~200 citações relevantes a cada carregamento. ❓ *Precisamos montar essa lista de ~200 citações (curadoria de fontes confiáveis, sem violar direitos autorais na atribuição) antes de implementar.*
- **Relógio** elegante, em tempo real.
- **Previsão do tempo** dos próximos 4 dias, via API gratuita — mesmo padrão já usado no `caixa-forte-app` e em outros projetos do Leonardo (reaproveitar a integração).
- Card **minimizável**: botão para recolher e outro para expandir de volta.

Registrado também como convenção de UI no `CLAUDE.md`.

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
- Um papel customizado como "Funcionário" **nasce sem nenhum módulo habilitado**. Na hora da criação/convite, o Administrador já seleciona quais módulos aquele funcionário terá — não é uma etapa posterior.

### ⚠️ Requisito de segurança crítico — autorização por módulo tem que ser sólida
Se um Funcionário tentar acessar diretamente (digitando a URL) um módulo/rota ao qual não tem permissão, o sistema **precisa bloquear e redirecionar para a página principal dele** — nunca deixar a rota carregar. Isso não pode ser só esconder o item de menu na UI: a checagem de permissão tem que valer **em cada rota/módulo**, no servidor (middleware/Server Component/Server Action), não só no client. Leonardo enfatizou isso como um ponto crítico de segurança ("cada papel é muito importante", "não deixe essa breach passar") — tratar como requisito não-negociável, não como detalhe de polimento.

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
- Um cliente pode ter múltiplos serviços ao longo do tempo (histórico, dentro da aba de Clientes do prestador, ver §2.3).
- Cada serviço tem status: agendado / realizado / cancelado.
- **Renegociação de valor exige aceite do cliente.** Fluxo: prestador percebe no local que o serviço vale mais do que o combinado (ex.: cliente esperava R$100, prestador avalia R$300) → abre a proposta de renegociação a partir da aba Serviços → fica **pendente de aceite do cliente** → só quando o cliente aceita o novo valor passa a valer. Cada mudança gera um **log automático** (ex.: "renegociado de R$100 para R$300"), com timestamp. ❓ *A definir: como o cliente é notificado da proposta (Telegram, igual ao agendamento?) e o que acontece se ele recusar (serviço cancela? mantém valor antigo? fica em impasse?).*
- **Cancelamento de serviço.** Na aba Serviços do prestador, dentro de um serviço específico, existe um botão **"Cancelar"**. Ao clicar, abre uma janela pedindo **justificativa** (texto obrigatório) — a confirmação muda o status do serviço para `cancelado` e grava um **log automático** com a justificativa e timestamp (mesmo mecanismo de log de §5).

### 6.4 Comentário do Administrador em um serviço
- Administrador pode comentar em qualquer serviço.
- Checkbox com padrão **desmarcado** = comentário privado (só admins veem). Se marcada, comentário fica **público** = visível para o cliente **e** o prestador daquele serviço.

---

## 7. Cadastro público e localização

Campos do cadastro (Prestador e Cliente):

| Campo | Obrigatório? | Observação |
|---|---|---|
| Nome | Sim | |
| Como gostaria de ser chamado | Não (opcional) | Apelido/nome social |
| Cidade | Sim | Selecionada da **lista oficial do IBGE** (mesmo padrão usado no projeto `amazing-school` — pedir o repo ao Leonardo quando formos implementar) |
| Endereço | **Sim, para os dois papéis** | Endereço escrito **+ mapa Leaflet** logo abaixo, com PIN de localização exata — **decisão confirmada: localização exata, não aproximada** (isso reverte o `docs/adr/0004-localizacao-aproximada.md` da v1 — precisamos de uma nova ADR superando a 0004 quando formos implementar) |
| Telefone | Sim | |
| É WhatsApp? | Sim/Não | Se sim, gera link clicável (`wa.me/<numero>`) com ícone do WhatsApp |

Prestador passa por aprovação do Administrador (via Telegram ou site); Cliente não.

**Mapa do Administrador (visão agregada) é diferente do mapa individual:** no mapa que o Administrador usa para ver todo mundo do workspace, pessoas da **mesma cidade devem aparecer agrupadas/próximas** — não espalhadas pelos pontos exatos, mesmo que os PINs individuais sejam exatos no banco. Ou seja: a localização exata é usada para o cálculo de proximidade nas buscas do cliente (§2.4) e para o prestador achar o endereço de um serviço aceito, mas a **visualização agregada por cidade** no painel do admin agrupa por cidade, sem espalhar os pontos.

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
- Fluxo de recusa simétrico ao "ok" (renegociação já respondida em §6.3 — exige aceite do cliente).
- Origem do valor mostrado na confirmação quando a cobrança é "por serviço" (descrição livre do cliente) — alguém precisa arbitrar o valor antes da confirmação sair.
- Vínculo da conta Telegram de cada prestador/administrador — provavelmente reaproveitando o padrão do `caixa-forte` (ver §9).
- O que acontece com um horário "pendente" sem resposta do prestador (expira?).

---

## 9. Integrações técnicas previstas

| Necessidade | Solução provável |
|---|---|
| Auth, banco, reset de senha por e-mail | Supabase (já em uso) |
| Lista de cidades (IBGE) | Reaproveitar o padrão do projeto `amazing-school` — pedir o repo ao Leonardo quando formos implementar |
| Mapa com PIN de localização exata no cadastro (Cliente e Prestador) | Leaflet + OpenStreetMap (já citado na spec) |
| Ordenar busca por proximidade | Cálculo de distância a partir das coordenadas do PIN (Postgres/PostGIS ou fórmula haversine) |
| Exportar localização | Deep link `https://wa.me/?text=...` e/ou `https://maps.google.com/?q=lat,lng` |
| Link direto para WhatsApp do contato | Deep link `https://wa.me/<numero>` |
| Convite de Administrador/Cliente/Prestador/Funcionário | Envio por WhatsApp (`wa.me` com texto pré-preenchido contendo link de cadastro) |
| Bot/notificações Telegram (aprovação de cadastro, agendamento, renegociação) | Padrão já pronto e testado no projeto `caixa-forte` — Leonardo vai mostrar/passar o repo quando formos implementar, para reaproveitar direto |
| Agenda (horários, slots, visualização por dia) | Padrão já implementado e funcionando em `careconnect` (já em `refs/`) e `vr-pilates` (pedir repo ao Leonardo quando for a hora) |
| Log de IP e geolocalização por IP em cada login | Serviço de IP geolocation (a escolher) + captura de user-agent/dispositivo |

**Convenção combinada com Leonardo:** para essas integrações (Telegram, Agenda, IBGE), ele tem repos de referência prontos e testados — perguntar e pedir o repo específico só quando a implementação daquela parte começar, em vez de tentar redesenhar do zero.

### 9.1 Repositórios de referência (módulos bons, já funcionando)

Clonados em `refs/` (não versionados no git do meajudaai):

| Repo | Status | Uso previsto |
|---|---|---|
| `careconnect` | ✅ clonado | Agenda (funcionando bem), separação de PII, avaliações |
| `foco-contabil` | ✅ clonado | SaaS server-actions-only, CRM, notificações, cron/webhooks |
| `mirante-dos-dados-br` | ✅ clonado | A avaliar |
| `caixa-forte-app` | ✅ clonado | Integração com Telegram (bot, notificações) |
| `professional-presentations` | ✅ clonado | A avaliar |
| `vr-pilates` | ✅ clonado | Agenda (funcionando bem, mesma referência que careconnect) |

❓ *`amazing-school` (padrão de lista de cidades do IBGE) ainda não foi passado — pedir quando formos implementar cidade/endereço.*

---

## 10. Relação com o schema atual

Tabelas existentes que já cobrem parte disso: `workspaces`, `workspace_members`, `profiles` + `profiles_pii`, `vagas`, `candidaturas`, `conversas`/`mensagens`, `notificacoes`, `avaliacoes`.

Prováveis mudanças de schema (a confirmar em sessão de design):
- Novo papel **SysAdmin**, acima de `workspace_members` (papel global, não escopado a um workspace).
- **RBAC por módulo**: tabela de papéis customizados por workspace + tabela de permissões por módulo (§4).
- Substituir/estender `vagas` + `candidaturas` por `agenda_slots` (horário do prestador) + `agendamentos`/`servicos` (reserva do cliente → serviço, com status: livre → pendente → confirmado/realizado/cancelado, + histórico de renegociação de preço).
- Campos de localização (cidade via código IBGE + lat/lng do PIN) para **Cliente e Prestador** — **decisão confirmada:** localização exata, obrigatória para os dois papéis. Superar `docs/adr/0004-localizacao-aproximada.md` com uma nova ADR quando entrarmos na implementação.
- Campo de cidade padronizado por código do IBGE (não texto livre) — mesmo padrão do `amazing-school`.
- Configuração de cobrança no perfil do prestador (`preco_tipo`: hora | servico, `preco_valor`, texto de aviso).
- Registro de handle/chat-id do Telegram por prestador (e por administrador, para aprovação de cadastro).
- Fluxo de convite (`invite` já existe — verificar se cobre convite por WhatsApp com papel-alvo, incluindo papéis customizados).
- Tabela de **logs** com escopo de visibilidade (prestador-privado vs. admin-only vs. público) — nova tabela, não reaproveita `denuncias`.
- Estado de aprovação do cadastro do Prestador (`pendente` / `aprovado`) + quem aprovou e quando.
- Tabela de **logins/auditoria de acesso**: user_id, timestamp, device, ip, geo (cidade/região a partir do IP).
- Campo `genero` no perfil (`masculino` | `feminino` | `prefiro_nao_responder`) — controla a saudação personalizada (§12).
- Registro de consentimento de cookies (aceite, data, versão da política) — ver §13.

---

## 11. Tela de Login

- Campo de e-mail e senha (Supabase Auth).
- **"Esqueceu a senha?"** — fluxo de recuperação por e-mail (Supabase já resolve o envio).
- **Mostrar/Ocultar Senha** — ícone de olho no campo de senha.
- **Salvar Credenciais** (e-mail e senha) — opção de lembrar login no dispositivo.

---

## 12. Cadastro — Gênero e saudação personalizada

- Todo cadastro (qualquer papel) inclui o campo **Gênero**, com opções: Masculino, Feminino, Prefiro não responder.
- Esse campo **controla a saudação em todo o app**:
  - Masculino → "Bem-vindo, {nome}!"
  - Feminino → "Bem-vinda, {nome}!"
  - Prefiro não responder → "Bem-vinde, {nome}!"
- O gênero pode ser alterado depois na **seção de Perfil** que todo usuário tem — acessível pelo botão com foto no canto superior esquerdo (mesmo padrão dos outros apps do Leonardo — conferir referência exata em `refs/` quando formos implementar).

---

## 13. Consentimento de Cookies

Adicionar banner/tela de consentimento de cookies, no mesmo padrão usado nos outros projetos do Leonardo (conferir implementação de referência em `refs/` quando formos implementar).

---

## 14. Próximos passos

1. Leonardo continua detalhando a visão (telas, casos de borda, etc.).
2. Consolidar num `DEFINE_*.md` (SDD Fase 1) quando o escopo estabilizar.
3. Decidir: iterar o schema existente ou desenhar do zero as tabelas de agenda/agendamento/logs.
4. Fechar as perguntas ❓ marcadas ao longo do documento.
5. Antes de implementar a página do Cliente, gerar propostas visuais para escolher direção (não é um requisito técnico, é uma decisão de design).
6. Ao chegar a hora de implementar Telegram, Agenda ou lista de cidades (IBGE), pedir a Leonardo os repos de referência (`caixa-forte`, `vr-pilates`, `amazing-school`) em vez de redesenhar do zero.
7. Nova ADR superando a `0004-localizacao-aproximada.md` (localização agora é exata, obrigatória para Cliente e Prestador).
8. Ao desenhar o RBAC por módulo (§4), tratar a checagem de autorização por rota como requisito de segurança crítico desde o primeiro commit — não como algo a reforçar depois.
9. Implementar a escolha de ícone/logo por workspace (§15) quando entrarmos na configuração do Administrador.

---

## 15. Ícone/logo do workspace (branding por Administrador)

Depois de gerar 50 opções de ícone (script + galeria em `design/icon-options/`, pasta **gitignored** — rascunho local, não versionado; ver `manifest.json` ali dentro para regenerar se a pasta sumir), Leonardo escolheu dois favoritos, ambos na combinação "navy escuro + amarelo" (alto contraste, pensada para favicon em aba escura do navegador):

- **`14-chave-inglesa-escuro.svg`** — chave inglesa
- **`29-colher-pedreiro-escuro.svg`** — colher de pedreiro

**Requisito novo (ainda não implementado):** o **Administrador de cada workspace** (não o ícone único e global do app) deve poder, numa tela de configuração do workspace:
1. Escolher qual dos dois ícones acima usar como ícone/logo do seu workspace.
2. Opcionalmente fazer **upload de um logo próprio** (arquivo de imagem) que passa a valer no lugar do ícone escolhido — usado nos mesmos lugares (barra superior ao lado de "Me Ajuda Aí!", favicon da aba, etc.) enquanto o usuário estiver naquele workspace.
3. **Remover** o logo enviado a qualquer momento, revertendo para o ícone padrão (um dos dois acima) escolhido no passo 1.

Schema provável (a confirmar em sessão de design): campo em `workspaces` tipo `icone_padrao` (enum com os 2 ícones) + `logo_upload_path` (nullable, Supabase Storage — bucket por workspace, mesmo padrão de outros uploads do projeto). Quando `logo_upload_path` está preenchido, tem prioridade sobre `icone_padrao` na renderização.

❓ **A confirmar:**
- O ícone/logo do **próprio app Me Ajuda Aí** (fora de qualquer workspace — ex.: telas de login, marketing) continua fixo, ou o SysAdmin também define um logo padrão da plataforma nesse mesmo mecanismo?
- Formato e tamanho aceitos no upload (SVG? PNG/JPG? limite de tamanho, recorte/crop obrigatório?).
- Onde exatamente essa configuração fica na UI do Administrador (provável: dentro de uma futura seção "Configurações do workspace").

---

## 16. Comissão da plataforma (Pix)

> Ditado por Leonardo em 09/09/2026. Captura fiel + lacunas em
> `cvg/brain/notes/2026-09-09-comissao-da-plataforma.md`. Ainda **não é spec**:
> entra como insumo do Pass 1 (Intent) do Converge.

**Ideia central:** o Prestador de Serviço paga comissão à plataforma sobre cada
serviço. O racional é explícito — vale a pena estar na plataforma, e é a
comissão que mantém **o perfil em dia**.

### 16.1 Quem define
- O **Administrador** define, no próprio perfil, a **alíquota geral** (% do valor
  de cada serviço) e a **chave Pix da plataforma** — chave distinta da do
  prestador (`profiles_pii.chave_pix`, que serve pra ele cobrar o cliente).
- Além da geral, existem alíquotas **específicas por Prestador de Serviço** e
  **por serviço**. Só **Administrador ou SysAdmin** configuram qualquer uma.
- Exemplo dado: um Administrador negocia com um prestador — "instalação elétrica,
  a alíquota vai ser 1,5%, e acabou".

### 16.2 O que o prestador vê
- Na página dele: a **alíquota** vigente e **quanto deve à plataforma naquele dia**.
- Clicar abre um **card com o QR code**, já com o valor do dia preenchido.
- O QR leva **nome, data e valor no meio** — possivelmente também o código do
  projeto. Requisito textual: *"se for muito grande, reduz tamanho, precisa ser
  um QR code perfeito, mas com dados no meio"*.

### 16.3 Registro do pagamento (esboço — "a gente depois pensa numa forma")
1. O prestador abre o card e clica em **"Enviei o Pix"**.
2. O **Administrador recebe uma pendência**.
3. O Administrador **dá OK** ("recebi esse Pix, hora tal, da pessoa tal") **ou não**.

### 16.4 ❓ Lacunas que travam a implementação
1. **Qual Administrador cobra?** No modelo P2P o prestador não pertence a
   workspace nenhum — falta o vínculo. É a mesma tensão da §0/§2.2 e **bloqueia
   a feature inteira**.
2. **"Por serviço" é por categoria ou por serviço individual?** O exemplo soa
   como categoria; a frase, como o serviço específico.
3. **Precedência entre as três alíquotas** (provável: serviço > prestador >
   geral — não foi dito).
4. **Qual status gera a dívida** (confirmado? realizado? pago?) e o que acontece
   se o serviço for cancelado depois.
5. **A dívida do dia acumula** se não for paga?
6. **Consequência de não pagar** — "perfil em dia" sugere alguma, nenhuma foi
   definida (sair da busca? selo de pendência?).
7. **Renegociação** (§6.3): comissão sobre o valor original ou o renegociado?

### 16.5 Restrição técnica conhecida
O builder EMV/BR Code já existe (`lib/pix/static-qr.ts`) e o card de cobrança do
prestador ao cliente já mostra nome/data/valor **ao lado** do QR. O pedido novo —
dados **no meio** — é uma sobreposição por cima do código, viável apenas com
**correção de erro nível H** e área central limitada; é por isso que "se for
muito grande, reduz tamanho". Validação obrigatória: leitura real por app de
banco, não inspeção visual.

