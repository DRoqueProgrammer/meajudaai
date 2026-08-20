-- CPF foi descartado da coleta de dados do protótipo: o cadastro não pede mais
-- CPF e nenhuma leitura/escrita do app usa a coluna. Ela estava nullable e sem
-- uso; removê-la elimina o resquício e a unique constraint associada (a unique
-- de coluna cai junto com o DROP COLUMN, sem precisar de CASCADE).
alter table public.profiles_pii drop column if exists cpf;
