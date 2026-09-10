-- 0040: marca do mundo de exemplo (Fatia 1, tarefa 3). Fecha R-42/R-43
-- (cvg/docs/tech-spec/fatia-1-seguranca.md), ADR 0012, decisão D-015: as
-- cinco contas de exemplo continuam reais e editáveis, uma por papel, com
-- entrada em um clique pela landing — mas cada uma passa a só enxergar e
-- alterar o próprio mundo de exemplo. Esta migration cria só a MARCA no
-- banco (o fato); a regra de quem age sobre quem mora em lib/auth/exemplo.ts
-- e o escopo das leituras administrativas em lib/admin/consultas.ts — nunca
-- reconhecida pelo domínio do e-mail em tempo de consulta, espalhada pelo
-- código (anti-padrão que o próprio ADR 0012 registrou).

alter table public.profiles add column if not exists exemplo boolean not null default false;

comment on column public.profiles.exemplo is
  'Marca as pessoas do mundo de exemplo (R-42, ADR 0012, decisão D-015): exatamente '
  'as cinco contas de lib/auth/contas-exemplo.ts, casadas pelo e-mail em '
  'profiles_pii.email nesta migration (0040) — não pelo domínio do e-mail, que não '
  'identifica com segurança quem é de exemplo. Uma conta de exemplo só enxerga e '
  'altera outras contas de exemplo (lib/auth/exemplo.ts:podeAgirSobre, '
  'lib/admin/consultas.ts); pessoa nova nasce com false, o padrão da coluna.';

-- Casamento pelo e-mail — exatamente as cinco de CONTAS_EXEMPLO hoje, e só elas.
-- Existem outras contas de teste no banco (ex.: *@teste.local, *@teste.dev); elas
-- não entram nesta lista e por isso não são marcadas.
update public.profiles p
   set exemplo = true
  from public.profiles_pii pii
 where pii.user_id = p.user_id
   and lower(pii.email) in (
     'marina.costa@meajudaai.app',    -- cliente
     'joao.ferreira@meajudaai.app',   -- prestador_servico
     'beatriz.andrade@meajudaai.app', -- funcionario
     'marcelo.lopes@meajudaai.app',   -- admin
     'ricardo.bastos@meajudaai.app'   -- sysadmin
   )
   and p.exemplo is distinct from true;
