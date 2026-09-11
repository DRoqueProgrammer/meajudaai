-- 0054: a suspensão vale para cliente também, e a lista das flags aprovadas
-- (pedidos do Leonardo em 10/09/2026: "se tiver X pilantragens, no hover do
-- mouse deve aparecer em ordem decrescente de tempo, date time e quem flagou.
-- Lembrando que se for pilantra o suficiente, pode ser suspenso da plataforma
-- pelo administrador").
--
-- 1. suspensoes_prestador (0052) vira `suspensoes`, com `user_id`: a mesma
--    suspensão, o mesmo aviso, para prestador ou cliente. Ainda não havia
--    código usando a tabela — só o gabarito, atualizado junto.
-- 2. Cliente suspenso não faz pedido novo: a policy de reserva (0043) passa a
--    exigir também a conta do CLIENTE ativa.
-- 3. flags_do_cliente(): as sinalizações APROVADAS, da mais recente para a mais
--    antiga, com data/hora e o nome de quem sinalizou — para a bandeirinha com
--    hover. Só prestador, administrador e sysadmin recebem linhas.

alter table public.suspensoes_prestador rename to suspensoes;
alter table public.suspensoes rename column prestador_id to user_id;
alter index public.suspensoes_prestador_aberta_unica rename to suspensoes_aberta_unica;
alter policy "suspensoes_prestador_select_own" on public.suspensoes rename to "suspensoes_select_own";

comment on table public.suspensoes is
  'Suspensões de conta — prestador ou cliente — pela administração (migrations 0052/0054): no máximo uma aberta '
  'por pessoa. A pessoa lê a própria (o aviso formal na página dela); escrita só pela chave de serviço '
  '(lib/actions/suspeitas.ts). Enquanto aberta, profiles.status = suspenso.';
comment on column public.suspensoes.user_id is 'Pessoa suspensa (prestador ou cliente).';
comment on column public.suspensoes.motivo_publico is
  'O motivo que a PESSOA lê no aviso, escrito pela administração (10 a 600 caracteres). Os sinais em si não são mostrados a ela.';

drop policy if exists "servicos_insert_cliente" on public.servicos;
create policy "servicos_insert_cliente" on public.servicos
  for insert to authenticated
  with check (
    servicos.cliente_id = auth.uid()
    and servicos.status = 'pendente'
    and exists (
      select 1 from public.profiles c
       where c.user_id = auth.uid()
         and c.status = 'ativo'
    )
    and exists (
      select 1 from public.agenda_slots a
       where a.id = servicos.slot_id
         and a.status = 'livre'
         and a.prestador_id = servicos.prestador_id
    )
    and exists (
      select 1 from public.profiles p
       where p.user_id = servicos.prestador_id
         and p.status = 'ativo'
         and p.preco_tipo = servicos.preco_tipo
         and p.preco_valor = servicos.preco_valor
    )
  );

comment on policy "servicos_insert_cliente" on public.servicos is
  'R-37 (ADR 0010) + 0043 + 0054: o cliente dono, com a conta ATIVA (não suspensa), só nasce um serviço pendente, '
  'sobre um horário livre do prestador indicado — também com a conta ativa —, com preco_tipo/preco_valor iguais '
  'ao perfil desse prestador nesse instante. Não se aplica à service_role nem ao role postgres.';

create or replace function public.flags_do_cliente(p_cliente uuid)
returns table (quando timestamptz, sinalizado_por text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.created_at, coalesce(p.nome, 'Prestador')
    from public.sinalizacoes_cliente s
    left join public.profiles p on p.user_id = s.prestador_id
   where s.cliente_id = p_cliente
     and s.status = 'aprovada'
     and exists (
       select 1 from public.profiles quem
        where quem.user_id = auth.uid()
          and quem.tipo_base in ('prestador_servico', 'admin', 'sysadmin')
     )
   order by s.created_at desc;
$$;

comment on function public.flags_do_cliente(uuid) is
  'Sinalizações APROVADAS de um cliente, da mais recente para a mais antiga, com a data/hora do registro e o nome '
  'de quem sinalizou (migration 0054) — o hover da bandeirinha. Só prestador, administrador e sysadmin recebem '
  'linhas; o próprio cliente, nenhuma. Não traz o relato (fica com a administração).';

revoke execute on function public.flags_do_cliente(uuid) from anon, public;
grant execute on function public.flags_do_cliente(uuid) to authenticated;
