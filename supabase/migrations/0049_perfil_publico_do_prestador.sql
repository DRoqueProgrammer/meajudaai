-- 0049: página pública do prestador (Fatia 5 — "página pública de prestador").
-- A vitrine da página inicial (D-034) mostra anúncios de serviço para quem não
-- tem conta, mas o "Ver agenda" caía no cadastro: não havia nada público do
-- prestador para ver antes de decidir criar a conta. profiles, agenda_slots e
-- avaliacoes só têm leitura para `authenticated`, então a página pública lê
-- por três funções SECURITY DEFINER com colunas escolhidas — nunca telefone,
-- e-mail, endereço ou o ponto exato, e só de prestador com a conta ATIVA.

create or replace function public.perfil_publico_prestador(p_id uuid)
returns table (
  user_id uuid, nome text, foto_url text, categoria text, bio text, disponibilidade text,
  cidade text, estado text, nota_media numeric, total_avaliacoes integer, servicos_realizados integer,
  verificado boolean, preco_tipo text, preco_valor numeric, exemplo boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nome, p.foto_url, p.categoria, p.bio, p.disponibilidade,
         p.cidade, p.estado, p.nota_media, p.total_avaliacoes, p.servicos_realizados,
         p.verificado, p.preco_tipo, p.preco_valor, p.exemplo, p.created_at
    from public.profiles p
   where p.user_id = p_id
     and p.tipo_base = 'prestador_servico'
     and p.status = 'ativo';
$$;

comment on function public.perfil_publico_prestador(uuid) is
  'Perfil público de um prestador ATIVO para a página /p/[id] (sem login; migration 0049). SECURITY DEFINER com '
  'colunas escolhidas — as mesmas que qualquer autenticado já lê em profiles; nunca contato nem localização.';

create or replace function public.horarios_livres_publicos(p_prestador uuid, p_limite integer default 30)
returns table (data date, hora_inicio time, hora_fim time)
language sql
stable
security definer
set search_path = ''
as $$
  select a.data, a.hora_inicio, a.hora_fim
    from public.agenda_slots a
    join public.profiles p on p.user_id = a.prestador_id
   where a.prestador_id = p_prestador
     and a.status = 'livre'
     and a.data >= (now() at time zone 'America/Sao_Paulo')::date
     and p.status = 'ativo'
     and p.tipo_base = 'prestador_servico'
   order by a.data, a.hora_inicio
   limit least(greatest(coalesce(p_limite, 30), 1), 90);
$$;

comment on function public.horarios_livres_publicos(uuid, integer) is
  'Próximos horários LIVRES de um prestador ativo, a partir de hoje em São Paulo, para a página pública (migration '
  '0049). Sem o id do horário: reservar exige conta — a página leva ao login com volta para o perfil.';

create or replace function public.avaliacoes_publicas(p_prestador uuid, p_limite integer default 10)
returns table (nota integer, comentario text, created_at timestamptz, avaliador_primeiro_nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.nota, v.comentario, v.created_at, nullif(split_part(btrim(a.nome), ' ', 1), '')
    from public.avaliacoes v
    join public.profiles p on p.user_id = v.avaliado_id
    left join public.profiles a on a.user_id = v.avaliador_id
   where v.avaliado_id = p_prestador
     and p.status = 'ativo'
     and p.tipo_base = 'prestador_servico'
   order by v.created_at desc
   limit least(greatest(coalesce(p_limite, 10), 1), 30);
$$;

comment on function public.avaliacoes_publicas(uuid, integer) is
  'Avaliações recebidas por um prestador ativo, para a página pública (migration 0049): nota, comentário e só o '
  'PRIMEIRO nome de quem avaliou — sem id nem sobrenome de quem escreveu.';

revoke execute on function public.perfil_publico_prestador(uuid) from public;
revoke execute on function public.horarios_livres_publicos(uuid, integer) from public;
revoke execute on function public.avaliacoes_publicas(uuid, integer) from public;
grant execute on function public.perfil_publico_prestador(uuid) to anon, authenticated;
grant execute on function public.horarios_livres_publicos(uuid, integer) to anon, authenticated;
grant execute on function public.avaliacoes_publicas(uuid, integer) to anon, authenticated;
