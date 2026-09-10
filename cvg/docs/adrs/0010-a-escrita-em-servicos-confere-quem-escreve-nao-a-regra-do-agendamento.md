---
adr: "0010"
status: accepted
date: 2026-09-10
ground: brownfield
converge_pass: 2
spec_ref: "R-37, R-38, R-39, R-40, R-53"
supersedes: ""
superseded_by: ""
deciders: "Claude Opus 5 (controller) — fatos conferidos no banco vivo em 10/09/2026"
---

# 0010 — A escrita em `servicos` confere quem escreve, não a regra do agendamento

## Context

A Fatia 1 exige que um serviço só nasça do fluxo de reserva (R-37), que o estado só
mude pela regra do papel (R-38), que o contador público de realizados só se mova pelo
fluxo (R-39) e que o contato da outra parte só se abra com serviço válido (R-40). O
planejador precisa saber onde essas regras moram hoje: no banco, valendo para qualquer
chamada, ou só no código da aplicação, valendo só para quem passa pelas telas.

## Decision

As regras do agendamento moram **só no código da aplicação**
(`lib/actions/agenda-v2.ts`). No banco, as políticas de escrita de `servicos` conferem
apenas a identidade de quem escreve:

- **inserir** — `with check (cliente_id = auth.uid())`: nenhuma condição sobre estado
  inicial, horário, prestador ou preço;
- **atualizar** — `using` e `with check` `(cliente_id = auth.uid() or prestador_id =
  auth.uid())`: qualquer uma das partes muda qualquer coluna para qualquer valor,
  inclusive `status`;
- o **único gatilho** da tabela é `servicos_atualiza_realizados` (`AFTER INSERT OR
  UPDATE OF status`), que recalcula o contador público a partir do que foi escrito —
  ele obedece a qualquer serviço inserido, forjado ou não;
- `tem_servico_com(outro)` (migration 0027) devolve verdadeiro para qualquer linha de
  `servicos` entre as duas pessoas, **em qualquer status**. É essa função que abre
  `profiles_pii` e `profile_local` para a outra parte.

Como o navegador fala direto com o banco usando a chave pública, qualquer usuário
autenticado alcança essas políticas sem passar pela aplicação.

## Rejected reading

*"A action valida que o horário está livre e o marca pendente, então um serviço forjado
não passa"* — é o que diz o comentário da própria migration 0024, linha 66. Morre no
mesmo ponto: a validação é da action, e a action é opcional para quem fala direto com o
banco. A política viva não tem condição nenhuma além de `cliente_id = auth.uid()`.

## Evidence

```sql
-- políticas vivas (SQL editor do Supabase ou Management API, somente leitura)
select tablename, policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename in ('servicos', 'profiles_pii', 'profile_local');

-- gatilhos de servicos
select t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal and c.relname = 'servicos';
```

```sh
grep -n "servicos_insert_cliente\|servicos_update_parties" -A3 supabase/migrations/0024_agenda_v2_slots_servicos.sql
grep -n "tem_servico_com" -A8 supabase/migrations/0027_prestador_ve_pii_cliente_vinculado.sql
```

Observado no banco vivo em 10/09/2026:

- `servicos_insert_cliente` — with_check `(cliente_id = auth.uid())`
- `servicos_update_parties` — qual e with_check `((cliente_id = auth.uid()) OR (prestador_id = auth.uid()))`
- único gatilho: `servicos_atualiza_realizados AFTER INSERT OR UPDATE OF status`
- `pii_select_self_or_admin` e `profile_local_select_own_or_sysadmin_or_parte` terminam em `OR tem_servico_com(user_id)`
- a base tem 30 serviços: 25 realizados, 3 cancelados, 1 confirmado, 1 pendente

## Consequences

- Uma regra da Fatia 1 que só exista em `lib/actions/` não satisfaz R-37 a R-40: o
  critério do spec é a tentativa feita **fora da aplicação**.
- O contador público (R-39) herda tudo o que a política de escrita deixar passar; ele
  não é uma proteção.
- `tem_servico_com` é o ponto único que decide contato e ponto exato entre as partes;
  mudar o critério dele muda as duas tabelas ao mesmo tempo.

Re-verify when: uma migration nova alterar as políticas de `servicos`, os gatilhos da
tabela ou `tem_servico_com`.
