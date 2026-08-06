-- 0012: perfil editável + bucket de foto.
--
-- A tela de perfil é onde o profissional decide se deixa um desconhecido entrar
-- na obra dele, e mostrava só iniciais, nota e cidade. Faltavam os campos que a
-- spec (§2.1/2.2, tela 6) pede — e faltava qualquer forma de o usuário editar
-- o próprio perfil: só o sysadmin conseguia mexer em `profiles`.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists disponibilidade text;

comment on column public.profiles.bio is 'Texto livre "Sobre mim", escrito pelo próprio usuário. Máx. 600 no app.';
comment on column public.profiles.disponibilidade is 'Ex.: "Dias de semana, a partir das 7h". Texto livre, curto.';

-- Bucket de foto de perfil. Público na leitura porque a foto aparece para quem
-- avalia um candidato — é justamente o sinal de confiança. 2 MB e só imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Escrita só na própria pasta: o caminho começa com o uuid do dono, então
-- `storage.foldername(name)[1]` tem que bater com auth.uid().
drop policy if exists "avatar_leitura_publica" on storage.objects;
create policy "avatar_leitura_publica" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatar_insert_dono" on storage.objects;
create policy "avatar_insert_dono" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_update_dono" on storage.objects;
create policy "avatar_update_dono" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_delete_dono" on storage.objects;
create policy "avatar_delete_dono" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
