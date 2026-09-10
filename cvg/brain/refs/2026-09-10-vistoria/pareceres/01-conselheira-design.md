### conselheira-design — NOTA: 55/100
**Conceito:** C (1,0 em 3) — abaixo da aprovação (2,0). A fundação de tokens e documentação seria B+; a execução visual (tipografia ad hoc, resíduo de v1 no CTA mais visível, contraste reprovado, header quebrado no viewport mais comum) arrasta a média. Não é D porque existe rigor técnico real por trás — só não chegou à superfície.

**Veredito:** Tem um design system de verdade por baixo (CSS variables semânticas, dark mode arquitetural, `min-h-11` na base de botão/input, foco visível, `prefers-reduced-motion`) — raro num protótipo. Mas a execução nas telas que o usuário vê primeiro está rasa: header cortado em 390px, 14 tamanhos de fonte na landing, resíduo de copy da v1 no maior bloco de cor da Home, e a ação central do produto (escolher um horário) é uma pilha de 20 botões de 20px de altura. O Leonardo está certo: o design está feio — e dá pra apontar exatamente onde.

**Como cheguei na nota:**
| Sub-critério | Peso | Nota |
|---|---|---|
| Primeira impressão / credibilidade | 20% | 40 |
| Hierarquia visual, tipografia e consistência de componentes | 25% | 45 |
| Responsividade (mobile / tablet / desktop) | 20% | 55 |
| Acessibilidade (contraste, alvos de toque, foco) | 20% | 50 |
| Fundação de design system (tokens, dark mode, documentação) | 15% | 85 |

**O que está bom**
- Tokens semânticos bem separados e documentados (`app/globals.css:1-82`, `tailwind.config.ts:11-46`); contraste calculado e comentado (`app/(app)/inicio/page.tsx:26-31`).
- Acessibilidade motora deliberada: `.btn`/`.input`/`.chip` com `min-h-11` (44px) pensando em "dedo sujo no sol da obra" (`globals.css:116-118`), skip-link, `focus-visible`, `prefers-reduced-motion`.
- "Minha agenda" do Prestador (calendário mensal + timeline do dia por status) é a melhor peça do produto hoje.
- Painel do Prestador em desktop (cards de métrica + gráfico com base zero, `tabular-nums`) mostra que o time sabe fazer dashboard limpo.
- Onboarding por papel (3 cards) é uma boa bifurcação.

**Problemas**
[CRÍTICO] Header da landing estoura em 390px — "Criar conta" cortado (`app/page.tsx:47-60`, sem breakpoint; manifest: `"Entrar Criar conta" [left 214, right 392]`). Mesmo padrão em `/termos` e `/privacidade` (405px).
[CRÍTICO] Resíduo de copy da v1 no CTA de maior peso da Home: "PRECISO DE AJUDANTE — Publique a diária em um minuto" no `/inicio` do Administrador (`inicio/page.tsx:299-304`) e "Minhas diárias" na folha "Conta" do Cliente.
[ALTO] "Horários disponíveis" no perfil público do prestador — a ação central do produto — é uma pilha de 20 botões idênticos de 324×20px (20 de 25 alvos abaixo de 24px), sem agrupar por dia, sem estado de seleção, `h1` vazio.
[ALTO] Contraste reprovado em elementos recorrentes: separador "·" do rodapé a 1,25:1 (`components/footer.tsx:41`); estrelas de avaliação a 3,0–3,25:1, 30 ocorrências numa tela.
[ALTO] Tipografia sem escala: 14 tamanhos na landing (11–38px, quase todos `text-[Npx]`); 9–10px no calendário do prestador.
[MÉDIO] Casca logada fixa `max-w-3xl` (`app/(app)/layout.tsx:64`): 230–430px de vazio em 1440px.
[MÉDIO] Formulários misturam `<input type="file">` nativo sem estilo e date/time nativos com componentes customizados.
[MÉDIO] Hero mistura saudação + citação genérica + relógio + clima num bloco azul com X de 28×28px; o bloco amarelo "PRECISO DE..." usa o amarelo como fundo de área grande.
[BAIXO] Tiles do Leaflet não escurecem no tema escuro. [BAIXO] Header de `/termos` e `/privacidade` cola "Aí" em "Termos". [BAIXO] Telas com 0–1 item sem `.card-vazio`.

**Contribuições de melhoria**
1. Header mobile com breakpoint (CTA menor, "Entrar" só ≥400px) · P.
2. Escala tipográfica consolidada na landing · M.
3. "Horários disponíveis" como grade por dia com chips de 44px · M.
4. Separador do rodapé em `text-muted` ou removido · P.
5. Recalibrar `--star` para 4,5:1 · P.
6. Copy v2 no CTA do Administrador e na folha "Conta" · P.
7. Wrapper visual para `file`/`date`/`time` · M.
8. Redesenho do Hero + casca desktop · G.

**Quick wins**
1. `gap-x-2` entre logo e nav em `/termos`/`/privacidade`.
2. Botão de fechar do Hero 28×28 → 44×44 (`h-11 w-11`).
3. Separador "·" do rodapé com `text-muted`.
4. `filter: grayscale(.3) brightness(.8)` nos tiles do Leaflet no tema escuro.
5. `.card-vazio` nas telas com 0–1 item.

**Se eu só pudesse mudar uma coisa:** o header cortado da landing em 390px — é o primeiro pixel que qualquer pessoa nova vê, no aparelho que ela realmente usa.

## Nota visual por tela
| Tela | Mobile | Desktop | Problema principal |
|---|---|---|---|
| Landing (/) | 45 | 70 | Header corta o CTA em 390px; copy de v1 |
| Login | 80 | 82 | Tela mais limpa do produto |
| Cadastro / cadastro-prestador | 68 | 70 | Subtexto do card selecionado com baixo contraste |
| Termos / Privacidade | 55 | 68 | Overflow (405px); header colado |
| Início — Hero (Cliente) | 48 | 60 | Bloco amarelo gigante + citação genérica |
| Início (Prestador) | 55 | 78 | Mobile repete o Hero; desktop com gráfico é bom |
| Início (Administrador) | 42 | 62 | CTA com copy de v1 |
| Buscar prestador | 62 | 55 | Desktop com mapa pequeno e muito vazio |
| Perfil público do prestador | 40 | 45 | Lista de horários sem affordance; estrelas de baixo contraste |
| Minha agenda (Cliente) | 78 | 80 | Uma das telas mais bem resolvidas |
| Minha agenda (Prestador) | 72 | 74 | Mistura input nativo com botão custom |
| Meus serviços (Cliente) | 65 | 66 | Campo de busca cortado |
| Editar perfil | 58 | 60 | Input de arquivo nativo sem estilo |
| Clientes (Prestador) | 45 | 40 | Vazio sem estado ilustrado |
| Mapa (Prestador) | 68 | 66 | Vazio abaixo do mapa no desktop |
| Início (SysAdmin) | 60 | 64 | Genérico (falta dashboard) |
| Serviços da plataforma (SysAdmin) | 50 | 52 | 30 campos sem label |
| Usuários (SysAdmin) | 63 | 65 | Selects sem rótulo |
| Tema escuro (geral) | 72 | 74 | Mapa não escurece |
| Folha "Conta" (mobile) | 58 | — | "Minhas diárias" residual |

## Direção de design proposta
(a) Princípios: uma tela, um vocabulário; cor com papel fixo (azul estrutura, verde ação do prestador, amarelo só acento); hierarquia só pela escala; 44px padrão de toque; local, não genérico (nada de citação que caberia em qualquer app).
(b) Escala: Display só no H1 da landing (`clamp(38px,4.6vw,60px)`, 800) · H1 de página 24px/700/1,25 (`text-2xl font-bold`) · H2/título de card 16px/600/1,375 · corpo 14px/400/1,6 · meta 12px/500/1,4 · rótulo 11px/600 uppercase tracking (único < 12px permitido). Calendário sobe de 9–10px para 11px uppercase.
(c) Espaçamento 4/8/12/16/24/32/48; raio 8 (controles pequenos) / 12 (botões e inputs) / 16 (cards).
(d) Azul: estrutura, header, nav ativo, CTA do cliente, links. Verde: ação positiva do prestador. Amarelo: só acento (sublinhado, badge, estrela recalibrada) — nunca fundo de bloco > 20% da tela; o CTA grande vira fundo `--surface`/`--tint-info` com ícone amarelo.
(e) Casca desktop: sidebar 240px | conteúdo | coluna de contexto opcional 320–360px. Lista+detalhe em 2 colunas (360px | 1fr); formulário em 1 coluna até 720px; sem 3ª coluna, conteúdo até 900–1000px. Decisão por página, não `max-w-3xl` fixo.
(f) Hero: faixa de saudação simples (~40px, relógio pequeno à direita) + card de clima colapsável; sai a citação; altura máxima 96–120px no mobile; CTA principal primeiro, no tratamento do `AcaoCard`.
(g) Landing mobile: header com CTA compacto (`px-4 py-2 text-sm`), "Entrar" só ≥400px; headline `text-3xl` fixo; CTAs empilhados `w-full` 48px; subtítulo com a linguagem v2 do próprio app.
(h) Padronizar primeiro: `<SlotPicker>` único (chips de 44px por dia); wrapper para `file`/`date`/`time`; `CtaGrande` com o novo tratamento de cor em todos os papéis.
