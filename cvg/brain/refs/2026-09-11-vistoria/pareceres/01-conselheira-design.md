### conselheira-design — NOTA HOJE: 73/100 (ontem: 55)

**Conceito na minha régua:** B (2,0 em 3) — exatamente na linha da aprovação. A fundação subiu de B+ pra quase A+ (a escala tipográfica que eu propus ontem virou código, com comentário citando meu parecer linha a linha); a execução no funil de entrada caiu numa nova falha de contraste que não existia ontem. Sobe pro B+ no instante em que o texto some do card selecionado deixar de acontecer.

**Veredito:** O time não só leu meu parecer de ontem — implementou a direção quase literalmente: a escala tipográfica em `tailwind.config.ts:65-77` reproduz meus números (rótulo 11px, corpo 14px, H2 16px, H1 24px), e o `max-w` da casca virou `1100px` com um comentário que cita o arquivo do meu parecer. O header que cortava o "Criar conta" em 390px sumiu, a pilha de 20 botões de horário virou uma grade por dia com chips generosos, e o Financeiro em grade (novo) é a peça de melhor design do produto hoje — print-grade, com small multiples de verdade no mobile. Mas apareceu uma falha nova, concreta e fácil de reproduzir: no cadastro de prestador e nos Anúncios, o texto que explica a opção escolhida fica **invisível** (contraste 1,44:1) por um bug de seletor CSS — não é gosto, é regressão.

> **Nota do controller:** o texto invisível foi conferido — `app/(auth)/cadastro/form.tsx:123,135` e a captura `anon__cadastro-prestador__mobile__1de3.png` ("Ofereço minha agenda e atendo clientes direto" quase apagado sobre o azul). Procede.

**Ontem → hoje**

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| 1. Header mobile com breakpoint (CTA menor, "Entrar" só ≥400px) | **FEITA** | `anon__landing__mobile__1de8.png`: só "Criar conta" no header; `RESUMO-METRICAS.md` hoje — coluna "estouro horiz." é "não" em 100% das linhas (ontem: SIM em `/`, `/termos`, `/privacidade`, `/` escuro) |
| 2. Escala tipográfica consolidada na landing | **PARCIAL** | Fundação feita: `tailwind.config.ts:58-77` — comentário cita literalmente "direção 'b' do parecer de design" e reproduz os números que propus. Adoção incompleta: landing mobile ainda com 8 tamanhos distintos (meta era ~6) |
| 3. "Horários disponíveis" como grade por dia com chips de 44px | **FEITA** | `anon__p-id__mobile__1de4.png`: cards por dia (SEX 11/09, SÁB 12/09…) com pills grandes; alvos <24px na página caíram de 20 pra 7 (e os 7 restantes são todos do rodapé/header do site, não da grade) |
| 4. Separador "·" do rodapé em `text-muted` | **FEITA** | `components/footer.tsx:42-45` — comentário: "Separador só decorativo... 1,25:1 contra --card, ilegível. text-muted chega a ~6:1 (problema ALTO do parecer de design)" |
| 5. Recalibrar `--star` pra 4,5:1 | **Achado revisto** | O `★` a 3,07:1 (`components/ui.tsx:30`) é a *trilha vazia* da nota, `aria-hidden="true"`, com a nota real exposta por `sr-only` separado. É decorativo redundante, não falha de acessibilidade real — retiro a gravidade ALTO de ontem |
| 6. Copy v2 no CTA do Administrador e na folha "Conta" | **FEITA** | `components/admin/painel-da-praca.tsx` substitui o CTA v1; `cliente__interacao-folha-conta__mobile__1de1.png` mostra "Meu perfil e avaliações / Editar perfil e foto / Falar com o suporte" — sem "Minhas diárias" |
| 7. Wrapper visual pra `file`/`date`/`time` | **PARCIAL** | Foto: `cliente__perfil-editar__mobile__1de3.png` — botão "Trocar foto" com ícone, sem input nativo visível. Date/time: `prestador_servico__agenda-escuro__mobile__2de3.png` ainda mostra `dd/mm/yyy` com ícone azul nativo do navegador dentro do cartão estilizado |
| 8. Redesenho do Hero + casca desktop | **PARCIAL** | Botão de recolher: `h-11 w-11` em `components/hero-card.tsx:145` (era 28×28). Casca: `app/(app)/layout.tsx:95` — `max-w-[1100px]` com comentário citando meu parecer de ontem. A citação genérica **não** saiu — mas por pedido explícito do Leonardo ("recoloque as frases", CLAUDE.md), não por omissão |
| Quick win: `gap-x-2` logo/nav em Termos/Privacidade | **FEITA** | `anon__termos__mobile__1de5.png` — "Termos Privacidade" com espaçamento correto, sem "Aí" colado |
| Quick win: `filter: grayscale/brightness` no Leaflet escuro | **NÃO FEITA** | `cliente__buscar-prestador-escuro__desktop` — tiles idênticos ao tema claro, sem escurecer |
| Quick win: `.card-vazio` em telas com 0-1 item | **FEITA (mínimo)** | `sysadmin__admin-denuncias`/`admin-pedidos-de-exclusao` — mensagem centrada em cartão, sem ilustração, mas sem "branco quebrado" |

**Como cheguei na nota:**
| Sub-critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Primeira impressão / credibilidade | 20% | 40 | 78 |
| Hierarquia visual, tipografia e consistência de componentes | 25% | 45 | 72 |
| Responsividade (mobile / tablet / desktop) | 20% | 55 | 80 |
| Acessibilidade (contraste, alvos de toque, foco) | 20% | 50 | 60 |
| Fundação de design system (tokens, dark mode, documentação) | 15% | 85 | 92 |

**O que está bom**
- A escala tipográfica virou código com rastreabilidade — `tailwind.config.ts:58-77` documenta o "porquê" citando a origem da decisão, exatamente a convenção que o `CLAUDE.md` pede.
- Financeiro em grade (novo, `/praca/financeiro` e `/meu-financeiro`): small multiples de verdade no mobile (cada prestador vira uma mini-grade de 12 meses), legenda de cor consistente, `tabular-nums`, degrade limpo pro dark mode (`admin__praca-financeiro-escuro__desktop__1de1.png`).
- Recibos (comissão, nota avulsa, recebimento) são print-grade: marca d'água "QUITADO", assinatura, disclaimer "não tem valor fiscal" — publicável como está (`admin__recibo-comissao-id-2026-08-praca-id__desktop__1de2.png`).
- Vitrine pública `/p/[id]`: "Próximos horários livres" agrupados por dia resolveu de fato o ALTO de ontem (pilha de 20 botões de 20px) — chips grandes, sem estado de seleção confuso (`anon__p-id__mobile__1de4.png`).
- Painel da praça e Painel da plataforma (novos) trocam o "genérico" de ontem por dashboards operacionais reais, com banner honesto de "mundo de exemplo" (`sysadmin__inicio__desktop__1de2.png`).
- Zero estouro horizontal em 100% das páginas testadas hoje — eram 5 casos "SIM" ontem, incluindo o header da landing.

**Problemas**
[ALTO] **(NOVO)** Texto invisível no card selecionado do cadastro e dos Anúncios — contraste 1,44:1. Causa raiz confirmada: `has-[:checked]:text-white` (em `components/anuncio-form.tsx:58` e `app/(auth)/cadastro/form.tsx:123`) aplica `color` via `:has()` no `<label>`, mas não cria uma classe literal `text-white` — e o filho usa `[.text-white_&]:text-white` (linhas 69 e 135), que procura exatamente essa classe literal num ancestral. Ela nunca existe, então o seletor nunca casa e o `text-muted` do span vence sempre. Reproduzido em `anon__cadastro-prestador__mobile__1de3.png` ("Ofereço minha agenda e atendo clientes direto" ilegível) e `prestador_servico__anuncios__mobile__1de2.png`. Impacto: acontece no link "Quero prestar serviço" da própria landing — a primeira tela de quem quer virar prestador.
[ALTO] Alvos de toque <24px em massa nas listas de linha: `/servicos` do prestador soma 104 alvos abaixo de 24px numa única tela (nome do cliente como botão, "Abrir →", chips de sinalização — todos ~22-24px de altura, repetidos por card). Evidência: `manifest.json`, registro `prestador_servico`/`/servicos`/mobile.
[MÉDIO] Abas e carrosséis horizontais sem indício visual de rolagem: a aba "Prestadores" da praça é cortada sem fade/sombra em mobile e tablet (`admin__praca-servicos__mobile__1de17.png`), e o carrossel "Anúncios perto de você" corta o segundo card no meio do nome (`cliente__buscar-prestador__mobile__1de2.png`).
[MÉDIO] Escala tipográfica adotada só parcialmente: a fundação existe, mas a landing ainda soma 8 tamanhos distintos por página (meta ~6) — `RESUMO-METRICAS.md` linha `anon | / | mobile`.
[MÉDIO] Date/time seguem nativos dentro de cartões estilizados: ícone azul de calendário do navegador ao lado de chips e inputs custom (`prestador_servico__agenda-escuro__mobile__2de3.png`).
[BAIXO] Tiles do Leaflet continuam sem escurecer no tema escuro — quick win de ontem não aplicado (`cliente__buscar-prestador-escuro__desktop`).
[BAIXO] **(NOVO)** "Necessita-se ajudante!" no formulário de anúncios mantém registro/pontuação de v1 (exclamação, "vaga") dentro de uma tela com o resto da copy em tom v2 — quebra pequena, plausivelmente justificada por ser um caso de uso genuinamente diferente (WhatsApp sem conta).
[BAIXO] "Compartilhar no WhatsApp" com texto a 4,12:1, abaixo do mínimo AA de 4,5:1 pra texto normal (`prestador_servico`/`@perfil`, manifest).
[BAIXO] Número do recibo de comissão quebra em 2 linhas com hífen no meio ("P-\n000029") em mobile — cosmético.

**Possibilidades de melhoria**
1. Corrigir o seletor de contraste do card selecionado (cadastro + anúncios) — trocar a dupla `has-[:checked]:text-white` / `[.text-white_&]:text-white` por algo que realmente resolva (ex.: `has-[:checked]:[&>span:last-child]:text-white` no label, sem depender de classe literal) · P (2 arquivos, 4 linhas) · impacto alto — desbloqueia o funil de aquisição do prestador.
2. Elevar os alvos de toque das linhas de lista (nome do cliente, "Abrir →", chips de sinalização) pra `min-h-11` em vez de herdar a altura do texto · M · maior volume de violações do produto hoje (104 numa tela só).
3. Afordance de rolagem horizontal (fade nas bordas ou seta) nas abas da praça/financeiro e no carrossel de anúncios · M · resolve o "Prestadores" invisível sem o usuário saber que dá pra arrastar.
4. Terminar a adoção da escala tipográfica nas páginas que ainda usam `text-[Npx]` arbitrário — a fundação já existe, falta consumo · M · consolida o trabalho já pago.
5. Wrapper visual pra date/time (ícone e borda do design system, escondendo o nativo do navegador) · M · fecha o findable de ontem.

**Quick wins**
1. Corrigir a classe do texto invisível nos 2 arquivos (`anuncio-form.tsx`, `cadastro/form.tsx`) — a causa já está isolada, é troca de seletor.
2. `filter: grayscale(.3) brightness(.8)` nos tiles do Leaflet no tema escuro (pendente desde ontem).
3. Escurecer um tom o verde do botão "Compartilhar no WhatsApp" pra sair de 4,12:1 e passar de 4,5:1.
4. `white-space: nowrap` ou abreviar o prefixo do número do recibo de comissão pra não quebrar com hífen no meio.
5. Revisar a copy "Necessita-se ajudante!" pro registro v2 (sem exclamação, linguagem alinhada ao resto do formulário de anúncios).

**Se eu só pudesse mudar uma coisa agora:** o bug de contraste no card selecionado do cadastro e dos anúncios — é o único item desta rodada que é regressão de acessibilidade real (não escolha de design), mora exatamente no link "Quero prestar serviço" da landing, e o conserto é de poucas linhas.
