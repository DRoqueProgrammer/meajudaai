-- 0045: o mural público da página inicial mostra a foto do prestador ao lado
-- do anúncio (pedido do Leonardo: nenhuma conta sem foto, e a foto é o que dá
-- rosto à vaga "Necessita-se ajudante!"). A 0044 está travada no gate, então a
-- mudança de retorno de anuncios_publicos vem aqui: acrescenta prestador_foto
-- (profiles.foto_url, que já é pública para qualquer autenticado). Mudar as
-- colunas de retorno exige drop + create; os grants são refeitos abaixo.

drop function if exists public.anuncios_publicos(text, uuid, integer);

create function public.anuncios_publicos(
  p_tipo text default null,
  p_prestador uuid default null,
  p_limite integer default 24
)
returns table (
  id uuid, tipo text, titulo text, descricao text, categoria text, cidade text, estado text,
  whatsapp text, prestador_id uuid, prestador_nome text, prestador_categoria text,
  prestador_foto text, exemplo boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.tipo, a.titulo, a.descricao, a.categoria, a.cidade, a.estado,
         case when a.tipo = 'vaga_ajudante' then a.whatsapp end,
         a.prestador_id, p.nome, p.categoria, p.foto_url, p.exemplo, a.created_at
    from public.anuncios a
    join public.profiles p on p.user_id = a.prestador_id
   where a.status = 'ativo'
     and p.status = 'ativo'
     and p.tipo_base = 'prestador_servico'
     and (p_tipo is null or a.tipo = p_tipo)
     and (p_prestador is null or a.prestador_id = p_prestador)
   order by a.created_at desc
   limit least(greatest(coalesce(p_limite, 24), 1), 60);
$$;

comment on function public.anuncios_publicos(text, uuid, integer) is
  'Anúncios ATIVOS de prestadores ativos, para a página inicial (sem login), a busca e o perfil. SECURITY '
  'DEFINER com colunas escolhidas: nome, categoria e foto públicos do prestador, e o WhatsApp só da vaga para '
  'ajudante (o número que o prestador escolheu expor nela). Nunca telefone do perfil, e-mail nem endereço. '
  'Migrations 0044 e 0045 (prestador_foto).';

revoke execute on function public.anuncios_publicos(text, uuid, integer) from public;
grant execute on function public.anuncios_publicos(text, uuid, integer) to anon, authenticated;
