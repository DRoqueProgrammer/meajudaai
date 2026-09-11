-- 0056: várias chaves Pix por prestador (pedido do Leonardo em 10/09/2026:
-- "deve existir um botão Editar, outro Excluir, e outro Adicionar nova chave
-- Pix, que gerará um outro QR code. Daí o prestador precisa selecionar qual será
-- o PADRÃO para os serviços quando ele for na sessão para gerar e cobrar. Mas
-- nesta sessão, ele pode selecionar o QR code 2 se quiser").
--
-- Até aqui a chave era uma coluna só (profiles_pii.chave_pix). Agora cada
-- pessoa tem até 5 chaves com apelido ("Nubank", "Itaú PJ"), uma PADRÃO. A
-- coluna antiga continua existindo e passa a espelhar a chave padrão (gatilho),
-- para o que já lê dela — o aviso "falta chave Pix", a cobrança do serviço —
-- continuar funcionando sem mudar tudo de uma vez.

create table public.chaves_pix (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  apelido     text not null check (char_length(btrim(apelido)) between 1 and 40),
  chave       text not null check (char_length(btrim(chave)) between 1 and 77),
  padrao      boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index chaves_pix_padrao_unica on public.chaves_pix (user_id) where padrao;
create unique index chaves_pix_chave_unica on public.chaves_pix (user_id, chave);
create index chaves_pix_user_idx on public.chaves_pix (user_id, created_at);

alter table public.chaves_pix enable row level security;

create policy "chaves_pix_select_own" on public.chaves_pix
  for select to authenticated using (user_id = auth.uid());
create policy "chaves_pix_insert_own" on public.chaves_pix
  for insert to authenticated with check (user_id = auth.uid());
create policy "chaves_pix_update_own" on public.chaves_pix
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chaves_pix_delete_own" on public.chaves_pix
  for delete to authenticated using (user_id = auth.uid());

comment on table public.chaves_pix is
  'Chaves Pix de uma pessoa (até 5), cada uma gera o próprio QR; uma é a PADRÃO da cobrança dos serviços '
  '(migration 0056). Só o dono lê e escreve. profiles_pii.chave_pix espelha a padrão (gatilho).';
comment on column public.chaves_pix.id is 'PK (uuid gerado).';
comment on column public.chaves_pix.user_id is 'Dono da chave.';
comment on column public.chaves_pix.apelido is 'Nome curto para escolher na hora de cobrar ("Nubank", "Itaú PJ").';
comment on column public.chaves_pix.chave is 'A chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória), até 77 caracteres.';
comment on column public.chaves_pix.padrao is 'A chave usada por padrão na cobrança dos serviços — no máximo uma por pessoa.';
comment on column public.chaves_pix.created_at is 'Quando foi cadastrada.';

-- Limite de 5 chaves por pessoa.
create or replace function public.limitar_chaves_pix()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.chaves_pix c where c.user_id = new.user_id) >= 5 then
    raise exception 'limite de 5 chaves Pix por pessoa' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.limitar_chaves_pix() is 'Gatilho de chaves_pix (migration 0056): no máximo 5 chaves por pessoa.';
revoke execute on function public.limitar_chaves_pix() from anon, authenticated, public;

create trigger chaves_pix_limite
  before insert on public.chaves_pix
  for each row execute function public.limitar_chaves_pix();

-- profiles_pii.chave_pix acompanha a chave padrão (ou fica null sem nenhuma).
create or replace function public.espelhar_chave_pix_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles_pii p
     set chave_pix = (select c.chave from public.chaves_pix c where c.user_id = dono and c.padrao limit 1)
   where p.user_id = dono;
  return null;
end;
$$;

comment on function public.espelhar_chave_pix_padrao() is
  'Gatilho de chaves_pix (migration 0056): mantém profiles_pii.chave_pix igual à chave padrão da pessoa.';
revoke execute on function public.espelhar_chave_pix_padrao() from anon, authenticated, public;

create trigger chaves_pix_espelho
  after insert or update or delete on public.chaves_pix
  for each row execute function public.espelhar_chave_pix_padrao();

-- As chaves que já existem viram a chave padrão de cada pessoa.
insert into public.chaves_pix (user_id, apelido, chave, padrao)
select p.user_id, 'Minha chave', btrim(p.chave_pix), true
  from public.profiles_pii p
 where p.chave_pix is not null and btrim(p.chave_pix) <> ''
on conflict do nothing;
