### marketing-specialist — NOTA HOJE: 70/100 (ontem: 38)
**Conceito na sua régua (0–10, executivo):** B- (7,0) sobre a execução. **Potencial comercial da ideia: 7/10** (subiu de 6 — a comissão, que ontem era "bloqueada por decisão de produto", hoje é um motor de receita funcionando de ponta a ponta: alíquota em níveis, QR, confirmação do Administrador).
**Veredito:** Os dois CRÍTICOS de ontem — zero SEO/compartilhamento e nenhuma vitrine pública indexável — foram resolvidos de ponta a ponta, não em paliativo. A landing fala a língua certa (v2, agendamento direto) e o "Necessita-se ajudante!" e a vitrine viraram peças reais de funil, não só promessa. O que falta agora não é mais estrutura: é **transparência de preço** — a comissão da plataforma, que existe e funciona, é invisível para o prestador até ele já estar devendo dinheiro — e uma **história de praça** (Niterói) que ainda não chegou à superfície pública.

**Ontem → hoje**

| Recomendação/achado de ontem | Status | Evidência |
|---|---|---|
| [CRÍTICO] Zero SEO/compartilhamento (`robots.ts`, `sitemap.ts`, OG/Twitter) | **Feita** | `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx`, `app/layout.tsx:30-53` (Open Graph + Twitter Card completos) |
| [CRÍTICO] Nenhuma página pública indexável de prestador | **Feita** | `app/p/[id]/page.tsx` — sem exigir sessão, com `generateMetadata` própria (título/descrição/foto do prestador), listada em `app/sitemap.ts:30-35`, e **fora** do disallow de `app/robots.ts` |
| [ALTO] Copy contraditória no mapa do cadastro (Opcional vs Obrigatório) | **Feita** | `components/maps/address-map-picker.tsx` não tem mais "Opcional"; `app/(auth)/cadastro/form.tsx:271` só tem "Obrigatório: é o que permite ordenar buscas por proximidade." |
| [ALTO] Conta de desenvolvedor aparecendo na busca real | **Feita** | `cliente__buscar-prestador__mobile__1de2.png` mostra só contas reais (João Ferreira, Roberto Almeida); nenhuma ocorrência de "(dev)" no código ou nas telas |
| [MÉDIO] Fluxo do Administrador fala v1 ("PRECISO DE AJUDANTE", "diária", `/publicar`, `/minhas-vagas`) | **Feita** | `app/(app)/inicio/page.tsx:597` — Administrador agora recebe `null` nesse bloco; o que restou de `/publicar`/`/minhas-vagas` (linhas 578-596) é escopado só a Funcionário com o módulo "vagas", sem a palavra "diária", e é a mecânica v2 legítima do "Necessita-se ajudante" (D-034) |
| [MÉDIO] "Como funciona" e subheadline vendem o modelo errado | **Feita** | `app/page.tsx:20-24,95-98` — texto quase idêntico ao que propus ontem ("Busque por perto" / "Marque um horário" / "Combine e avalie") |
| [MÉDIO] Nenhum sinal de praça/cidade nem de preço/comissão na superfície pública | **Parcial** | Cidade aparece em `/p/[id]` ("Niterói, RJ") e nos cards do mural/vitrine; a landing (`app/page.tsx`) continua sem citar "Niterói" ou preço/comissão em nenhum texto |
| [BAIXO] Banner de cookies ocupa ~1/4 da dobra no mobile | **Parcial** | `anon__landing-primeira-visita__mobile__1de8.png` — banner não cobre mais os CTAs principais, mas ainda ocupa um bloco considerável no rodapé da tela |
| [BAIXO] Rodapé expõe "v0.0.2" | **Não feita** | `package.json` (`version: "0.0.2"`) e `components/footer.tsx:87-89` sem mudança |
| Quick win: reescrever subheadline/CTA final | **Feita** | `app/page.tsx:95-98,214-217` |
| Quick win: tirar conta dev da busca | **Feita** | ver acima |
| Quick win: corrigir frase do mapa | **Feita** | ver acima |
| Quick win: tirar versão do rodapé | **Não feita** | ver acima |
| Quick win: OG básico com o ícone | **Feita** | `app/opengraph-image.tsx` — cartão de marca com cores oficiais, mais completo do que um ícone solto |

**Como cheguei na nota:**
- Posicionamento e proposta de valor da landing (20%): 55 → **80**
- Copy e voz consistentes no app (15%): 42 → **78**
- Onboarding — fricção e confiança (20%): 50 → **62**
- SEO, compartilhamento e descoberta local (25%): 8 → **85**
- GTM por praça e mensagem de preço/comissão (20%): 30 → **45**

**O que está bom**
- SEO saiu de zero absoluto para uma base sólida: `robots.ts` bloqueia exatamente as rotas autenticadas certas, `sitemap.ts` lista o que tem valor de busca, e cada `/p/[id]` gera seu próprio título/descrição/imagem OG (com a foto real do prestador, não o card genérico) — colar o link no grupo do bairro agora funciona.
- A vitrine pública (`/p/[id]`) é exatamente o que faltava ontem: nota, "Perfil verificado", garantia de 90 dias, disponibilidade e horários livres em tempo real, tudo visível **sem login** — só pede conta na hora de agendar (`anon__p-id__mobile__1de4.png`, `2de4.png`).
- A landing deixou de ser uma promessa e passou a ser um funil com produto de verdade dentro: o mural "Necessita-se ajudante!" e "Prestadores em destaque" mostram anúncios reais (marcados "Exemplo" com honestidade), com link direto pro perfil público de quem publicou.
- A comissão da plataforma — que ontem eu citei como parte do potencial comercial mas ainda travada por decisão de produto — está construída e funcionando (alíquota em níveis, QR com valor, "Enviei o Pix" → confirmação do Administrador). Isso é o motor de receita do negócio ganhando pernas.
- A contradição do cadastro e a conta de desenvolvedor na busca real — os dois achados ALTO de ontem — desapareceram, não foram só escondidos.
- O Administrador não fala mais a língua da v1 ("diária", "PRECISO DE AJUDANTE"); o que sobrou de vocabulário de "vaga" ficou isolado no Funcionário, como mecânica v2 legítima.

**Problemas**
[ALTO] (NOVO) A comissão da plataforma é invisível para o prestador até ele já estar operando e devendo dinheiro. Nenhuma menção a comissão/taxa/percentual em `app/page.tsx` nem no formulário de cadastro (`app/(auth)/cadastro/form.tsx`); ela só aparece autenticado, em `/comissao` (`prestador_servico__comissao__mobile__1de6.png`), quando já existe um valor "em aberto". Impacto: é o tipo de surpresa que gera post de reclamação no grupo de WhatsApp do bairro — "disseram que era grátis e depois cobraram" — exatamente o canal que a praça de Niterói vai depender pra crescer.
[MÉDIO] A landing não amarra o produto a nenhuma praça. `app/page.tsx` não cita "Niterói" em headline, subheadline, "Como funciona" ou CTA final — o modelo de negócio é location-first (uma instalação por cidade, D-001), mas a superfície pública ainda se apresenta como nacional/genérica. A cidade só aparece dentro do app autenticado (Hero) ou no perfil individual do prestador.
[MÉDIO] Toda prova social hoje é rotulada "Exemplo" — zero depoimento, avaliação ou métrica real (correto e honesto para um protótipo, mas significa que não existe nenhum ativo de confiança pronto pro dia em que abrir de verdade em Niterói).
[BAIXO] Sitemap só lista prestadores com anúncio ativo (`anuncios_publicos`, `app/sitemap.ts:21-22`) — um prestador com página pública mas sem anúncio publicado fica fora do sitemap, mesmo a página sendo indexável e ter valor de busca.
[BAIXO] Rodapé e `package.json` continuam em v0.0.2, sem mudança desde ontem — item cosmético, baixo custo, baixa prioridade.

**Possibilidades de melhoria**
1. Mostrar a existência (e, se possível, a faixa) da comissão da praça já no cadastro do prestador, antes de criar a conta — mesmo que seja "a praça pode cobrar uma comissão sobre o serviço realizado; veja os detalhes depois de entrar". Como: uma linha no formulário de `app/(auth)/cadastro/form.tsx` quando `papel=prestador_servico`, lendo a alíquota vigente da praça padrão. Esforço: P. Impacto: alto — é o maior risco de reputação identificado hoje.
2. Amarrar a landing à praça: badge no hero ("Já disponível em Niterói e São Gonçalo") e ajustar "Como funciona"/CTA final pra citar a cidade quando só existe uma praça ativa. Como: `app/page.tsx`, lendo a(s) praça(s) existente(s) via a mesma RPC pública já usada pelo mural. Esforço: P–M. Impacto: médio-alto — GTM local depende de a landing parecer "feita pra aqui", não genérica.
3. Construir um ativo mínimo de prova social real antes do lançamento em Niterói: os primeiros 5-10 prestadores reais com pelo menos 1 avaliação genuína, e uma seção "Primeiros profissionais de Niterói" substituindo (ou complementando) os cards "Exemplo". Esforço: G (depende de aquisição real, não é só código). Impacto: alto.
4. Ampliar o sitemap para incluir todo prestador com página pública ativa (perfil publicado, conta não removida), não só quem tem anúncio no ar. Como: trocar a fonte de `anuncios_publicos` por uma RPC/consulta de perfis públicos elegíveis. Esforço: P. Impacto: baixo-médio.
5. Página ou seção pública de preços/comissão ("quanto custa participar") — mesmo modelo que outros produtos do Leonardo já têm (`/precos` no `refs/foco-contabil`). Esforço: M. Impacto: médio-alto — sustenta a confiança que o item 1 começa a resolver.

**Quick wins**
- Adicionar uma frase sobre comissão no formulário de cadastro do prestador (item 1, versão mínima).
- Bump da versão em `package.json` (ou remover o número do rodapé público, se não quiser versionar visivelmente).
- Incluir "Niterói" em pelo menos uma linha da landing (ex.: sob o H1 ou no CTA final).
- Ajustar a query do `sitemap.ts` para não depender só de anúncio ativo.
- Confirmar que o footer "Feito por" e o aviso "Exemplo" nos cards do mural continuam claros quando a praça tiver prestadores reais misturados com contas de demonstração (checagem de copy, não de código).

**Se eu só pudesse mudar uma coisa agora:** revelar a comissão da plataforma para o prestador antes ou durante o cadastro — é a mudança de menor custo que evita o maior risco de reputação que este relatório encontrou, e a única, das novas, que pode custar a confiança de quem a plataforma mais precisa atrair primeiro.
