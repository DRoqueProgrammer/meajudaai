# ADR 0011 — Dark mode por CSS variables com papéis separados

- **Status:** Aceito
- **Data:** 2026-08-26
- **Contexto do parecer:** Design (implementar dark mode; "os tokens já estão prontos")
- **Implementação:** `app/globals.css`, `tailwind.config.ts` + ~40 telas

## Contexto

O parecer pediu dark mode e sugeriu que bastaria "adicionar a media query", já que
os tokens de cor pareciam prontos. Não bastava: os tokens do Tailwind eram hex
fixos, e cores como `text-brand` (azul escuro, 56 usos) e `text-danger` (20 usos)
somem sobre um fundo escuro. Um dark mode pela metade — chrome escuro, texto e
badges ainda claros — é pior que nenhum.

## Decisão

Tema por **CSS variables**: `globals.css` define cada cor que muda entre claro e
escuro; o `tailwind.config` aponta os tokens semânticos para essas variáveis.
Virar o tema é uma `@media (prefers-color-scheme: dark)` que troca as variáveis —
sem `dark:` em centenas de classes.

O que exigiu cuidado foi **separar papéis** onde um mesmo token servia a dois
usos com exigências opostas de contraste:

- **TINTA sobre superfície** (`text-brand`, `text-danger`, verde de sucesso `ok`,
  a estrela, os fundos de status) **vira** no escuro — azul/vermelho/verde
  escuros ficam claros para continuar legíveis.
- **PREENCHIMENTO com texto branco** (`brand-fill` no botão da marca, badge
  vermelho `danger-fill`, verde `action-dark`) fica **fixo** nos dois temas —
  clarear quebraria o contraste do texto branco por cima.

Só o lado menor (os preenchimentos) foi renomeado; os ~100 usos de tinta seguem
apontando para a variável que vira, sem edição de call site. Os pastéis de status
viraram 5 tokens de tint (`info/ok/warn/neutral/danger`), cada um com fundo e
tinta que viram juntos. Marcas de dado (barras de gráfico, ponto de não-lida)
usam a tinta que vira, não o preenchimento fixo, para não sumirem no escuro.

## Alternativas consideradas

- **Só a media query (sugestão do parecer):** deixaria texto e badges ilegíveis
  no escuro. Rejeitada por inspeção de contraste.
- **Variante `dark:` do Tailwind em cada classe:** ~180 edições e ruído
  permanente no JSX; a troca de variável centraliza o tema num arquivo.
- **Inverter o tema inteiro (filtro/CSS invert):** destrói a identidade da marca
  e as fotos.

## Consequências

- **+** Tema num lugar só (`globals.css`); adicionar um "toggle manual" no futuro
  é só sobrescrever as variáveis num `[data-theme]`.
- **+** Claro fica **idêntico** ao anterior (mesmos hex no ramo claro).
- **+** Contraste verificado nos dois temas (screenshots de QA).
- **−** A distinção tinta/preenchimento é uma convenção que a equipe precisa
  manter: cor com texto branco por cima usa `*-fill`; cor como texto/marca usa o
  token que vira.
- **−** O mapa (tiles do OpenStreetMap) continua claro no tema escuro — aceitável;
  trocar por tiles escuros fica para depois.
