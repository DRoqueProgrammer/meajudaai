# ADR 0006 — `nota_media` ponderada por recência (EWMA)

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Finanças (média simples é ingênua para o core do negócio)
- **Implementação:** `supabase/migrations/0020_ewma_nota_media.sql`

## Contexto

A `nota_media` era média aritmética simples (migration `0003`): uma avaliação de
seis meses atrás pesava igual a uma de ontem. Como a nota é a **moeda de
confiança** do marketplace, isso premia inércia — um ajudante que era bom e
piorou mantém nota alta — e pune quem melhorou recentemente.

## Decisão

Média móvel ponderada exponencialmente (EWMA) com **meia-vida de 90 dias**: o
peso de cada avaliação decai pela metade a cada 90 dias. A referência do
decaimento é a avaliação **mais recente do avaliado**, não o relógio de agora —
assim o valor é **determinístico** e só muda quando entra/sai uma avaliação
(exatamente quando o trigger dispara), sem "envelhecer" sozinho e ficar
dessincronizado do banco. `total_avaliacoes` continua sendo a contagem crua.

## Alternativas consideradas

- **Manter média simples:** ingênua, mas zero custo. Rejeitada por atacar o ativo
  central do produto.
- **EWMA ancorada em `now()`:** a nota mudaria a cada leitura sem novo dado —
  quebra o modelo de "trigger recalcula e grava".
- **Janela fixa (só últimos N/últimos 90 dias):** descarta histórico de forma
  abrupta; o decaimento suave é mais justo.

## Consequências

- **+** A nota reflete a qualidade recente sem descartar o histórico.
- **+** Determinística: recomputada só na escrita, coerente com o `profiles`.
- **−** Menos intuitiva de explicar ao usuário que uma média simples.
- **−** O recálculo varre todas as avaliações do avaliado a cada evento (ok no
  volume do protótipo; indexado por `avaliado_id`).
