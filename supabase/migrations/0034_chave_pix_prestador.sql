-- 0034: chave Pix do prestador, pra gerar cobrança personalizada por serviço
-- (nome do cliente, data e valor exibidos junto do QR — ver components/pix).
-- Fica em profiles_pii (mesmo lugar de telefone), não em profiles: é dado
-- financeiro sensível, RLS já restringe a select-self-or-admin (0001).

alter table public.profiles_pii add column if not exists chave_pix text;
comment on column public.profiles_pii.chave_pix is
  'Chave Pix do prestador (CPF/CNPJ, e-mail, telefone ou aleatória) — usada para gerar o QR de '
  'cobrança de cada serviço (ver lib/pix/static-qr.ts). Configurada pelo próprio prestador em '
  '/perfil/editar; o Administrador poderá configurar em nome de alguém em uma fase futura '
  '(ainda não implementado — ver ROADMAP.md).';
