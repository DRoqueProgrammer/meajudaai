-- 0029: campo de endereço (texto) no perfil — o PIN exato já mora em
-- profile_local (migration 0023); este é só o texto legível associado.
alter table public.profiles add column if not exists endereco text;
comment on column public.profiles.endereco is
  'Endereço em texto livre (rua, número, bairro), digitado no cadastro junto com o PIN no mapa '
  '(profile_local guarda a coordenada exata). Obrigatório para cliente e prestador_servico na v2.';
