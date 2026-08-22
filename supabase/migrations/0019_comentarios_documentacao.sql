-- 0019: documentação do schema — COMMENT ON de tabelas, colunas e funções.
--
-- Aditiva e idempotente: COMMENT ON apenas anexa metadados (visíveis no
-- Dashboard do Supabase, no \d+ do psql e nas ferramentas de introspecção),
-- sem tocar em dados nem em estrutura. Consolida a documentação do banco que
-- estava dispersa nos cabeçalhos das migrations 0001–0018.
--
-- Convenção: toda coluna *_id é FK para auth.users(id) salvo indicação em
-- contrário; created_at é timestamptz default now().

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — perfil público (dados não sensíveis), 1:1 com auth.users
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.profiles is
  'Perfil público do usuário (dados não sensíveis), 1:1 com auth.users. PII (telefone/e-mail) fica separada em profiles_pii. Leitura liberada a autenticados; escrita só pelo próprio dono (RLS).';
comment on column public.profiles.user_id is 'PK e FK para auth.users(id). Mesmo id do usuário no Supabase Auth.';
comment on column public.profiles.nome is 'Nome de exibição. Default vazio até o cadastro preencher.';
comment on column public.profiles.foto_url is 'URL pública da foto no bucket "avatares" (0012). Null = usa iniciais.';
comment on column public.profiles.cidade is 'Cidade de atuação (texto livre; catálogo em lib/cidades.ts).';
comment on column public.profiles.estado is 'UF de atuação (2 letras).';
comment on column public.profiles.bairro is 'Bairro de referência (opcional).';
comment on column public.profiles.tipo_base is 'Papel global do usuário: sysadmin | admin | funcionario | ajudante (RBAC de 0008). Fonte do app_role no JWT via custom_access_token_hook.';
comment on column public.profiles.nota_media is 'Média (0–5, 2 casas) das avaliações recebidas. Mantida pelo trigger trg_recompute_nota; nunca escrever à mão.';
comment on column public.profiles.total_avaliacoes is 'Quantidade de avaliações recebidas. Mantida pelo trigger trg_recompute_nota.';
comment on column public.profiles.verificado is 'Selo de conta verificada (curadoria/manual). Sinal de confiança na busca.';
comment on column public.profiles.status is 'Estado da conta: ativo | bloqueado. Bloqueio é ação de moderação do admin.';
comment on column public.profiles.created_at is 'Data de criação do perfil.';
comment on column public.profiles.bio is 'Texto livre "Sobre mim", escrito pelo próprio usuário. Máx. 600 no app.';
comment on column public.profiles.disponibilidade is 'Ex.: "Dias de semana, a partir das 7h". Texto livre, curto.';

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles_pii — dados pessoais sensíveis, isolados numa tabela com RLS estrita
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.profiles_pii is
  'PII do usuário isolada do perfil público. Leitura só pelo próprio dono ou sysadmin (RLS). Split proposital: RLS row-level não esconde coluna, então o dado sensível vive numa tabela à parte.';
comment on column public.profiles_pii.user_id is 'PK e FK para auth.users(id).';
comment on column public.profiles_pii.telefone is 'Telefone de contato (citext, único).';
comment on column public.profiles_pii.email is 'E-mail de contato (citext, único). Espelha o e-mail de autenticação.';
comment on column public.profiles_pii.created_at is 'Data de criação do registro de PII.';

-- ─────────────────────────────────────────────────────────────────────────────
-- workspaces — empresa/equipe de um profissional (unidade multi-tenant)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.workspaces is
  'Empresa/equipe de um profissional — a unidade de isolamento multi-tenant. Toda vaga, conversa e permissão de módulo pertence a um workspace. Visível só para seus membros (ou sysadmin) via RLS.';
comment on column public.workspaces.id is 'PK (uuid gerado).';
comment on column public.workspaces.owner_id is 'Dono da empresa (FK auth.users). Papel "admin" no RBAC.';
comment on column public.workspaces.nome is 'Nome da empresa/equipe exibido no app.';
comment on column public.workspaces.cidade is 'Cidade sede (opcional).';
comment on column public.workspaces.estado is 'UF sede (opcional).';
comment on column public.workspaces.created_at is 'Data de criação do workspace.';

-- ─────────────────────────────────────────────────────────────────────────────
-- workspace_members — vínculo usuário ↔ workspace com papel
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.workspace_members is
  'Vínculo N:N entre usuário e workspace, com papel dentro da empresa. Base das checagens de tenancy (is_workspace_member).';
comment on column public.workspace_members.workspace_id is 'FK para workspaces(id). Parte da PK composta.';
comment on column public.workspace_members.user_id is 'FK para auth.users(id). Parte da PK composta.';
comment on column public.workspace_members.role is 'Papel na empresa: owner (sócio/gestor) | membro (funcionário).';
comment on column public.workspace_members.created_at is 'Data de entrada na equipe.';

-- ─────────────────────────────────────────────────────────────────────────────
-- vagas — vaga de diária publicada por um workspace
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.vagas is
  'Vaga de diária publicada por um workspace. Coração do marketplace. RLS: aberta é pública a autenticados; nas demais só a equipe dona, candidatos e sysadmin.';
comment on column public.vagas.id is 'PK (uuid gerado).';
comment on column public.vagas.workspace_id is 'Empresa dona da vaga (FK workspaces).';
comment on column public.vagas.criado_por is 'Usuário que publicou a vaga (FK auth.users).';
comment on column public.vagas.titulo is 'Título curto da vaga.';
comment on column public.vagas.categoria is 'Slug da categoria de serviço (ver categorias_servico).';
comment on column public.vagas.descricao is 'Descrição/observações do serviço (opcional).';
comment on column public.vagas.cidade is 'Cidade do serviço (filtro principal da busca).';
comment on column public.vagas.bairro is 'Bairro do serviço (opcional).';
comment on column public.vagas.cep is 'CEP do serviço (opcional).';
comment on column public.vagas.data_servico is 'Data em que a diária ocorre.';
comment on column public.vagas.hora_inicio is 'Horário de início da diária.';
comment on column public.vagas.valor_diaria is 'Valor pago pela diária, em reais (numeric 10,2).';
comment on column public.vagas.quantidade_vagas is 'Número de ajudantes desejados na vaga.';
comment on column public.vagas.status is 'Ciclo de vida: aberta | em_andamento | finalizada | cancelada.';
comment on column public.vagas.created_at is 'Data de publicação da vaga.';
comment on column public.vagas.local_aprox_lat is 'Latitude APROXIMADA (arredondada no servidor). Segura de expor no mapa público. Coordenada exata fica em vaga_local.';
comment on column public.vagas.local_aprox_lng is 'Longitude APROXIMADA (arredondada no servidor). Ver local_aprox_lat.';

-- ─────────────────────────────────────────────────────────────────────────────
-- candidaturas — candidatura de um ajudante a uma vaga
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.candidaturas is
  'Candidatura de um ajudante a uma vaga (único por vaga+ajudante). Insert só em vaga aberta e não pelo próprio gestor (RLS 0010).';
comment on column public.candidaturas.id is 'PK (uuid gerado).';
comment on column public.candidaturas.vaga_id is 'Vaga alvo (FK vagas, on delete cascade).';
comment on column public.candidaturas.ajudante_id is 'Ajudante candidato (FK auth.users).';
comment on column public.candidaturas.status is 'aguardando | aceito | recusado | cancelado. "aceito" libera contato/chat e a coordenada exata.';
comment on column public.candidaturas.created_at is 'Data da candidatura.';

-- ─────────────────────────────────────────────────────────────────────────────
-- avaliacoes — avaliação 1–5 estrelas entre partes de uma diária
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.avaliacoes is
  'Avaliação (1–5 estrelas) trocada entre partes de uma mesma diária. Único por vaga+avaliador+avaliado. Alimenta profiles.nota_media via trigger. Insert só entre quem trabalhou junto e nunca de si mesmo (RLS 0010).';
comment on column public.avaliacoes.id is 'PK (uuid gerado).';
comment on column public.avaliacoes.vaga_id is 'Diária avaliada (FK vagas, on delete set null). Obrigatório na inserção (RLS).';
comment on column public.avaliacoes.avaliador_id is 'Quem avaliou (FK auth.users).';
comment on column public.avaliacoes.avaliado_id is 'Quem recebeu a nota (FK auth.users).';
comment on column public.avaliacoes.nota is 'Nota de 1 a 5 (check constraint).';
comment on column public.avaliacoes.comentario is 'Comentário livre opcional.';
comment on column public.avaliacoes.created_at is 'Data da avaliação.';

-- ─────────────────────────────────────────────────────────────────────────────
-- mensagens — mensagens do chat (Realtime); pertencem a uma conversa
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.mensagens is
  'Mensagens do chat, publicadas via Supabase Realtime. Desde 0013 pertencem a uma conversa; vaga_id/destinatario_id são legado (nullable). Leitura/escrita só para membro da conversa (RLS).';
comment on column public.mensagens.id is 'PK (uuid gerado).';
comment on column public.mensagens.vaga_id is 'LEGADO (pré-0013): vaga de origem do chat. Nullable. Use conversa_id.';
comment on column public.mensagens.remetente_id is 'Autor da mensagem (FK auth.users).';
comment on column public.mensagens.destinatario_id is 'LEGADO (pré-0013): destinatário 1:1. Nullable. Use conversa_id.';
comment on column public.mensagens.conteudo is 'Texto da mensagem.';
comment on column public.mensagens.lida is 'Marca de leitura (legado do 1:1). O não-lido atual vem de conversa_membros.lido_ate.';
comment on column public.mensagens.created_at is 'Data/hora de envio.';
comment on column public.mensagens.conversa_id is 'Conversa à qual a mensagem pertence (FK conversas). Caminho atual de roteamento.';

-- ─────────────────────────────────────────────────────────────────────────────
-- notificacoes — notificações in-app (Realtime)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.notificacoes is
  'Notificações in-app entregues via Realtime. Cada usuário lê só as suas (RLS). Tipos: nova vaga, candidatura, aceite, mensagem, avaliação, conta aprovada/bloqueada.';
comment on column public.notificacoes.id is 'PK (uuid gerado).';
comment on column public.notificacoes.user_id is 'Destinatário da notificação (FK auth.users).';
comment on column public.notificacoes.tipo is 'Categoria da notificação; define ícone e o destino de fallback quando link é null.';
comment on column public.notificacoes.titulo is 'Título curto exibido no card.';
comment on column public.notificacoes.mensagem is 'Corpo da notificação (opcional).';
comment on column public.notificacoes.visualizada is 'Se já foi vista. Índice parcial serve o contador de não-lidas.';
comment on column public.notificacoes.created_at is 'Data/hora da notificação.';
comment on column public.notificacoes.link is 'Caminho interno para abrir ao tocar na notificação (ex.: /chat/<vaga_id>). Null = usa fallback por tipo.';

-- ─────────────────────────────────────────────────────────────────────────────
-- categorias_servico — catálogo de categorias (seed)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.categorias_servico is
  'Catálogo de categorias de serviço (ajudante de eletricista, pedreiro, pintor…). Semeado em 0003. Leitura liberada a autenticados.';
comment on column public.categorias_servico.slug is 'Identificador estável usado em vagas.categoria (PK).';
comment on column public.categorias_servico.nome is 'Rótulo exibido ao usuário.';
comment on column public.categorias_servico.ordem is 'Ordem de exibição na lista.';

-- ─────────────────────────────────────────────────────────────────────────────
-- denuncias — moderação (alvo polimórfico)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.denuncias is
  'Denúncias para moderação (escopo do Administrador). Alvo polimórfico (alvo_tipo + alvo_id). O denunciante cria e vê a própria; só sysadmin vê tudo e resolve (RLS 0008).';
comment on column public.denuncias.id is 'PK (uuid gerado).';
comment on column public.denuncias.denunciante_id is 'Quem denunciou (FK auth.users).';
comment on column public.denuncias.alvo_tipo is 'Tipo do alvo: usuario | vaga | avaliacao | mensagem.';
comment on column public.denuncias.alvo_id is 'ID do registro denunciado (polimórfico; sem FK por variar de tabela).';
comment on column public.denuncias.motivo is 'spam | fraude | abuso | nao_compareceu | conteudo_improprio | outro.';
comment on column public.denuncias.detalhe is 'Descrição livre do denunciante (opcional).';
comment on column public.denuncias.status is 'aberta | em_analise | resolvida | descartada.';
comment on column public.denuncias.resolucao is 'Nota do moderador ao resolver/descartar.';
comment on column public.denuncias.resolvido_por is 'Admin que resolveu (FK auth.users, on delete set null).';
comment on column public.denuncias.created_at is 'Data da denúncia.';
comment on column public.denuncias.updated_at is 'Última atualização de moderação.';

-- ─────────────────────────────────────────────────────────────────────────────
-- user_modules — permissão de módulo por funcionário/empresa (RBAC fino)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.user_modules is
  'Liga/desliga módulos e capacidades por funcionário dentro de um workspace (RBAC fino, molde CareConnect). Ausência de linha = default do papel (lib/auth/modules.ts). Gerida pelo admin da empresa.';
comment on column public.user_modules.user_id is 'Funcionário alvo (FK auth.users). Parte da PK.';
comment on column public.user_modules.workspace_id is 'Empresa onde a permissão vale (FK workspaces). Parte da PK.';
comment on column public.user_modules.module is 'Módulo/capacidade: vagas | equipe | financeiro | relatorios | publicar_vagas | chat_ajudantes | mapa. Parte da PK.';
comment on column public.user_modules.allowed is 'true libera, false nega explicitamente o módulo.';
comment on column public.user_modules.created_at is 'Data em que a permissão foi definida.';

-- ─────────────────────────────────────────────────────────────────────────────
-- conversas — motor de conversa (canal da equipe + DMs)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.conversas is
  'Motor de conversa único (0013): canal da equipe, DM interna e DM externa com ajudante. Singletons: 1 canal por equipe; 1 DM externa por (equipe, ajudante), que persiste entre diárias.';
comment on column public.conversas.id is 'PK (uuid gerado).';
comment on column public.conversas.workspace_id is 'Empresa dona da conversa (FK workspaces).';
comment on column public.conversas.tipo is 'canal_equipe | dm_interna | dm_externa (chat com o ajudante).';
comment on column public.conversas.ajudante_id is 'Ajudante da DM externa (FK auth.users). Null nos tipos internos.';
comment on column public.conversas.vaga_origem_id is 'Vaga que originou a DM externa (FK vagas, on delete set null). Referência histórica.';
comment on column public.conversas.created_at is 'Data de criação da conversa.';

-- ─────────────────────────────────────────────────────────────────────────────
-- conversa_membros — participantes de uma conversa + marca de leitura
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.conversa_membros is
  'Participantes explícitos de uma conversa e o ponteiro de leitura de cada um. Cada usuário só atualiza o próprio lido_ate (RLS).';
comment on column public.conversa_membros.conversa_id is 'FK para conversas(id). Parte da PK.';
comment on column public.conversa_membros.user_id is 'Membro da conversa (FK auth.users). Parte da PK.';
comment on column public.conversa_membros.lido_ate is 'Instante da última mensagem lida por este membro. Base do contador de não-lidas.';

-- ─────────────────────────────────────────────────────────────────────────────
-- vaga_local — coordenada EXATA da vaga (protegida)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.vaga_local is
  'Coordenada EXATA da vaga, isolada numa tabela com RLS estrita (molde profiles/profiles_pii). Lê só a equipe dona, o ajudante aceito ou sysadmin. Escrita apenas via service role. A aproximada fica em vagas.local_aprox_*.';
comment on column public.vaga_local.vaga_id is 'PK e FK para vagas(id), on delete cascade.';
comment on column public.vaga_local.lat is 'Latitude exata do serviço.';
comment on column public.vaga_local.lng is 'Longitude exata do serviço.';

-- ─────────────────────────────────────────────────────────────────────────────
-- bloqueio_agenda — dias de indisponibilidade do ajudante
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.bloqueio_agenda is
  'Dias em que o ajudante marcou indisponibilidade. Privado por dono: só o próprio ajudante lê, cria e remove (RLS 0015). Usado na detecção de conflito de agenda.';
comment on column public.bloqueio_agenda.ajudante_id is 'Dono do bloqueio (FK auth.users). Parte da PK.';
comment on column public.bloqueio_agenda.data is 'Dia bloqueado. Parte da PK.';
comment on column public.bloqueio_agenda.created_at is 'Quando o bloqueio foi criado.';

-- ─────────────────────────────────────────────────────────────────────────────
-- invite — convite por link para entrar num workspace
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.invite is
  'Convite por link + aprovação para um usuário entrar num workspace. RLS ON e SEM policies: só o service role (server actions) manipula. O token é a credencial lida no servidor.';
comment on column public.invite.id is 'PK (uuid gerado).';
comment on column public.invite.token is 'Credencial do convite (única); vai na URL /convite/<token>.';
comment on column public.invite.workspace_id is 'Empresa que convida (FK workspaces).';
comment on column public.invite.role is 'Papel que o convidado assume: owner | membro.';
comment on column public.invite.created_by is 'Quem gerou o convite (FK auth.users).';
comment on column public.invite.accepted_by is 'Quem aceitou (FK auth.users, on delete set null).';
comment on column public.invite.accepted_at is 'Quando foi aceito.';
comment on column public.invite.status is 'pendente | aceito | aprovado | recusado.';
comment on column public.invite.expires_at is 'Validade do convite (default: +14 dias).';
comment on column public.invite.created_at is 'Data de criação do convite.';

-- ─────────────────────────────────────────────────────────────────────────────
-- demanda_servico — demanda reprimida ("procuro X em Y")
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.demanda_servico is
  'Sinal de demanda reprimida capturado na busca de vagas sem resultado ("procuro {categoria} em {cidade}"). Único por (user, categoria, cidade) para a contagem refletir pessoas, não cliques. Agregado visível ao sysadmin.';
comment on column public.demanda_servico.id is 'PK (uuid gerado).';
comment on column public.demanda_servico.user_id is 'Quem sinalizou a demanda (FK auth.users).';
comment on column public.demanda_servico.categoria is 'Categoria procurada.';
comment on column public.demanda_servico.cidade is 'Cidade procurada.';
comment on column public.demanda_servico.created_at is 'Data do registro da demanda.';

-- ─────────────────────────────────────────────────────────────────────────────
-- home_banner — banner único da home (singleton)
-- ─────────────────────────────────────────────────────────────────────────────
comment on table public.home_banner is
  'Banner único da home (singleton: id sempre = 1). O sysadmin liga/desliga e edita o texto; quando ativo, aparece para todos.';
comment on column public.home_banner.id is 'Fixo em 1 (check id = 1) — garante linha única.';
comment on column public.home_banner.texto is 'Texto do banner.';
comment on column public.home_banner.ativo is 'Se o banner está visível na home.';
comment on column public.home_banner.updated_by is 'Sysadmin que editou por último (FK auth.users).';
comment on column public.home_banner.updated_at is 'Última edição do banner.';

-- ═════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES — helpers de RLS (SECURITY DEFINER, não disparam RLS por dentro),
-- auth hook e trigger de recálculo de média.
-- ═════════════════════════════════════════════════════════════════════════════
comment on function public.current_app_role() is
  'Papel do usuário logado lido do JWT (app_metadata.app_role, populado pelo custom_access_token_hook). Default ''ajudante''. Base do "god-mode" sysadmin nas policies.';
comment on function public.custom_access_token_hook(jsonb) is
  'Auth hook (Custom Access Token) do Supabase: injeta profiles.tipo_base como app_metadata.app_role no JWT emitido. Registrar em Authentication → Hooks. Executável só por supabase_auth_admin.';
comment on function public.is_workspace_member(uuid) is
  'True se o usuário logado pertence ao workspace informado. Helper de tenancy usado nas policies de workspaces/vagas.';
comment on function public.recompute_nota_media() is
  'Trigger AFTER INSERT/UPDATE/DELETE em avaliacoes: recalcula profiles.nota_media e total_avaliacoes do usuário avaliado. Não chamar diretamente.';
comment on function public.is_candidato(uuid) is
  'True se o usuário logado tem candidatura na vaga informada. Evita recursão entre as policies de vagas e candidaturas.';
comment on function public.can_manage_vaga(uuid) is
  'True se o usuário logado é membro do workspace dono da vaga (pode gerir a vaga). Helper de policy.';
comment on function public.has_capability(uuid, uuid, text) is
  'True se o usuário tem a capacidade/módulo liberado (user_modules.allowed) no workspace. Base do gating fino de funcionários.';
comment on function public.is_conversa_membro(uuid) is
  'True se o usuário logado participa da conversa (ajudante da DM externa, membro explícito, ou lado-equipe conforme tipo e capacidade). Núcleo da RLS do chat.';
comment on function public.is_parte_vaga(uuid, uuid) is
  'True se o usuário é parte da diária: ajudante candidato OU alguém do workspace da vaga. Gate de insert de mensagens e avaliações (0010).';
comment on function public.vaga_aberta(uuid) is
  'True se a vaga existe e está com status ''aberta''. Gate de insert de candidaturas (0010).';
comment on function public.is_ajudante_aceito(uuid, uuid) is
  'True se o usuário é o ajudante com candidatura ''aceito'' na vaga. Libera a leitura da coordenada exata (vaga_local, 0014).';
