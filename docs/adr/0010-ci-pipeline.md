# ADR 0010 — CI: typecheck + lint + testes em cada push/PR

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Eng. de Software (testes bons, mas sem CI que os rode)
- **Implementação:** `.github/workflows/ci.yml`

## Contexto

O único workflow existente (`deploy-docs.yml`) só publicava a documentação. Os
testes (unitários e de RLS) existiam e eram bons, mas nada garantia que
`typecheck`, `lint` e `test` passassem antes do merge — dependiam da disciplina
do dev.

## Decisão

Um workflow `CI` que roda em cada push na `main` e em cada PR contra a `main`:
`npm ci` → `typecheck` → `lint` → `test` (suíte unitária), em Node 20, com
cancelamento de execuções antigas do mesmo ref.

A suíte de **integração** (`test:integration`) fica **fora** do CI de propósito:
ela cria usuários reais no Supabase e precisa de `service_role` — não é para
rodar em cada PR. Roda sob demanda, localmente ou num job protegido.

## Alternativas consideradas

- **Sem CI (status quo):** frágil; o parecer cobrou exatamente isto.
- **Incluir a integração no CI de PR:** exigiria expor `service_role` como secret
  e criaria dados reais a cada PR — risco e custo desnecessários.
- **Pre-commit hooks só:** ajudam localmente, mas são puláveis e não valem para
  contribuidores externos; CI é a rede de verdade.

## Consequências

- **+** `main` protegida por typecheck/lint/test verdes; regressões param no PR.
- **+** Base para exigir o check como obrigatório na branch protection.
- **−** A cobertura de integração continua dependente de execução manual (o
  ADR 0011, se vier, poderia automatizá-la num job com secret protegido).
- **−** ~1–2 min por push; mitigado pelo cache de `npm` e pelo cancelamento.
