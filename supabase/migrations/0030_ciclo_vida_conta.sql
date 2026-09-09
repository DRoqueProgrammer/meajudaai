-- 0030: ciclo de vida de conta — nunca deletar, só desativar/reativar
-- (ROADMAP.md §3). "inativo" é o próprio dono desativando; "bloqueado"
-- continua sendo moderação (sysadmin/admin bane), papéis diferentes.
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('ativo', 'bloqueado', 'inativo'));

comment on column public.profiles.status is
  'ativo (padrão) · bloqueado (banido por moderação) · inativo (o próprio usuário desativou — '
  'reativa ao logar de novo, confirmando os dados). Nunca deletamos uma conta.';
