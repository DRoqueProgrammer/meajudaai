-- 0037: endereço/PIN fica no SERVIÇO, não só no perfil do cliente — o mesmo
-- cliente pode pedir serviços em endereços diferentes (a própria casa, a de
-- um parente, o escritório...). `servicos` já tem RLS restrita às partes
-- envolvidas (servicos_select_parties, migration 0024), então guardar a
-- coordenada exata aqui já é seguro por construção — sem precisar de
-- profile_local nem de tem_servico_com pra esse caso.

alter table public.servicos
  add column if not exists endereco text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.servicos.endereco is
  'Endereço em texto livre de ONDE esse serviço específico acontece — o cliente pode ter serviços '
  'em endereços diferentes, então isso não é o mesmo que o endereço do perfil (profiles.endereco).';
comment on column public.servicos.lat is
  'Latitude exata do local do serviço (PIN marcado pelo cliente ao reservar). Seguro guardar aqui: '
  'servicos já tem RLS restrita às partes envolvidas.';
comment on column public.servicos.lng is
  'Longitude exata do local do serviço — ver comentário de lat.';
