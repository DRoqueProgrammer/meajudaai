-- 0028: flag de WhatsApp no telefone (ROADMAP.md §7) + renegociação de preço
-- com aceite do cliente (ROADMAP.md §6.3): fica pendente até o cliente
-- aceitar ou recusar, nunca muda preco_valor direto.

alter table public.profiles_pii add column if not exists is_whatsapp boolean not null default true;
comment on column public.profiles_pii.is_whatsapp is
  'Se o telefone é WhatsApp — controla se a UI mostra o link wa.me. Default true (protótipo).';

alter table public.servicos add column if not exists preco_pendente numeric(10,2);
comment on column public.servicos.preco_pendente is
  'Novo valor proposto pelo prestador, aguardando aceite do cliente. Null = sem proposta pendente. '
  'Ao aceitar, vira preco_valor e este campo volta a null; ao recusar, só volta a null.';
