-- 0058: Financeiro da praça e limpeza de red flags (pedidos do Leonardo em
-- 11/09/2026, decisão D-047).
--
-- 1) "Limpar red flags": o Administrador pode tirar as red flags de um cliente
--    ou prestador que ele alcança, quando entender que não se justificam mais e
--    estão prejudicando a pessoa. A sinalização NÃO é apagada — é registro da
--    administração (D-045) — vira status 'limpa', com quem e quando limpou; sai
--    do perfil porque flags_da_pessoa() só conta as 'aprovada'.
-- 2) Notas avulsas: recebimentos fora da comissão automática (taxa de
--    cadastro, material, comissão paga em dinheiro...), emitidos pelo
--    Administrador da praça como recibo numerado. Não mexem no saldo da
--    comissão.
-- 3) Assinatura do Administrador: imagem PNG (desenhada no app) que vai nos
--    recibos que ele emite. Sem ela, o recibo mostra o nome em letra cursiva.
--
-- Escrita das notas só pela chave de serviço (lib/actions/financeiro.ts
-- confere papel e alcance antes). Assinatura: só o próprio Administrador ou
-- SysAdmin, e nunca a conta de exemplo (que qualquer visitante abre).

-- 1) Sinalizações: status 'limpa' --------------------------------------------
alter table public.sinalizacoes drop constraint sinalizacoes_status_check;
alter table public.sinalizacoes
  add constraint sinalizacoes_status_check check (status in ('pendente', 'aprovada', 'recusada', 'limpa'));
alter table public.sinalizacoes add column limpa_por uuid references auth.users(id) on delete set null;
alter table public.sinalizacoes add column limpa_em timestamptz;

comment on column public.sinalizacoes.status is
  'pendente (aguarda o Administrador) · aprovada (vira red flag) · recusada · limpa (era red flag; o Administrador '
  'limpou — continua registrada, sai do perfil).';
comment on column public.sinalizacoes.limpa_por is 'Administrador (ou SysAdmin) que limpou a red flag (migration 0058).';
comment on column public.sinalizacoes.limpa_em is 'Quando a red flag foi limpa (migration 0058).';

-- 2) Notas avulsas -------------------------------------------------------------
create table public.notas_avulsas (
  id            uuid primary key default gen_random_uuid(),
  numero        bigint generated always as identity unique,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  prestador_id  uuid references auth.users(id) on delete set null,
  pagador_nome  text not null check (char_length(btrim(pagador_nome)) between 2 and 120),
  descricao     text not null check (char_length(btrim(descricao)) between 3 and 300),
  valor         numeric(12,2) not null check (valor > 0 and valor <= 1000000),
  recebido_em   date not null,
  forma         text not null default 'pix' check (forma in ('pix', 'dinheiro', 'transferencia', 'outro')),
  emitido_por   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index notas_avulsas_praca_idx on public.notas_avulsas (workspace_id, recebido_em desc);
create index notas_avulsas_prestador_idx on public.notas_avulsas (prestador_id);

alter table public.notas_avulsas enable row level security;
create policy "notas_avulsas_select_pagador" on public.notas_avulsas
  for select to authenticated using (prestador_id = auth.uid());

comment on table public.notas_avulsas is
  'Recibos avulsos emitidos pelo Administrador da praça (migration 0058, D-047): recebimentos fora da comissão '
  'automática. Numerados (numero, sequência global). Não alteram o saldo da comissão. O prestador pagador lê os '
  'próprios; escrita só pela chave de serviço. Registro financeiro da administração (retenção de 5 anos).';
comment on column public.notas_avulsas.id is 'PK (uuid gerado).';
comment on column public.notas_avulsas.numero is 'Número do recibo, sequencial (Nº 000042).';
comment on column public.notas_avulsas.workspace_id is 'Praça que recebeu e emite o recibo.';
comment on column public.notas_avulsas.prestador_id is 'Prestador pagador, quando é alguém da plataforma (null = pagador de fora).';
comment on column public.notas_avulsas.pagador_nome is 'Nome de quem pagou, como sai no recibo.';
comment on column public.notas_avulsas.descricao is 'Referente a (ex.: "Taxa de cadastro", "Comissão de agosto paga em dinheiro").';
comment on column public.notas_avulsas.valor is 'Valor recebido, em reais.';
comment on column public.notas_avulsas.recebido_em is 'Dia em que o dinheiro entrou.';
comment on column public.notas_avulsas.forma is 'pix · dinheiro · transferencia · outro.';
comment on column public.notas_avulsas.emitido_por is 'Administrador (ou SysAdmin) que emitiu.';
comment on column public.notas_avulsas.created_at is 'Quando o recibo foi emitido.';

-- 3) Assinatura do Administrador -----------------------------------------------
create table public.assinaturas (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  imagem         text not null check (imagem like 'data:image/png;base64,%' and char_length(imagem) <= 300000),
  atualizado_em  timestamptz not null default now()
);

alter table public.assinaturas enable row level security;

create or replace function public.pode_assinar_recibos()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.user_id = auth.uid()
       and p.tipo_base in ('admin', 'sysadmin')
       and not p.exemplo
  );
$$;

comment on function public.pode_assinar_recibos() is
  'true se a pessoa logada é Administrador ou SysAdmin de verdade (não a conta de exemplo) — só ela grava a '
  'própria assinatura dos recibos (migration 0058).';
revoke execute on function public.pode_assinar_recibos() from anon, public;
grant execute on function public.pode_assinar_recibos() to authenticated;

create policy "assinaturas_select_own" on public.assinaturas
  for select to authenticated using (user_id = auth.uid());
create policy "assinaturas_insert_own" on public.assinaturas
  for insert to authenticated with check (user_id = auth.uid() and public.pode_assinar_recibos());
create policy "assinaturas_update_own" on public.assinaturas
  for update to authenticated
  using (user_id = auth.uid() and public.pode_assinar_recibos())
  with check (user_id = auth.uid() and public.pode_assinar_recibos());
create policy "assinaturas_delete_own" on public.assinaturas
  for delete to authenticated using (user_id = auth.uid());

comment on table public.assinaturas is
  'Assinatura do Administrador (ou SysAdmin) nos recibos que ele emite (migration 0058, D-047): PNG desenhado no '
  'app, em data URL. A própria pessoa lê e grava a sua (a conta de exemplo, não); o recibo lê pela chave de '
  'serviço depois de conferir quem pode ver.';
comment on column public.assinaturas.user_id is 'Dono da assinatura.';
comment on column public.assinaturas.imagem is 'data:image/png;base64,… (até ~220 KB).';
comment on column public.assinaturas.atualizado_em is 'Última vez que foi desenhada.';
