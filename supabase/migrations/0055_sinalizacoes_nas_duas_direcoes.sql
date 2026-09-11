-- 0055: sinalizações nas duas direções (pedido do Leonardo em 10/09/2026:
-- "cliente pode flagar prestador de serviço, com justificativa, vai pro
-- administrador. Se ele aceitar, aparece no perfil uma red flag. Prestador pode
-- flagar cliente, com justificativa (sempre com log date time), vai pro
-- administrador... O intuito é que o administrador pode suspender alguém se
-- achar que há evidências de pilantragem").
--
-- A 0053 só previa prestador → cliente e ainda não tinha dado nenhum (0 linhas):
-- aqui ela é refeita como `sinalizacoes`, genérica — quem sinaliza (autor) é
-- uma das partes de um SERVIÇO e o alvo é a outra parte ("o flag é dado no
-- serviço em si"); a justificativa é obrigatória; a data/hora fica em
-- created_at. Aprovada pelo Administrador, vira bandeira no perfil do alvo,
-- visível para o OUTRO lado (cliente vê as do prestador; prestador vê as do
-- cliente) e para a administração — nunca para o próprio alvo.

drop function if exists public.flags_do_cliente(uuid);
drop function if exists public.flags_aprovadas_do_cliente(uuid);
drop table if exists public.sinalizacoes_cliente;

create table public.sinalizacoes (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid not null references auth.users(id) on delete cascade,
  alvo_id       uuid not null references auth.users(id) on delete cascade,
  servico_id    uuid not null references public.servicos(id) on delete cascade,
  direcao       text not null check (direcao in ('prestador_para_cliente', 'cliente_para_prestador')),
  motivo        text not null check (motivo in ('nao_pagou', 'contato_por_fora', 'nao_compareceu', 'problema_no_servico', 'outro')),
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 600),
  status        text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  created_at    timestamptz not null default now(),
  decidido_por  uuid references auth.users(id) on delete set null,
  decidido_em   timestamptz
);

create index sinalizacoes_alvo_idx on public.sinalizacoes (alvo_id, status, created_at desc);
create index sinalizacoes_pendentes_idx on public.sinalizacoes (status) where status = 'pendente';
-- Cada parte sinaliza um serviço uma vez só.
create unique index sinalizacoes_servico_autor_unica on public.sinalizacoes (servico_id, autor_id);

alter table public.sinalizacoes enable row level security;

create policy "sinalizacoes_select_autor" on public.sinalizacoes
  for select to authenticated
  using (autor_id = auth.uid());

-- Quem sinaliza é uma das partes do serviço, e o alvo é a outra — na direção
-- declarada; sempre pendente, sem decisão.
create policy "sinalizacoes_insert_parte" on public.sinalizacoes
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and status = 'pendente'
    and decidido_por is null
    and decidido_em is null
    and exists (
      select 1 from public.servicos s
       where s.id = sinalizacoes.servico_id
         and (
           (sinalizacoes.direcao = 'prestador_para_cliente' and s.prestador_id = auth.uid() and s.cliente_id = sinalizacoes.alvo_id)
           or
           (sinalizacoes.direcao = 'cliente_para_prestador' and s.cliente_id = auth.uid() and s.prestador_id = sinalizacoes.alvo_id)
         )
    )
  );

comment on table public.sinalizacoes is
  'Sinalizações ("Flag Pilantra") entre as partes de um serviço, nas duas direções (migration 0055, refaz a '
  '0053). Nascem pendentes com justificativa; o Administrador aprova ou recusa pela chave de serviço '
  '(lib/actions/suspeitas.ts). Aprovadas, viram bandeira no perfil do alvo — flags_da_pessoa().';
comment on column public.sinalizacoes.id is 'PK (uuid gerado).';
comment on column public.sinalizacoes.autor_id is 'Quem sinalizou (uma das partes do serviço).';
comment on column public.sinalizacoes.alvo_id is 'Quem foi sinalizado (a outra parte).';
comment on column public.sinalizacoes.servico_id is 'O serviço em que a bandeira foi dada (obrigatório).';
comment on column public.sinalizacoes.direcao is 'prestador_para_cliente · cliente_para_prestador.';
comment on column public.sinalizacoes.motivo is 'nao_pagou · contato_por_fora · nao_compareceu · problema_no_servico · outro.';
comment on column public.sinalizacoes.justificativa is 'Relato de quem sinalizou (10 a 600 caracteres) — só a administração lê.';
comment on column public.sinalizacoes.status is 'pendente (aguarda o Administrador) · aprovada (vira bandeira) · recusada.';
comment on column public.sinalizacoes.created_at is 'Data e hora do registro (o "log" que aparece no hover da bandeira).';
comment on column public.sinalizacoes.decidido_por is 'Administrador (ou SysAdmin) que aprovou ou recusou.';
comment on column public.sinalizacoes.decidido_em is 'Quando foi decidida.';

-- As bandeiras (sinalizações APROVADAS) de uma pessoa, da mais recente para a
-- mais antiga, com a data/hora do registro e o nome de quem sinalizou. Só para
-- quem é do OUTRO lado (cliente vendo prestador, prestador vendo cliente) ou da
-- administração — pelo tipo do PERFIL de quem pergunta (o auth hook não está
-- registrado, então current_app_role() não serve — D-030). O próprio alvo, e
-- qualquer outro, não recebe linha nenhuma. Sem a justificativa.
create or replace function public.flags_da_pessoa(p_alvo uuid)
returns table (quando timestamptz, sinalizado_por text)
language sql
stable
security definer
set search_path = ''
as $$
  with quem as (
    select q.tipo_base from public.profiles q where q.user_id = auth.uid()
  ),
  alvo as (
    select a.tipo_base from public.profiles a where a.user_id = p_alvo
  )
  select s.created_at, coalesce(p.nome, 'Pessoa')
    from public.sinalizacoes s
    left join public.profiles p on p.user_id = s.autor_id
   where s.alvo_id = p_alvo
     and s.status = 'aprovada'
     and auth.uid() <> p_alvo
     and exists (
       select 1 from quem, alvo
        where quem.tipo_base in ('admin', 'sysadmin')
           or (quem.tipo_base = 'prestador_servico' and alvo.tipo_base = 'cliente')
           or (quem.tipo_base = 'cliente' and alvo.tipo_base = 'prestador_servico')
     )
   order by s.created_at desc;
$$;

comment on function public.flags_da_pessoa(uuid) is
  'Bandeiras (sinalizações APROVADAS) de uma pessoa, da mais recente para a mais antiga, com data/hora e o nome de '
  'quem sinalizou (migration 0055). Só o outro lado (cliente↔prestador) e a administração recebem linhas; o próprio '
  'alvo, nenhuma. Sem a justificativa (fica com a administração).';

revoke execute on function public.flags_da_pessoa(uuid) from anon, public;
grant execute on function public.flags_da_pessoa(uuid) to authenticated;
