-- 0050: período preferido da visita (pedido do Leonardo em 10/09/2026: "a agenda
-- do prestador está aberta, neste caso, das 09 às 18h. O cliente pode abrir o
-- pedido, indicar na observação quando quer que seja realizada a visita —
-- manhã, tarde").
--
-- A agenda aberta é uma JANELA (ex.: 09:00–18:00), não um horário marcado: o
-- cliente pede dentro dela e diz quando prefere; o prestador confirma e combina.
-- Coluna própria em vez de só texto livre, para o prestador ver a preferência
-- de relance na agenda e no detalhe do serviço.

alter table public.servicos
  add column if not exists periodo_preferido text not null default 'qualquer'
    check (periodo_preferido in ('manha', 'tarde', 'noite', 'qualquer'));

comment on column public.servicos.periodo_preferido is
  'Quando o cliente prefere a visita dentro da janela da agenda aberta: manha · tarde · noite · qualquer '
  '(padrão). O cliente escolhe ao pedir; detalhes (ex.: "depois das 14h") vão na descrição. Migration 0050.';
