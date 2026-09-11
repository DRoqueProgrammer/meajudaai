-- 0052: suspeitas e suspensão do prestador (pedido do Leonardo em 10/09/2026:
-- "adicione para o administrador um botão de suspeita de pilantragem. Imagine o
-- prestador de serviço não enviar o pix da comissão da plataforma que o ajudou a
-- conseguir cliente, ou se ele passa o whatsapp pra cliente e nunca mais volta.
-- O administrador deve poder adicionar Flags de Pilantragem no perfil que
-- somente ele mesmo administrador vê de cada prestador de serviço. Com o tempo,
-- dependendo das suspeitas, um prestador de serviço pode ser suspenso, e isso
-- deve ficar claro para o prestador de serviço, escrito em sua página de forma
-- educada, direta, formal").
--
-- Duas tabelas, as duas escritas SÓ pela chave de serviço (as actions do
-- Administrador conferem papel, praça e alcance antes — lib/actions/suspeitas.ts):
--   · suspeitas_prestador — os sinais; ninguém lê pela sessão (só a
--     administração, pelo servidor);
--   · suspensoes_prestador — a suspensão, com o motivo que o PRESTADOR lê
--     (policy de leitura só do próprio dono).
-- Suspenso, o perfil vira status 'suspenso': fora da busca, da vitrine, da
-- página pública e da reserva (tudo isso já exige status 'ativo' — 0043, 0044,
-- 0049) e sem publicar anúncio; a pessoa continua entrando para ler o aviso.

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
    check (status in ('ativo', 'bloqueado', 'inativo', 'removido', 'suspenso'));

comment on column public.profiles.status is
  'ativo (padrão) · bloqueado (banido por moderação) · inativo (o próprio usuário desativou — reativa ao logar '
  'de novo) · removido (anonimizado a pedido do titular, D-023) · suspenso (prestador suspenso pela '
  'administração por suspeitas — vê o aviso, some da busca e da vitrine; migration 0052). Nunca deletamos uma conta.';

create table public.suspeitas_prestador (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  autor_id      uuid references auth.users(id) on delete set null,
  motivo        text not null check (motivo in ('comissao_nao_paga', 'contato_por_fora', 'outro')),
  descricao     text check (descricao is null or char_length(descricao) <= 600),
  created_at    timestamptz not null default now()
);

create index suspeitas_prestador_idx on public.suspeitas_prestador (prestador_id, created_at desc);
alter table public.suspeitas_prestador enable row level security;
-- Sem policy nenhuma: a sessão (inclusive a do próprio prestador) não lê nem
-- escreve. Só a administração, pelo servidor.

comment on table public.suspeitas_prestador is
  'Sinais de suspeita sobre um prestador, registrados pelo Administrador da praça ou pelo SysAdmin (migration '
  '0052). Só a administração vê (sem policy de sessão; leitura e escrita pela chave de serviço, depois das '
  'checagens de lib/actions/suspeitas.ts).';
comment on column public.suspeitas_prestador.id is 'PK (uuid gerado).';
comment on column public.suspeitas_prestador.prestador_id is 'Prestador de Serviço sob suspeita.';
comment on column public.suspeitas_prestador.autor_id is 'Administrador (ou SysAdmin) que registrou.';
comment on column public.suspeitas_prestador.motivo is
  'comissao_nao_paga (não enviou o Pix da comissão da plataforma) · contato_por_fora (levou o cliente para '
  'fora da plataforma) · outro.';
comment on column public.suspeitas_prestador.descricao is 'Detalhe livre do Administrador (até 600 caracteres).';
comment on column public.suspeitas_prestador.created_at is 'Quando o sinal foi registrado.';

create table public.suspensoes_prestador (
  id              uuid primary key default gen_random_uuid(),
  prestador_id    uuid not null references auth.users(id) on delete cascade,
  motivo_publico  text not null check (char_length(btrim(motivo_publico)) between 10 and 600),
  suspenso_por    uuid references auth.users(id) on delete set null,
  suspenso_em     timestamptz not null default now(),
  encerrada_em    timestamptz,
  encerrada_por   uuid references auth.users(id) on delete set null
);

create unique index suspensoes_prestador_aberta_unica
  on public.suspensoes_prestador (prestador_id)
  where encerrada_em is null;

alter table public.suspensoes_prestador enable row level security;

create policy "suspensoes_prestador_select_own" on public.suspensoes_prestador
  for select to authenticated
  using (prestador_id = auth.uid());

comment on table public.suspensoes_prestador is
  'Suspensões de prestador (migration 0052): no máximo uma aberta por pessoa. O prestador lê a própria (o aviso '
  'formal na página dele); escrita só pela chave de serviço (lib/actions/suspeitas.ts).';
comment on column public.suspensoes_prestador.id is 'PK (uuid gerado).';
comment on column public.suspensoes_prestador.prestador_id is 'Prestador suspenso.';
comment on column public.suspensoes_prestador.motivo_publico is
  'O motivo que o PRESTADOR lê no aviso, escrito pela administração (10 a 600 caracteres). Os sinais em si '
  '(suspeitas_prestador) não são mostrados a ele.';
comment on column public.suspensoes_prestador.suspenso_por is 'Quem suspendeu (Administrador ou SysAdmin).';
comment on column public.suspensoes_prestador.suspenso_em is 'Início da suspensão.';
comment on column public.suspensoes_prestador.encerrada_em is 'Fim da suspensão (null = em vigor).';
comment on column public.suspensoes_prestador.encerrada_por is 'Quem encerrou a suspensão.';
