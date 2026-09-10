---
leg: swimlane-dados-leg-01
tech: seed
swimlane: swimlane-dados
parent: _lane.md
status: proposed
spec_ref: ["R-26", "R-27"]
depends_on: ["swimlane-praca-leg-01", "swimlane-comissao-leg-03"]
type: leg
---

# swimlane-dados-leg-01-seed - base densa e plausivel ate dezembro de 2026

> Parte da raia **dados** ([_lane.md](_lane.md)).
> Altitude de plano: responsabilidade + criterios de aceite. O eval runnable nasce no Pass 5.

## Responsibility

Repovoar a base de demonstracao com historico denso e plausivel - corrigindo o defeito que o ADR 0007 mediu, que e densidade e alcance ate o fim do ano, e nao falta de amplitude.

## Proves (acceptance criteria — Given/When/Then; 1-3; NO evals)

- Dado o dataset gerado, quando medido, entao o servico mais antigo esta a pelo menos 24 meses do mais recente, o historico alcanca dezembro de 2026, e nenhum servico futuro passa de 6 meses a frente.
- Dado o dataset gerado, quando inspecionado, entao nenhum servico cai fora do horario declarado do prestador, pelo menos 30% dos clientes tem mais de 1 servico, e nenhum valor cai fora da faixa da categoria.
- Dada qualquer tela de calendario, quando aberta num mes qualquer do periodo, entao ela mostra atividade - nao um mes vazio.

## Independence

Depende do schema final das raias que criam tabela. Prova-se por medicao sobre a propria base gerada.

## Consumes / produces

- Consumes: o schema de todas as raias; as faixas de valor por categoria.
- Produces: a base demonstravel.

## Appetite

medium - o semeador ja existe e precisa de densidade, praca e comissao.

## Yields at Pass 5B (named units, not specified here)

- O semeador estendido para praca e comissao.
- A densidade por prestador e por mes.
- O alcance ate dezembro de 2026 com teto de 6 meses a frente.
- A verificacao de plausibilidade sobre o resultado.

## Re-verify when

Qualquer raia adicionar campo obrigatorio (ver Seam evolution).
