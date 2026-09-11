-- 0047: tipos de serviço (decisão do Leonardo em 10/09/2026: "Todo serviço deve
-- poder ser categorizado, e essas categorias serão o tipo. Crie tipos de
-- serviços: manutenção em madeira, instalação elétrica, instalação de varal,
-- instalação de móveis, desmontagem/remontagem de móveis e outros"). É o que
-- empilha o gráfico de faturamento do prestador. Diferente de
-- categorias_servico (a PROFISSÃO do prestador, ex. ajudante de eletricista):
-- aqui é o TIPO do trabalho feito em cada serviço.

create table public.tipos_servico (
  slug  text primary key,
  nome  text not null,
  ordem integer not null
);

insert into public.tipos_servico (slug, nome, ordem) values
  ('manutencao_madeira', 'Manutenção em madeira', 1),
  ('instalacao_eletrica', 'Instalação elétrica', 2),
  ('instalacao_varal', 'Instalação de varal', 3),
  ('instalacao_moveis', 'Instalação de móveis', 4),
  ('desmontagem_remontagem_moveis', 'Desmontagem/remontagem de móveis', 5),
  ('outros', 'Outros', 99);

alter table public.tipos_servico enable row level security;
create policy "tipos_servico_select_todos" on public.tipos_servico
  for select to anon, authenticated using (true);

comment on table public.tipos_servico is
  'Catálogo dos tipos de serviço (migration 0047) — o cliente escolhe ao agendar e o prestador pode '
  'recategorizar. Empilha o gráfico de faturamento. Leitura aberta; escrita só por migration.';
comment on column public.tipos_servico.slug is 'Identificador estável (PK), gravado em servicos.tipo.';
comment on column public.tipos_servico.nome is 'Nome exibido.';
comment on column public.tipos_servico.ordem is 'Ordem nas listas (Outros sempre por último).';

alter table public.servicos
  add column if not exists tipo text not null default 'outros' references public.tipos_servico(slug);

comment on column public.servicos.tipo is
  'Tipo do trabalho (tipos_servico.slug). O cliente escolhe ao agendar; o prestador pode recategorizar em '
  'qualquer estado, até em serviço realizado (só essa coluna). Antigos: classificados pela descrição na 0047.';

-- Serviços que já existem: classificação única pela descrição (palavras-chave),
-- na ordem em que a mais específica vence. O que não casar fica 'outros'.
update public.servicos set tipo = case
  when descricao ~* '(desmont|remont|mudan[çc]a de m[óo]ve)' then 'desmontagem_remontagem_moveis'
  when descricao ~* 'varal' then 'instalacao_varal'
  when descricao ~* '(el[ée]tric|tomada|chuveiro|lumin[áa]ria|l[âa]mpada|disjuntor|fia[çc][ãa]o|interruptor|quadro de luz|ventilador|lustre)' then 'instalacao_eletrica'
  when descricao ~* '(madeira|porta|janela|deck|assoalho|rodap[ée]|verniz|cupim)' then 'manutencao_madeira'
  when descricao ~* '(m[óo]ve(l|is)|arm[áa]rio|prateleira|estante|guarda-roupa|painel de tv|nicho|cortina|persiana|suporte)' then 'instalacao_moveis'
  else 'outros'
end;

create index if not exists servicos_prestador_tipo_idx on public.servicos (prestador_id, tipo);

-- O gatilho de transição (0038) trava qualquer mudança em serviço final. Aqui
-- ele passa a deixar SÓ o tipo mudar — pelo prestador em qualquer estado, e
-- pelo cliente enquanto o serviço está pendente —; o resto continua igual.
create or replace function public.validar_transicao_servico()
returns trigger
language plpgsql
as $$
declare
  quem uuid := auth.uid();
begin
  if public.is_chamada_privilegiada() then
    return new;
  end if;

  if new.tipo is distinct from old.tipo then
    if quem is distinct from old.prestador_id
       and not (quem = old.cliente_id and old.status = 'pendente') then
      raise exception 'Só o prestador recategoriza o serviço (o cliente, só enquanto está pendente).';
    end if;
    -- Só o tipo mudou: vale até em serviço realizado ou cancelado.
    if (to_jsonb(new) - 'tipo') = (to_jsonb(old) - 'tipo') then
      return new;
    end if;
  end if;

  if old.status in ('realizado', 'cancelado') then
    raise exception 'Serviço em estado final (%) não aceita mudanças.', old.status;
  end if;

  if new.slot_id is distinct from old.slot_id
      or new.cliente_id is distinct from old.cliente_id
      or new.prestador_id is distinct from old.prestador_id
      or new.preco_tipo is distinct from old.preco_tipo
      or new.created_at is distinct from old.created_at
  then
    raise exception 'O vínculo do serviço (horário, cliente, prestador) e o tipo de preço são imutáveis depois do nascimento.';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'confirmado' then
      if old.status <> 'pendente' or quem is distinct from old.prestador_id then
        raise exception 'Só o prestador confirma um serviço pendente.';
      end if;
    elsif new.status = 'realizado' then
      if old.status <> 'confirmado' or quem is distinct from old.prestador_id then
        raise exception 'Só o prestador marca como realizado um serviço confirmado.';
      end if;
    elsif new.status = 'cancelado' then
      if quem is distinct from old.cliente_id and quem is distinct from old.prestador_id then
        raise exception 'Só o cliente ou o prestador do serviço podem cancelar.';
      end if;
      if new.cancelado_motivo is null or btrim(new.cancelado_motivo) = '' then
        raise exception 'Cancelamento exige um motivo (não vazio depois de tirar os espaços).';
      end if;
    else
      raise exception 'Transição de % para % não é permitida.', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.validar_transicao_servico() is
  'Gatilho BEFORE UPDATE em servicos (ADR 0010, R-38; tipo na 0047): valida a transição de status pela regra '
  'do papel de quem está escrevendo (auth.uid()) — só o prestador confirma e marca realizado, qualquer parte '
  'cancela com motivo não vazio, realizado/cancelado são finais. Trava o vínculo (slot_id, cliente_id, '
  'prestador_id), o preco_tipo e o created_at. Exceção da 0047: mudar SÓ o tipo é permitido ao prestador em '
  'qualquer estado e ao cliente enquanto pendente. Libera service_role e postgres (is_chamada_privilegiada).';
