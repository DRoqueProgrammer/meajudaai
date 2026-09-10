-- 0039: contato, chave e endereço só entre as partes de um serviço válido
-- (Fatia 1, tarefa 2). Fecha R-40 e R-41 (cvg/docs/tech-spec/fatia-1-seguranca.md),
-- decisão D-017. A ADR 0010 mapeou que `tem_servico_com(uuid)` (migration 0027)
-- devolve verdadeiro para QUALQUER linha de `servicos` entre duas pessoas, em
-- qualquer status — inclusive cancelado — e é essa função que abre
-- `profiles_pii` (telefone, e-mail, chave_pix) e `profile_local` (ponto exato)
-- para a outra parte. A ADR 0015 mapeou que o endereço escrito mora em
-- `profiles.endereco`, numa tabela cuja política de leitura é
-- `profiles_select_all` (`using (true)`) — qualquer autenticado lê qualquer
-- linha, ao contrário do ponto exato (`profile_local`), que já é estrito.
--
-- R-40 — muda só o CRITÉRIO dentro de `tem_servico_com`: de "existe alguma
-- linha" para "existe uma linha com status pendente, confirmado ou
-- realizado". Como `pii_select_self_or_admin` (0027) e
-- `profile_local_select_own_or_sysadmin_or_parte` (0036) já terminam em
-- `or tem_servico_com(user_id)`, as duas tabelas herdam a regra nova sem
-- precisar recriar nenhuma policy — é o ponto único que a ADR 0010 registrou.
--
-- R-41 — o endereço escrito passa a morar em `profile_local.endereco`, sob a
-- MESMA policy de select que já rege o ponto exato (dono, sysadmin, ou parte
-- de serviço válido via tem_servico_com) — nenhuma policy nova aqui também.
-- `profiles.endereco` é removida depois de copiar qualquer valor existente
-- (a ADR 0015 mediu 0 de 9 perfis preenchidos no banco vivo em 10/09/2026;
-- confirmado de novo antes desta migration) para não perder dado real se
-- algum tiver sido escrito entre a auditoria e esta migration. A cópia e o
-- drop ficam num bloco condicional: se a coluna já não existir (reaplicação
-- desta mesma migration depois de um `migration repair --status reverted`,
-- que só reseta o histórico, não desfaz o schema), o passo é pulado — sem
-- isso, reaplicar quebraria na segunda vez com "column endereco does not
-- exist".
--
-- Buscado antes de escrever esta migration (procura por dependência de
-- `profiles.endereco` no banco e no código — resultado no relatório da
-- tarefa): 0 views, 0 funções e 0 entradas em pg_depend referenciam a coluna;
-- no código, só `cadastrarAction` (lib/actions/auth.ts) grava, e ninguém lê —
-- confirma a ADR 0015.

-- O endereço escrito muda de tabela: nasce em `profile_local`, ao lado do
-- ponto exato, sob a mesma RLS (dono, sysadmin, parte de serviço válido).
alter table public.profile_local add column if not exists endereco text;

comment on column public.profile_local.endereco is
  'Endereço em texto livre (rua, número, bairro), digitado no cadastro junto com o PIN no mapa. '
  'Migrado de profiles.endereco (migration 0029) nesta tarefa (R-41, ADR 0015) — a tabela antiga '
  'tinha leitura aberta a qualquer autenticado (profiles_select_all); aqui vale a mesma RLS do '
  'ponto exato (profile_local_select_own_or_sysadmin_or_parte): o próprio dono, o sysadmin, ou a '
  'outra parte de um serviço pendente/confirmado/realizado com ele (tem_servico_com).';

-- Copia qualquer endereço já escrito antes de a coluna antiga deixar de
-- existir (condicional: ver comentário no topo do arquivo sobre reaplicação).
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles' and column_name = 'endereco'
  ) then
    update public.profile_local pl
       set endereco = p.endereco
      from public.profiles p
     where pl.user_id = p.user_id
       and p.endereco is not null
       and btrim(p.endereco) <> '';
  end if;
end $$;

-- A coluna antiga sai de `profiles` — tabela de leitura aberta (ADR 0015).
alter table public.profiles drop column if exists endereco;

-- R-40 (D-017): o critério de "tem serviço com" passa a exigir um status que
-- prova um vínculo válido — pendente, confirmado ou realizado. Cancelado (e
-- qualquer status futuro fora desta lista) deixa de contar. Mesma assinatura,
-- mesmo SECURITY DEFINER e search_path fixo da 0027 — só o corpo muda, então
-- `pii_select_self_or_admin` e `profile_local_select_own_or_sysadmin_or_parte`
-- herdam a regra nova sem precisar ser recriadas.
create or replace function public.tem_servico_com(v_outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.servicos s
    where s.status in ('pendente', 'confirmado', 'realizado')
      and (
        (s.prestador_id = auth.uid() and s.cliente_id = v_outro)
        or (s.cliente_id = auth.uid() and s.prestador_id = v_outro)
      )
  )
$$;
revoke execute on function public.tem_servico_com(uuid) from anon, public;
grant execute on function public.tem_servico_com(uuid) to authenticated;

comment on function public.tem_servico_com(uuid) is
  'true se auth.uid() e v_outro têm ao menos um registro em servicos entre si com status pendente, '
  'confirmado ou realizado (R-40, D-017 — cancelado não conta, migration 0039). Usado para liberar '
  'leitura de profiles_pii (0027) e do ponto exato/endereço em profile_local (0036/0039) entre as '
  'partes de um serviço válido.';
