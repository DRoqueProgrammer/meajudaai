# Documento Técnico Oficial — MeAjuda Aí

**Versão:** 1.0
**Proprietário do Projeto:** Henrique
**Data do documento:** 23/07/2026

---

## 1. Resumo do Projeto

O **MeAjuda Aí** conecta profissionais autônomos da construção civil e manutenção com ajudantes disponíveis para trabalho por diária. **Nesta fase, o produto é entregue como aplicação web responsiva (PWA)** — acessível pelo navegador no celular e no desktop. Um **app mobile nativo (Android e iOS)** permanece como evolução futura, sem previsão por ora.

### Stack tecnológica

Fase atual (protótipo web):

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router) · TypeScript · Tailwind |
| Backend / Banco | Supabase · PostgreSQL |
| Autenticação | Supabase Auth |
| Notificações | Supabase Realtime (in-app) |
| Mapas | Leaflet · OpenStreetMap |

> **Recomendação original do documento:** FlutterFlow (frontend) + Firebase (backend, Cloud Firestore, Authentication, Cloud Messaging) + Google Maps API — mantida como referência para uma futura versão mobile nativa.

---

## 2. Tipos de Usuário

### 2.1 Profissional

Exemplos de perfis: Eletricista, Pedreiro, Pintor, Encanador, Gesseiro, Azulejista, Mestre de Obras, Instalador, Técnico de Refrigeração.

**Permissões:** criar conta, editar perfil, publicar vaga, visualizar candidatos, aceitar candidato, recusar candidato, conversar por chat, avaliar ajudante, visualizar histórico.

### 2.2 Ajudante

**Permissões:** criar conta, editar perfil, visualizar vagas, candidatar-se, cancelar candidatura, conversar por chat, avaliar profissional, visualizar histórico.

### 2.3 Administrador

**Permissões:** bloquear usuários, excluir vagas, excluir avaliações, receber denúncias, gerenciar categorias, visualizar relatórios, gerenciar anúncios.

---

## 3. Telas Obrigatórias

| # | Tela | # | Tela |
|---|---|---|---|
| 01 | Splash Screen | 11 | Perfil do Usuário |
| 02 | Login | 12 | Minhas Diárias |
| 03 | Cadastro | 13 | Histórico |
| 04 | Recuperação de Senha | 14 | Chat |
| 05 | Escolha de Perfil | 15 | Notificações |
| 06 | Home Profissional | 16 | Avaliação |
| 07 | Home Ajudante | 17 | Configurações |
| 08 | Publicar Diária | 18 | Termos de Uso |
| 09 | Detalhes da Vaga | 19 | Política de Privacidade |
| 10 | Lista de Candidatos | 20 | Painel Administrativo |

---

## 4. Fluxos de Uso

### 4.1 Fluxo do Profissional

Cadastro → Perfil aprovado → Publicar vaga → Receber candidatos → Selecionar ajudante → Liberar contato → Executar serviço → Avaliar ajudante → Encerrar vaga.

### 4.2 Fluxo do Ajudante

Cadastro → Perfil aprovado → Visualizar vagas → Candidatar-se → Aguardar resposta → Ser aprovado → Receber contato → Executar serviço → Avaliar profissional → Finalizar diária.

> **Fora da fase atual (planejado):** a validação por SMS/OTP entre o cadastro e o uso da conta ainda não está ativa — no protótipo web o acesso é por e-mail e senha.

---

## 5. Funcionalidades Principais

### 5.1 Publicar Vaga

**Campos:** Título, Categoria, Descrição, Cidade, Bairro, CEP, Data, Horário, Valor da diária, Quantidade de vagas, Observações, Status.

**Status possíveis:** Aberta, Em andamento, Finalizada, Cancelada.

### 5.2 Candidatura

Botão **"Candidatar-se"**. O sistema registra: ID da vaga, ID do ajudante, Data, Status.

**Status possíveis:** Aguardando, Aceito, Recusado, Cancelado.

### 5.3 Sistema de Avaliação

Após a conclusão do serviço: nota de **1 a 5 estrelas** e comentário opcional. A média é calculada automaticamente.

### 5.4 Sistema de Denúncias

**Motivos:** Perfil falso, Golpe, Assédio, Linguagem ofensiva, Falta grave, Outros.

---

## 6. Banco de Dados

> **Fase atual:** PostgreSQL no Supabase (com RLS). As coleções abaixo são a modelagem conceitual do documento original (em Cloud Firestore); no protótipo web elas viram tabelas equivalentes.

### Coleção: `usuarios`
`id`, `nome`, `telefone`, `email`, `cidade`, `estado`, `foto`, `tipo_usuario`, `nota_media`, `status`, `data_cadastro`

### Coleção: `vagas`
`id`, `id_profissional`, `titulo`, `descricao`, `categoria`, `cidade`, `bairro`, `cep`, `valor_diaria`, `quantidade_vagas`, `status`, `data_servico`, `hora_inicio`, `data_criacao`

### Coleção: `candidaturas`
`id`, `id_vaga`, `id_ajudante`, `status`, `data_candidatura`

### Coleção: `avaliacoes`
`id`, `avaliador`, `avaliado`, `nota`, `comentario`, `data`

### Coleção: `mensagens`
`id`, `remetente`, `destinatario`, `mensagem`, `data`, `lida`

### Coleção: `notificacoes`
`id`, `usuario`, `titulo`, `mensagem`, `visualizada`, `data`

### Coleção: `denuncias`
`id`, `denunciante`, `denunciado`, `motivo`, `descricao`, `status`, `data`

---

## 7. Notificações

Nova vaga, Nova candidatura, Candidatura aceita, Mensagem recebida, Avaliação recebida, Conta aprovada, Conta bloqueada.

---

## 8. Segurança

Telefone único, Email único, Autenticação Supabase, Bloqueio por administrador, Logs de atividades.

> **CPF descartado** da coleta de dados. **Validação por SMS/OTP:** planejada, fora da fase atual (a autenticação hoje é por e-mail e senha).

---

## 9. Monetização Futura

| Item | Valor |
|---|---|
| Plano Premium | R$ 19,90/mês |
| Destaque de vaga | R$ 4,90 |
| Perfil destacado | R$ 9,90 |
| Publicidade | Banners patrocinados |

**Parcerias com lojas:** materiais elétricos, ferramentas, EPIs, cursos profissionalizantes.

---

## 10. Critérios de Entrega

Aplicação web responsiva (PWA) funcional e publicada (deploy web); código-fonte entregue; banco de dados Supabase configurado; painel administrativo funcional; documentação básica; garantia mínima de 30 dias.

> **Adiado para uma fase mobile futura (sem previsão por ora):** app nativo em FlutterFlow, backend Firebase e publicação na Google Play / App Store.

---

## 11. Objetivo Final

Criar a principal plataforma brasileira de conexão entre profissionais da construção civil e ajudantes para serviços por diária, oferecendo segurança, confiança e praticidade.
