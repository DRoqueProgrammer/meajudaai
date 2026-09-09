-- 0035: contador público de "serviços realizados" do prestador.
--
-- `servicos` tem RLS restrita às partes envolvidas (0024) — um cliente
-- olhando o perfil público de um prestador com quem nunca fechou nada
-- receberia 0 linhas ao tentar contar, não o total real. Mesmo padrão já
-- usado pra nota_media/total_avaliacoes: um contador denormalizado em
-- `profiles` (tabela com select liberado pra qualquer autenticado),
-- mantido por trigger — nunca uma contagem ao vivo sobre `servicos`.

alter table public.profiles add column if not exists servicos_realizados integer not null default 0;
comment on column public.profiles.servicos_realizados is
  'Total de servicos com status=realizado deste prestador. Denormalizado (trigger '
  'atualizar_servicos_realizados) porque servicos tem RLS restrita às partes envolvidas — um '
  'cliente olhando o perfil público de um prestador que nunca contratou precisa ver o total real, '
  'não um SELECT que a RLS zeraria pra ele.';

create or replace function public.atualizar_servicos_realizados()
returns trigger language plpgsql as $$
begin
  update public.profiles
  set servicos_realizados = (
    select count(*) from public.servicos where prestador_id = new.prestador_id and status = 'realizado'
  )
  where user_id = new.prestador_id;
  return null;
end;
$$;

comment on function public.atualizar_servicos_realizados() is
  'Trigger de servicos: recalcula profiles.servicos_realizados do prestador do serviço afetado, '
  'sempre que o status muda (cobre virar realizado E ser revertido de realizado).';

drop trigger if exists servicos_atualiza_realizados on public.servicos;
create trigger servicos_atualiza_realizados
  after insert or update of status on public.servicos
  for each row execute function public.atualizar_servicos_realizados();

-- Backfill: dados de seed já inseridos direto via SQL, antes deste trigger existir.
update public.profiles p
set servicos_realizados = (
  select count(*) from public.servicos s where s.prestador_id = p.user_id and s.status = 'realizado'
)
where p.tipo_base = 'prestador_servico';
