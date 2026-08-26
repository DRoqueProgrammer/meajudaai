-- 0021: lembrete de avaliação 24h após a diária concluída.
--
-- Quem termina a diária e não avalia deixa um buraco na reputação — e a nota é
-- a moeda de confiança do produto. O fluxo já notifica o ajudante na conclusão
-- (mudarStatusVagaAction), mas um único aviso se perde. Aqui um job diário
-- reforça 24h depois, uma vez, para quem ainda não avaliou.
--
-- Duas peças: (1) `vagas.finalizada_em`, o marco temporal do "concluída"; e
-- (2) a função que enfileira os lembretes, chamada por um cron (endpoint
-- /api/cron/lembretes-avaliacao, ou pg_cron — ver docs/adr/0009).

-- (1) Marco de conclusão. Antes só existia o `status`, sem quando ele virou
-- 'finalizada' — impossível medir "24h depois". Preenchido por trigger para
-- valer em qualquer caminho de código que finalize a vaga.
alter table public.vagas add column if not exists finalizada_em timestamptz;

comment on column public.vagas.finalizada_em is
  'Instante em que a vaga passou a status=finalizada. Base do lembrete de avaliação (24h depois). Null enquanto não finalizada; linhas antigas ficam null (sem lembrete retroativo).';

create or replace function public.set_finalizada_em()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Só na TRANSIÇÃO para finalizada: reprocessar uma vaga já finalizada não
  -- remarca o relógio (senão o lembrete nunca "amadurece").
  if new.status = 'finalizada' and (old.status is distinct from 'finalizada') then
    new.finalizada_em := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_set_finalizada_em on public.vagas;
create trigger trg_set_finalizada_em
  before update on public.vagas
  for each row execute function public.set_finalizada_em();

-- (2) Enfileira os lembretes pendentes e devolve quantos criou. Idempotente: só
-- alcança quem foi ACEITO, ainda NÃO avaliou o profissional naquela diária, e
-- ainda NÃO recebeu este lembrete (dedupe pelo link da notificação). Rodar de
-- hora em hora nunca duplica.
create or replace function public.enfileirar_lembretes_avaliacao()
returns integer language plpgsql security definer set search_path = public as $$
declare v_inseridos integer;
begin
  with inseridos as (
    insert into public.notificacoes (user_id, tipo, titulo, mensagem, link)
    select
      c.ajudante_id,
      'lembrete_avaliacao',
      'Avalie a diária',
      'Como foi trabalhar em "' || v.titulo || '"? Sua avaliação ajuda o próximo ajudante e o próprio profissional.',
      '/avaliar/' || v.id::text
    from public.vagas v
    join public.candidaturas c on c.vaga_id = v.id and c.status = 'aceito'
    where v.status = 'finalizada'
      and v.finalizada_em is not null
      and v.finalizada_em <= now() - interval '24 hours'
      and not exists (
        select 1 from public.avaliacoes a
        where a.vaga_id = v.id and a.avaliador_id = c.ajudante_id
      )
      and not exists (
        select 1 from public.notificacoes n
        where n.user_id = c.ajudante_id
          and n.tipo = 'lembrete_avaliacao'
          and n.link = '/avaliar/' || v.id::text
      )
    returning 1
  )
  select count(*)::integer into v_inseridos from inseridos;
  return v_inseridos;
end $$;

-- Só o service_role chama (via endpoint do cron). Nunca exposta ao cliente.
revoke execute on function public.enfileirar_lembretes_avaliacao() from anon, authenticated, public;

comment on function public.set_finalizada_em() is
  'Trigger BEFORE UPDATE em vagas: carimba finalizada_em = now() na transição de status para finalizada.';
comment on function public.enfileirar_lembretes_avaliacao() is
  'Cria notificações tipo lembrete_avaliacao para ajudantes aceitos de diárias finalizadas há 24h+ que ainda não avaliaram. Idempotente (dedupe pelo link). Devolve a quantidade criada. Chamada por cron. SECURITY DEFINER.';
