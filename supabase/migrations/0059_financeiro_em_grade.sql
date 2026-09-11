-- 0059: Financeiro em grade — recebimentos do prestador, OK de comissão por
-- serviço e "emite nota fiscal" no perfil (decisão D-048, pedidos do Leonardo
-- em 11/09/2026).
--
-- 1) Prestador: todo serviço realizado fica "a receber" até ele marcar
--    "Recebido" — o que cria uma linha em `recebimentos` (e é dela que sai o
--    recibo opcional, que ele manda pelo WhatsApp; o cliente não vê no app).
--    Também dá para lançar um recebimento avulso (sem serviço). O recibo não
--    tem valor fiscal (D-048).
-- 2) Administrador: o OK de pagamento da comissão passa a ser POR SERVIÇO
--    (comissoes.status 'paga' com quem e quando confirmou); "marcar o mês como
--    pago" dá o OK em todos os serviços do mês. O "Enviei o Pix" continua como
--    aviso do prestador.
-- 3) Perfil: `emite_nota_fiscal` — o prestador diz se emite nota; o cliente vê
--    "sim" ou "não". Nota fiscal é assunto entre as partes (D-048).

-- 1) Recebimentos do prestador ----------------------------------------------
create table public.recebimentos (
  id            uuid primary key default gen_random_uuid(),
  numero        bigint generated always as identity unique,
  prestador_id  uuid not null references auth.users(id) on delete cascade,
  servico_id    uuid unique references public.servicos(id) on delete set null,
  cliente_id    uuid references auth.users(id) on delete set null,
  pagador_nome  text not null check (char_length(btrim(pagador_nome)) between 2 and 120),
  descricao     text not null check (char_length(btrim(descricao)) between 3 and 300),
  valor         numeric(12,2) not null check (valor > 0 and valor <= 1000000),
  forma         text not null default 'pix' check (forma in ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro')),
  recebido_em   date not null,
  created_at    timestamptz not null default now()
);

create index recebimentos_prestador_idx on public.recebimentos (prestador_id, recebido_em desc);

alter table public.recebimentos enable row level security;

-- O recebimento é do prestador: só ele lê e escreve os dele. Ligado a um
-- serviço, o serviço tem de ser DELE e estar realizado, e o cliente é o do
-- serviço; avulso, o cliente (se houver) é alguém que já teve serviço com ele.
create or replace function public.recebimento_valido(p_servico uuid, p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_servico is not null then exists (
      select 1 from public.servicos s
       where s.id = p_servico
         and s.prestador_id = auth.uid()
         and s.status = 'realizado'
         and (p_cliente is null or p_cliente = s.cliente_id)
    )
    else p_cliente is null or exists (
      select 1 from public.servicos s where s.prestador_id = auth.uid() and s.cliente_id = p_cliente
    )
  end
  and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.tipo_base = 'prestador_servico');
$$;

comment on function public.recebimento_valido(uuid, uuid) is
  'Confere um recebimento do prestador logado (migration 0059): ligado a serviço, o serviço é dele, está '
  'realizado e o cliente é o do serviço; avulso, o cliente (se houver) já teve serviço com ele.';
revoke execute on function public.recebimento_valido(uuid, uuid) from anon, public;
grant execute on function public.recebimento_valido(uuid, uuid) to authenticated;

create policy "recebimentos_select_own" on public.recebimentos
  for select to authenticated using (prestador_id = auth.uid());
create policy "recebimentos_insert_own" on public.recebimentos
  for insert to authenticated
  with check (prestador_id = auth.uid() and public.recebimento_valido(servico_id, cliente_id));
create policy "recebimentos_update_own" on public.recebimentos
  for update to authenticated
  using (prestador_id = auth.uid())
  with check (prestador_id = auth.uid() and public.recebimento_valido(servico_id, cliente_id));
create policy "recebimentos_delete_own" on public.recebimentos
  for delete to authenticated using (prestador_id = auth.uid());

comment on table public.recebimentos is
  'Dinheiro que o prestador recebeu do cliente (migration 0059, D-048): por serviço realizado (um por '
  'serviço) ou avulso. Serviço realizado sem recebimento = "a receber". Base do recibo opcional, sem valor '
  'fiscal, que o prestador manda pelo WhatsApp. Só o próprio prestador lê e escreve.';
comment on column public.recebimentos.id is 'PK (uuid gerado).';
comment on column public.recebimentos.numero is 'Número do recibo do prestador, sequencial.';
comment on column public.recebimentos.prestador_id is 'Quem recebeu.';
comment on column public.recebimentos.servico_id is 'Serviço quitado (null = recebimento avulso).';
comment on column public.recebimentos.cliente_id is 'Cliente que pagou, quando é alguém da plataforma.';
comment on column public.recebimentos.pagador_nome is 'Nome de quem pagou, como sai no recibo.';
comment on column public.recebimentos.descricao is 'Referente a (o serviço, ou o que foi pago no avulso).';
comment on column public.recebimentos.valor is 'Valor recebido, em reais.';
comment on column public.recebimentos.forma is 'pix · dinheiro · cartao · transferencia · outro.';
comment on column public.recebimentos.recebido_em is 'Dia em que o dinheiro entrou.';
comment on column public.recebimentos.created_at is 'Quando foi registrado.';

-- 2) OK da comissão por serviço -----------------------------------------------
alter table public.comissoes add column paga_em timestamptz;
alter table public.comissoes add column confirmada_por uuid references auth.users(id) on delete set null;

comment on column public.comissoes.paga_em is 'Quando o Administrador deu o OK de pagamento desta comissão (migration 0059).';
comment on column public.comissoes.confirmada_por is 'Administrador (ou SysAdmin) que deu o OK (migration 0059).';

-- As já pagas herdam a data e o autor da decisão do pagamento que as quitou.
update public.comissoes c
   set paga_em = p.decidido_em, confirmada_por = p.decidido_por
  from public.pagamentos_comissao p
 where c.pagamento_id = p.id and c.status = 'paga' and c.paga_em is null;

-- 3) Emite nota fiscal ---------------------------------------------------------
alter table public.profiles add column emite_nota_fiscal boolean not null default false;

comment on column public.profiles.emite_nota_fiscal is
  'O prestador emite nota fiscal (MEI/empresa)? Aparece como sim/não no perfil que o cliente vê. A Me Ajuda '
  'Aí não emite nem intermedeia nota (migration 0059, D-048).';
