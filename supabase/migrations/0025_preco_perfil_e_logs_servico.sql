-- 0025: preço do prestador (perfil) + logs privados do prestador sobre um
-- serviço/evento da agenda (observações com data/hora, ver ROADMAP.md §5 e §6.1).

alter table public.profiles
  add column if not exists preco_tipo text check (preco_tipo in ('hora','servico')),
  add column if not exists preco_valor numeric(10,2);

comment on column public.profiles.preco_tipo is
  'Modelo de cobrança do prestador de serviço: "hora" (padrão) ou "servico" (valor fechado). '
  'Null até o prestador configurar — reservar um slot exige isso preenchido.';
comment on column public.profiles.preco_valor is
  'Valor correspondente ao preco_tipo. Copiado para servicos.preco_valor no momento da reserva '
  '(histórico da reserva não muda se o prestador reconfigurar depois).';

create table public.servico_logs (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid not null references public.servicos(id) on delete cascade,
  autor_id    uuid not null references auth.users(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now()
);
create index servico_logs_servico_idx on public.servico_logs (servico_id, created_at desc);
alter table public.servico_logs enable row level security;

comment on table public.servico_logs is
  'Observação privada do prestador sobre um serviço/evento da agenda — regra dura do ROADMAP.md §5.2: '
  'só o próprio autor (o prestador que escreveu) lê, nem admin nem cliente veem. Comentário de admin '
  'em serviço (com opção de tornar público) é uma tabela separada, ainda não implementada (fase futura).';

create policy "servico_logs_select_own" on public.servico_logs
  for select to authenticated using (autor_id = auth.uid());
create policy "servico_logs_insert_own" on public.servico_logs
  for insert to authenticated with check (
    autor_id = auth.uid()
    and exists (select 1 from public.servicos s where s.id = servico_id and s.prestador_id = auth.uid())
  );
