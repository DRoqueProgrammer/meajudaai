# ADR 0003 — RLS com funções `SECURITY DEFINER`

- **Status:** Aceito
- **Data:** 2026-08-26 (formaliza decisão tomada no início do protótipo)
- **Contexto do parecer:** Eng. de Software (`0004_rls_helpers_policies.sql` exemplar)

## Contexto

Num modelo multi-tenant, a policy de uma tabela precisa consultar outra (ex.:
"posso ver esta vaga?" depende de eu ser membro do workspace dela). Se a policy
de `vagas` consulta `workspace_members`, e a policy de `workspace_members`
consulta de volta, o Postgres entra em **recursão de RLS** e falha.

## Decisão

Isolar as checagens de pertencimento/capacidade em funções `SECURITY DEFINER`
(`is_workspace_member`, `is_conversa_membro`, `is_ajudante_aceito`,
`has_capability`, `current_app_role`), que rodam com o dono e por isso **não
reaplicam** a RLS ao consultar as tabelas de apoio. As policies chamam essas
funções em vez de fazer subselects que recursam.

## Alternativas consideradas

- **Subselects diretos nas policies:** recursão e/ou duplicação da mesma lógica
  em dezenas de policies, impossível de manter coerente.
- **Desligar RLS e checar tudo na aplicação:** joga fora a fronteira de segurança
  do banco — o oposto do que o projeto quer (ver ADR 0001).

## Consequências

- **+** Policies legíveis e sem recursão; a lógica de acesso vive num lugar só.
- **+** Testável de ponta a ponta (`tests/rls.test.ts`).
- **−** `SECURITY DEFINER` exige disciplina: cada função fixa `search_path` e tem
  `execute` revogado de `anon`/`authenticated` quando não deve ser chamada direto.
- **−** Uma mudança numa helper afeta todas as policies que a usam — cobrir com
  teste de integração é obrigatório.
