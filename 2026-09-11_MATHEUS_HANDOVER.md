# Handover para o Matheus — 11/09/2026

Este documento passa o projeto adiante no ponto em que ele está hoje: o que o app é, a **segunda
avaliação do conselho de nove agentes** (notas, achados, recomendações de cada um), o que o
controller conferiu no código, a recomendação geral e um **backlog único e priorizado** montado a
partir dos nove pareceres. No fim, como rodar, como trabalhar aqui e onde está cada coisa.

Leia nesta ordem: **este arquivo** → [ROADMAP.md](./ROADMAP.md) §0 (auditoria do que falta) →
[HANDOVER.md](./HANDOVER.md) (diário das sessões, com as armadilhas já resolvidas) →
[CLAUDE.md](./CLAUDE.md) (convenções e comandos).

- **Branch de trabalho:** `feature/dev_2026-09-09` (o `main` ainda é a v1 — não parta dele).
- **Dono do produto:** Leonardo Chalhoub. Todas as decisões de produto são dele (registradas como
  `D-0xx` em [`cvg/docs/tech-spec/_decisoes-travadas.md`](./cvg/docs/tech-spec/_decisoes-travadas.md)).
- **Pareceres completos da vistoria:** [`cvg/brain/refs/2026-09-11-vistoria/`](./cvg/brain/refs/2026-09-11-vistoria/README.md).
  Relatório visual (privado do Leonardo, peça o acesso a ele):
  https://claude.ai/code/artifact/e56080d2-f05b-4034-9422-e63eff9361f1

---

## 1. Em um minuto

**Me Ajuda Aí** é um marketplace de agendamento de serviços de construção civil e manutenção. O
**Prestador de Serviço** abre janelas na agenda e o **Cliente** busca por proximidade e agenda
direto, como num sistema de salão ou clínica. Cada cidade é uma **praça** (tenant) com um
**Administrador**, que cobra uma comissão por serviço realizado. O **SysAdmin** é o dono da
plataforma. O app está em pivô da v1 (mural de vagas por diária) para essa v2. A v1 ainda existe
no código.

**Estado:** o conselho deu **66/100** em 11/09 (48 no dia anterior). Na régua comum, o app passou de
"protótipo com problemas estruturais" (40–59) para **"funcional, com lacunas visíveis" (60–74)**.

**O que o conselho pede agora:** **2 a 3 dias sem funcionalidade nova** para pagar a dívida de
**dinheiro + dado pessoal**, que se concentra na camada construída por último (comissão,
Financeiro, Pix, recibos, red flags). A ordem está na seção 4.

**O que ainda não foi feito:** nada do backlog da seção 4 foi começado. Depois da vistoria só
entrou um conserto pedido ao vivo (o endereço que sumia no cartão do cliente, seção 8).

---

## 2. A segunda vistoria — como foi feita

- **Quem:** os mesmos nove agentes da primeira rodada (10/09), com as personas vindas de `refs/`
  (Mirante dos Dados, caixa-forte, foco-contábil, AgentSpec). Um **controller Opus 5** coordenou e
  conferiu os achados; os **nove agentes rodaram em Sonnet 5**.
- **O quê:** o build de produção do commit `e08e529`, 144 commits depois do avaliado em 10/09
  (`da13908`). Mesmo briefing, mesma régua e o mesmo kit de captura, com o roteiro ampliado para as
  telas novas: **193 páginas** medidas em 3 viewports e 135 telas guardadas.
- **Como:** cada agente leu **o próprio parecer da véspera** e marcou cada recomendação como
  feita, parcial ou não feita, com evidência (arquivo:linha ou captura). Depois deu a nota de hoje.
- **Régua comum:** 90–100 pronto para produção · 75–89 bom, com ajustes pontuais · **60–74
  funcional, com lacunas visíveis** · 40–59 protótipo com problemas estruturais · abaixo de 40,
  refazer.
- **Pedido do Leonardo que originou a rodada:** *"Fizemos o que eles pediram. Peça nova rodada de
  avaliação, quero ver score e possibilidades de melhoria sugeridas por cada agente, e no final um
  score geral e recomendação geral crítica."*

---

## 3. Notas e métricas

| Agente | Lente | 10/09 | 11/09 | Δ |
|---|---|---|---|---|
| conselheira-design | design, acessibilidade, responsividade | 55 | **73** | +18 |
| conselheiro-eng-software | arquitetura, testes, CI, resíduo v1 | 51 | **54** | +3 |
| claude-best-practices-specialist | simplicidade, padrões, código morto | 62 | **57** | −5 |
| conselheiro-administrador | negócio, WHY, receita | 41 | **67** | +26 |
| marketing-specialist | posicionamento, SEO, funil | 38 | **70** | +32 |
| conselheira-protecao-dados | LGPD | 28 | **66** | +38 |
| performance-optimizer | Web Vitals, cache, consultas | 45 | **46** | +1 |
| supabase-specialist | RLS, funções, PII no banco | 45 | **80** | +35 |
| code-reviewer | autorização, correção, abuso | 64 | **82** | +18 |
| **Geral (média simples)** | | **48** | **66** | **+18** |

**Leitura rápida:** subiu muito onde havia trabalho concreto e verificável: segurança no banco,
LGPD de base, SEO e superfícies públicas, a jornada do Administrador e a fundação de design. Ficou
parado nas três lentes que medem **disciplina**: performance (+1, com regressão), engenharia (+3)
e simplicidade (−5). O time somou funcionalidades e não removeu nada.

**Métricas objetivas** (mesmo kit, mesmas contas):

| | 10/09 (144 páginas) | 11/09 (193 páginas) |
|---|---|---|
| Páginas com estouro horizontal | 5 | **0** |
| Contraste abaixo do mínimo (média por página) | 4,4 | **1,5** |
| Campos sem rótulo | 107 | **29** |
| Interativos sem nome acessível | 8 | 26 (os pinos do Leaflet) |
| Alvos de toque < 24px (média por página) | 8,9 | 11,3 |
| `/inicio` do prestador, celular 4G — LCP · CLS · TBT | 2,46 s · 0,203 · 143 ms | **3,74 s · 0,291 · 309 ms** (piorou) |
| `/buscar-prestador` — LCP | 4,17 s | 3,86 s |
| Landing — TTFB | 192 ms | 542 ms (piorou) |

---

## 4. Recomendação geral crítica e backlog priorizado

### A recomendação (texto do controller)

O salto de 48 para 66 é real. Mas o risco mudou de lugar: **ontem era segurança de acesso; hoje é
dinheiro + dado pessoal**, justamente na camada construída por último:

- a chave Pix sobrevive à "exclusão da conta" (a promessa da Política é falsa, e isso foi
  conferido no código);
- o módulo financeiro está fora do "Baixar/Excluir meus dados";
- a Política não fala de comissão nem de recibos;
- as sinalizações ficam visíveis a estranhos e ocultas do próprio alvo;
- o prestador só vê a comissão depois que já está devendo;
- a PII é liberada no primeiro serviço "pendente", sem limite de pedidos.

**Um ciclo curto de congelamento de funcionalidades (2–3 dias)**, nesta ordem. Se o próximo ciclo
continuar só somando telas, a nota estaciona perto de 65. O que derrubaria o lançamento deixaria de
ser um bug de acesso e passaria a ser uma reclamação de privacidade ou uma briga por comissão.

### O backlog (consolidado dos nove pareceres, sem duplicatas)

Colunas: **Quem pediu** = número do parecer (01 design, 02 eng. software, 03 boas práticas, 04
administrador, 05 marketing, 06 proteção de dados, 07 performance, 08 supabase, 09 code-reviewer).
**Esforço:** P (horas), M (até uma semana), G (mais que isso). **Tipo:** código, ou decisão do
Leonardo.

#### Passo 1 — horas, antes de qualquer outra coisa

| # | Item | Onde | Gravidade | Quem pediu | Esforço |
|---|---|---|---|---|---|
| 1 | Incluir `chaves_pix`, `recebimentos`, `notas_avulsas` e `comissoes` na anonimização e na exportação do titular. Hoje a chave Pix sobrevive à exclusão (a conta nunca sai de `auth.users`, de propósito), e o passo 9 só limpa o campo legado `profiles_pii.chave_pix`. Tratar também `pagador_nome` (nome em texto puro de terceiro) em `recebimentos`/`notas_avulsas`. | `lib/titular/anonimizar.ts`, `lib/titular/exportar.ts` | CRÍTICO | 06 (conferido pelo controller) | P |
| 2 | Texto invisível no cartão selecionado ("Quero prestar serviço" e Anúncios), com contraste de 1,44:1. `has-[:checked]:text-white` no `<label>` não cria a classe literal `text-white`, então o filho com `[.text-white_&]:text-white` nunca casa. Trocar por algo como `has-[:checked]:[&_span]:text-white` no label. | `app/(auth)/cadastro/form.tsx:123,135`, `components/anuncio-form.tsx:58,69` | ALTO (regressão) | 01 (conferido) | P |
| 3 | `min-height` no bloco de temperatura do Hero enquanto `climaAgora` é `null`. É ele que empurra o layout: CLS 0,291, faixa "ruim". | `components/hero-card.tsx:255-266` | CRÍTICO | 07 (conferido) | P |
| 4 | `cache()` do React em `getMyWorkspaces`/`getActiveWorkspace`, a mesma receita de `getCurrentUser`. Hoje são 3–4 idas ao banco por request numa página de praça. | `lib/auth/workspace.ts` | CRÍTICO | 07 (conferido) | P |
| 5 | Avisar a comissão no cadastro do prestador ("a praça pode cobrar uma comissão sobre o serviço realizado"), lendo a alíquota vigente se der. | `app/(auth)/cadastro/form.tsx` | ALTO | 05 | P |
| 6 | Números publicados que não reproduzem. A cobertura do README foi corrigida neste handover; ainda falta o comentário de `vitest.config.ts:30` (diz 9,84%) e subir a versão do `package.json`: está em `0.0.2` desde antes das cinco fatias, e a convenção do README manda subir a cada entrega. | `vitest.config.ts`, `package.json` | CRÍTICO (02) | 02, 05 | P |

#### Passo 2 — dinheiro e dado pessoal (dias)

| # | Item | Onde | Gravidade | Quem pediu | Esforço |
|---|---|---|---|---|---|
| 7 | Levar para o banco (gatilho + policy) as transições de comissão e pagamento, no padrão da migration 0038, com gabarito que ataca **de fora** da aplicação. Hoje comissão, financeiro, suspeitas, praças e convite dependem de guard em JS + `service_role`. `lib/actions` + `lib/admin` têm **0,22%** de cobertura unitária, e a integração não roda no CI. | `supabase/migrations/` (nova), `tests/comissao/` | CRÍTICO | 02 | G |
| 8 | Limitar pedidos pendentes simultâneos por cliente (subconsulta de contagem no `with check` de `servicos_insert_cliente`). Restringir `tem_servico_com` a `confirmado`/`realizado`: no "pendente", mostrar só o necessário para combinar a visita. Hoje uma conta nova reserva horários só para raspar telefone, e-mail, Pix e coordenada exata. | migration nova; `0039`, `0055` | ALTO | 08 | M |
| 9 | Atualizar a Política de Privacidade (seções 1 e 5): comissão, recibos, nota avulsa, várias chaves Pix, sinalizações e o randomuser.me como fonte da foto padrão. | `app/(legal)/privacidade/page.tsx` | MÉDIO | 06 | P |
| 10 | **Decisão do Leonardo:** rever a D-045 com a conselheira de dados. Mínimo: o alvo **sabe** que existe sinalização aprovada e o motivo, e a exportação devolve as sinalizações que **a própria pessoa escreveu**. A lei define dado pessoal pela relação com a pessoa (art. 5º, I), não por quem administra o registro. | `lib/titular/exportar.ts:69-72`, `0055` | CRÍTICO (06) | 06 | M |
| 11 | **Decisão do Leonardo:** rever a D-036 (retrato do randomuser.me também em conta real). É direito de imagem de um terceiro que nunca consentiu. Alternativa: avatar gerado (iniciais ou geométrico). | `lib/foto-aleatoria.ts`, `lib/actions/auth.ts:154`, `lib/actions/perfil.ts:169` | ALTO | 06 | P |
| 12 | `profiles_select_all` continua `using (true)`. Qualquer autenticado lista `profiles.status` e descobre quem está **suspenso**. | `0001:34-35`, ADR 0002 | ALTO | 08 | M |
| 13 | **Decisão do Leonardo:** `flags_da_pessoa` mostra as red flags a **qualquer** pessoa do papel oposto, sem vínculo de serviço nem praça. Confirmar se é a intenção ("reputação antes de aceitar") ou se deve seguir `tem_servico_com`. | `0053:79-96`, `0055:87-113` | BAIXO (08) / CRÍTICO (06) | 06, 08 | P |
| 14 | `logAction` nas escritas de maior risco, que hoje não deixam nenhuma linha em stdout. | `lib/actions/agenda-v2.ts`, `pracas.ts`, `denuncias.ts`, `admin-servicos.ts`, `admin-users.ts` | MÉDIO | 02 | P |

#### Passo 3 — subtração (dias)

| # | Item | Onde | Gravidade | Quem pediu | Esforço |
|---|---|---|---|---|---|
| 15 | Apagar o modo demo morto (o próprio código diz que é obsoleto e guarda 4 senhas em texto puro). A checagem `isDemo` roda em toda action de escrita sem nunca poder ser verdadeira. | `lib/auth/demo.ts`, `app/api/demo/enter/route.ts`, `tests/auth-demo-guard.test.ts`, `isDemo` em `lib/auth/guard.ts` | MÉDIO | 02, 03, 09 | P |
| 16 | Apagar a agenda antiga, que nenhuma página importa. | `components/agenda/agenda-calendar.tsx`, `components/agenda/agenda-view.tsx`, `lib/agenda-conflitos.ts` + `tests/agenda-conflitos.test.ts` | BAIXO | 03 | P |
| 17 | **Decisão do Leonardo, depois execução:** o destino da v1. São as 9 rotas do mural de vagas (`/vagas`, `/vagas/[id]`, `/minhas-vagas` e subrotas, `/avaliar/[vagaId]`, `/chat/vaga/[vagaId]`, `/minhas-diarias`, `/publicar`), mais `/financeiro` e `/relatorios` da v1 (hoje há três "financeiros"). O Funcionário ainda abre em "Minhas vagas / diárias / candidatos" (`lib/modules.ts:8`). Documentar no ROADMAP. | `app/(app)/*` | ALTO | 02, 03, 04 | M |
| 18 | Um só CSS de recibo: os três recibos colam o mesmo bloco de ~40 linhas de CSS de impressão (`.na-`, `.rr-`, `.recibo-`). Extrair `<FolhaRecibo>` ou um CSS compartilhado. | `app/(documento)/recibo/{nota/[id],recebimento/[id],comissao/[prestadorId]/[mes]}/page.tsx` | ALTO | 03 | P–M |
| 19 | Agenda v2 com zod + `useActionState`/FormData e limite de tamanho em `descricao`/`endereco`. É o único lugar em que a feature nova tem menos disciplina que a v1 que ela substitui. 22 de 29 arquivos de `lib/actions` estão sem zod. | `lib/actions/agenda-v2.ts` + 6 componentes (`criar-slot-form.tsx`, `slot-reservar.tsx`…) | ALTO | 03, 09 | G |
| 20 | `Promise.all` no `/inicio` do prestador (~13 `await` em série) e na landing (cascata `getCurrentUser` → fotos → `anuncios_publicos` → vitrine), com `unstable_cache` no que não é por usuário. Buscar o clima no servidor e passar ao `HeroCard` por prop. | `app/(app)/inicio/page.tsx:194-301`, `app/page.tsx`, `components/landing/vitrine-servicos.tsx` | ALTO | 07 | M |
| 21 | Fuso residual da v1: três chamadas `toLocaleDateString("sv-SE")` sem fuso. Das 21h às 23h59, uma vaga de "hoje" vira "passado". Trocar pelos helpers de `lib/datas.ts`. | `lib/periodo.ts:29`, `lib/validation.ts:52`, `app/(app)/vagas/page.tsx:26` | MÉDIO | 09 | P |
| 22 | CI: rodar a integração, conferir o drift de `supabase gen types` e falhar se a cobertura publicada divergir da medida. Hoje o `ci.yml` roda só a suíte unitária. | `.github/workflows/ci.yml` (fora da cerca de tarefas: só com o Leonardo) | MÉDIO | 02 | M |
| 23 | Devolver a medida "lógica pura" a 100% (ver 6.2): testes para `lib/clima.ts`, `citacoes.ts`, `tipos-servico.ts`, `fonte-assinatura.ts`, `periodo-da-visita.ts`, `whatsapp.ts`, `auth/contas-exemplo-fotos.ts`, `auth/workspace.ts` e `anuncios/regras.ts`. Decidir e documentar se `lib/admin/**` e `lib/titular/**` (falam com o banco, como as actions) saem dessa medida e passam a ser cobertos por integração. | `vitest.config.ts`, `package.json`, `tests/` | MÉDIO | controller | M |

#### Passo 4 — negócio (fora do código, decisões do Leonardo)

| # | Item | Quem pediu |
|---|---|---|
| 24 | Validar a alíquota com 3–5 prestadores reais, cobrando fora do app, antes de travar o número. | 04 |
| 25 | Uma consequência **visível** para comissão em atraso, ao menos um selo "em dia / pendência" no perfil do prestador. Hoje a D-044.6 decide "sem consequência automática", e o WhatsApp direto fica sem nenhuma fricção. É a diferença entre comissão de verdade e "comissão de honra". | 04 |
| 26 | Como o "Enviei o Pix" manual escala com 50 prestadores por praça: webhook de PSP / Pix automático. | 04 |
| 27 | Amarrar a landing à praça ("Já disponível em Niterói"), criar uma página pública de preços/comissão (como o `/precos` do `refs/foco-contabil`), juntar prova social real (primeiros 5–10 prestadores com avaliação genuína) e pôr no sitemap todo prestador com página pública, não só quem tem anúncio. | 05 |
| 28 | Uma linha de **WHY** no Hero e na landing (sugestão: "Sua agenda, sua reputação, seu preço — sem intermediário decidindo por você") e o aviso "contas fictícias" no primeiro card visível no celular. | 04 |

#### Menores — resolva quando passar por perto

- **Design (01):**
  - alvos de toque < 24px nas linhas de lista — o `/servicos` do prestador tem 104; usar `min-h-11`;
  - fade ou seta de rolagem nas abas da praça e no carrossel de anúncios;
  - terminar a adoção da escala tipográfica (a landing ainda tem 8 tamanhos);
  - wrapper visual para `date`/`time`;
  - tiles do Leaflet escurecidos no tema escuro (`filter: grayscale(.3) brightness(.8)`);
  - verde do "Compartilhar no WhatsApp" a 4,12:1 — escurecer para ≥ 4,5:1;
  - o número do recibo de comissão quebra "P-/000029" no celular (`white-space: nowrap`);
  - copy de "Necessita-se ajudante!" no tom v2.
- **Performance (07):**
  - ícones do Leaflet locais — hoje vêm do `unpkg.com`, em `components/maps/pontos-map.tsx:10-12`;
  - `preconnect` para `tile.openstreetmap.org`;
  - `"regions": ["iad1"]` no `vercel.json`;
  - `images.remotePatterns`;
  - TTFB dos recibos de 1,5–2,6 s.
- **Supabase (08):**
  - índices `profiles(tipo_base, categoria)` e `agenda_slots(status)`;
  - `set search_path = ''` nas três versões de `validar_transicao_servico`;
  - girar `SENHA_CONTA_EXEMPLO`;
  - praça/cidade e `LIMIT` em `buscar_prestadores_proximos` (ADR 0003);
  - registrar o auth hook só com o roteiro de teste e **depois** de escopar as cláusulas de SysAdmin (D-030, ADR 0009) — registrado antes disso, a conta de exemplo, aberta por qualquer visitante, ganharia o banco inteiro.
- **Código (09, 03):**
  - `requireUser` → `tryWriter` em `lib/actions/admin-servicos.ts:14`;
  - apertar o tipo de `trocarMeuPapelAction` (o `"admin"` nunca passa);
  - `import "server-only"` no resto de `lib/auth/`;
  - middleware devolver 404 em vez de mandar para `/login` (`middleware.ts:57-61`);
  - `#0D47A1` fixo em `app/layout.tsx:57` e `components/denunciar.tsx:126`;
  - `git rm --cached` nos 3 `.pyc` versionados;
  - skills do Converge triplicadas em `.claude/`, `.agents/` e `.grok/` (atenção: o `cvg` lê `.agents` primeiro — ver HANDOVER.md).

---

## 5. Parecer por agente

Resumo fiel de cada parecer. O texto integral, com todas as evidências, está em
`cvg/brain/refs/2026-09-11-vistoria/pareceres/NN-*.md`.

### 01 · conselheira-design — 73 (ontem 55)

**Veredito.** A direção do parecer anterior virou código quase literalmente:
- a escala tipográfica em `tailwind.config.ts:58-77` cita o parecer;
- a casca tem `max-w-[1100px]`;
- os horários viraram uma grade por dia;
- zero estouro horizontal.

O **Financeiro em grade é a melhor peça de design do produto**. Os recibos têm padrão de impressão
("QUITADO", assinatura, aviso de "sem valor fiscal"). Mas surgiu uma regressão real: o texto
invisível no cartão selecionado do cadastro e dos Anúncios.

**Ontem → hoje.**
- **Feitas:** header mobile, grade de horários, separador do rodapé, copy v2 do Administrador, espaçamento dos Termos, `.card-vazio`.
- **Parciais:** adoção da escala, wrapper de `file`/`date`/`time`, Hero e casca.
- **Não feita:** Leaflet escuro.
- **Revista:** a estrela a 3,07:1 é decorativa (`aria-hidden`), então a agente retirou a gravidade.

**Problemas.**
- **ALTO:** texto invisível (item 2 do backlog); 104 alvos de toque < 24px no `/servicos`.
- **MÉDIO:** abas e carrossel sem indício de rolagem; escala tipográfica adotada só em parte; `date`/`time` nativos.
- **BAIXO:** Leaflet escuro; copy de "Necessita-se ajudante!"; WhatsApp a 4,12:1; número do recibo quebrando.

**Se só pudesse mudar uma coisa:** o contraste do cartão selecionado. É a única regressão de
acessibilidade real, está no link "Quero prestar serviço" da landing e o conserto são poucas linhas.

### 02 · conselheiro-eng-software — 54 (ontem 51)

**Veredito.** A peça mais importante pedida ontem foi entregue e bem feita: as migrations 0038/0039
levaram para o banco (gatilho + policy) o nascimento e a transição de serviço e a exposição de
contato, e os gabaritos atacam de fora da aplicação. Mas essa disciplina não se propagou:
- `lib/actions` quase dobrou (2.197 → 4.380 linhas);
- `lib/admin` nasceu com 1.139 linhas;
- nada disso ganhou a mesma rede.

A métrica de cobertura publicada não reproduz.

**Ontem → hoje.**
- **Feitas:** ADR 0010 da fronteira, smoke e2e (`scripts/regressao/fatia1.mjs` e `qr-pix.mjs`), `not-found` sem "vaga".
- **Parcial:** teste de integração por action crítica (só no núcleo).
- **Não feitas:** cortar as 9 rotas v1, apagar o demo, corrigir o comentário do `vitest.config.ts`, drift de tipos no CI, anotar a cobertura real.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Arquitetura | 25% | 60 | 65 |
| Pirâmide de testes | 30% | 40 | 48 |
| CI/CD | 20% | 65 | 50 |
| Resíduo v1 | 15% | 35 | 35 |
| Processo Converge | 10% | 55 | 70 |

**Problemas.**
- **CRÍTICO:**
  - a cobertura publicada (33,76%) não reproduz — dá 25,16% — e a versão continua `0.0.2`, zero bumps em 144 commits;
  - a fronteira de escrita continua dividida (comissão, financeiro, suspeitas, praças e convite só com guard em JS).
- **ALTO:** resíduo v1 intacto.
- **MÉDIO:** o demo morto com teste dedicado; as actions novas sem `logAction`.
- **BAIXO:** comentário de 9,84%; sem checagem de drift de tipos; nenhum workflow gateia o deploy.

**Se só pudesse mudar uma coisa:** reaplicar o padrão da 0038/0039 na Comissão e no Financeiro.

### 03 · claude-best-practices-specialist — 57 (ontem 62)

**Veredito.** O CRÍTICO de ontem (o CTA de vaga v1 para o SysAdmin) está corrigido de verdade, com
painéis próprios para o Administrador e o SysAdmin. Mas nenhuma recomendação estrutural foi tocada:
- a Agenda v2 continua sem padrão;
- o código morto não saiu;
- a validação não foi padronizada.

O dia ainda criou duplicação nova: três recibos com o mesmo CSS de impressão colado.

> Nota do controller: o "mural de vagas" da landing (`components/landing/mural-vagas.tsx`) é o
> mural de anúncios "Necessita-se ajudante!" pedido pelo Leonardo (D-034), não resíduo da v1. O
> achado vale como "documentar a decisão".

**Ontem → hoje.**
- **Feitas:** branch do SysAdmin em `/inicio`; §0 do ROADMAP atualizada.
- **Não feitas:**
  - migrar a `agenda-v2` para `useActionState` + zod;
  - apagar `agenda-calendar`, `agenda-view` e `agenda-conflitos`;
  - padronizar a validação (22 de 29 arquivos sem zod; dos 10 novos, só `anuncios.ts` usa);
  - um só lugar para as skills.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Código morto | 20% | 60 | 56 |
| Consistência | 30% | 50 | 46 |
| Duplicação | 20% | 78 | 60 |
| Inegociáveis | 20% | 62 | 68 |
| Documentação | 10% | 70 | 62 |

**Elogios.**
- `MatrizFinanceira` + `FiltrosFinanceiro` + `lib/financeiro/matriz.ts`, compartilhados entre Administrador e prestador;
- gráfico de faturamento em SVG sem biblioteca nova;
- a Fatia 1 real no banco.

**Problemas.**
- **ALTO:** CSS de recibo triplicado; `agenda-v2.ts` sem zod e sem limite de tamanho.
- **MÉDIO:**
  - mural "Necessita-se ajudante!" na landing (documentar);
  - `/financeiro` e `/relatorios` v1 sem reconciliação;
  - `demo.ts` morto, mas importado pelo `guard.ts`.
- **BAIXO:**
  - agenda antiga morta;
  - `#0D47A1` fixo e ~27 valores arbitrários na landing;
  - skills triplicadas, com `.pyc` versionados.

**Se só pudesse mudar uma coisa:** a Agenda v2 no padrão `useActionState` + zod.

### 04 · conselheiro-administrador — 67 (ontem 41)

**Veredito.** As quatro superfícies que contradiziam o WHY (landing, cadastro, 404 e a home de
quem decide) foram limpas. As 7 lacunas da comissão (D-044) foram decididas **e** construídas num
dia, com um Financeiro "digno de SaaS B2B". O que não avançou foi a contramedida pedida: está
formalmente decidido que **não há consequência automática** para quem não paga (D-044.6). O HOW
está resolvido; falta o WHY de o prestador continuar pagando.

**Ontem → hoje.**
- **Feitas:** faxina de linguagem; home honesta para o SysAdmin e o Administrador; "quem cobra" decidido; 404; cadastro sem "Tenho uma empresa".
- **Parcial:** "Minhas vagas" (saiu do Administrador, mas o Funcionário ainda vê).
- **Não feitas:**
  - a alavanca de retenção (agora é decisão explícita);
  - testar a alíquota com prestadores reais;
  - o aviso "contas fictícias" no primeiro card;
  - uma linha de WHY no Hero.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| WHY na interface | 25% | 30 | 60 |
| Coerência da jornada | 25% | 45 | 75 |
| Prioridades | 20% | 45 | 78 |
| Viabilidade da comissão | 20% | 35 | 50 |
| Contas de exemplo | 10% | 65 | 78 |

**Problemas.**
- **ALTO:**
  - o motor de receita sem alavanca, e o "Enviei o Pix" manual não escala;
  - desintermediação sem barreira (o WhatsApp direto em `lib/whatsapp.ts` e `cliente-do-servico.tsx`).
- **MÉDIO:** o Funcionário ainda na língua v1; a árvore de rotas v1.
- **BAIXO:** o aviso de contas fictícias; o Hero sem propósito.

**Se só pudesse mudar uma coisa:** uma consequência visível ao saldo em aberto, nem que seja só um
selo no perfil. É a diferença entre comissão de verdade e "comissão de honra".

### 05 · marketing-specialist — 70 (ontem 38)

**Veredito.** Os dois CRÍTICOS de ontem, zero SEO e nenhuma vitrine pública, foram resolvidos de
ponta a ponta:
- `robots.ts`, `sitemap.ts` e `opengraph-image.tsx`;
- `/p/[id]` indexável, com metadata própria e a foto do prestador.

A landing fala v2. O potencial comercial subiu de 6 para 7/10, porque a comissão virou um motor de
receita de verdade. Falta **transparência de preço** e uma **história de praça**.

**Ontem → hoje.**
- **Feitas:**
  - SEO e Open Graph;
  - a vitrine pública;
  - a copy do mapa no cadastro;
  - a conta dev fora da busca;
  - o Administrador sem vocabulário v1;
  - "Como funciona" e o subheadline.
- **Parciais:** a praça na superfície pública; o banner de cookies.
- **Não feita:** a versão no rodapé.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Posicionamento | 20% | 55 | 80 |
| Copy | 15% | 42 | 78 |
| Onboarding | 20% | 50 | 62 |
| SEO | 25% | 8 | 85 |
| GTM por praça e preço | 20% | 30 | 45 |

**Problemas.**
- **ALTO:** a comissão invisível até o prestador já estar devendo. É a receita do post "disseram que era grátis e depois cobraram" no grupo de WhatsApp do bairro.
- **MÉDIO:** a landing não cita Niterói; toda a prova social é "Exemplo".
- **BAIXO:** o sitemap só lista quem tem anúncio; `v0.0.2`.

**Se só pudesse mudar uma coisa:** revelar a comissão antes ou durante o cadastro.

### 06 · conselheira-protecao-dados — 66 (ontem 28)

**Veredito.** A melhora mais acentuada do conselho:
- Política e Termos reescritos para a v2;
- processadores nomeados e o art. 33 citado;
- exportação e anonimização reais, com carência travada por gatilho e cron de expurgo;
- encarregado nomeado;
- quatro CRÍTICOS de ontem fechados: texto da v1, senha em `localStorage`, endereço exposto e transferência internacional omitida.

Mas a Fatia 5 (comissão, Pix, recibos, sinalizações) nasceu **depois** da Política e não voltou
para dentro do mecanismo do titular nem do texto. E a D-045 recategoriza dado pessoal por decreto
interno.

**Ontem → hoje.**
- **Feitas:** Política e Termos v2, processadores, senha, endereço, encarregado, cron, changelog, banner honesto.
- **Feita com lacuna nova:** exportação e anonimização.
- **Parcial:** o balanceamento das anotações privadas.
- **Piorou:** as fotos. A D-036 levou o randomuser.me para as contas reais.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Consistência produto × texto | 25% | 5 | 75 |
| Direitos do titular | 25% | 15 | 55 |
| Base legal e transferência | 20% | 10 | 85 |
| Segurança (art. 46) | 15% | 20 | 80 |
| Encarregado e retenção | 15% | 20 | 80 |

**Problemas.**
- **CRÍTICO:**
  - a chave Pix não é anonimizada (conferido);
  - D-045: a sinalização é mostrada a qualquer estranho do papel oposto e escondida do próprio alvo, contra o art. 6º, IV e o art. 18, II;
  - a D-045 exclui da exportação até o que a pessoa **escreveu**.
- **ALTO:** retratos de pessoas reais em contas reais (direito de imagem, art. 5º, X da CF e art. 20 do CC); o Financeiro inteiro fora do raio do titular.
- **MÉDIO:** anotações privadas sem mecanismo de acesso no produto; a Política silenciosa sobre a Fatia 5.
- **BAIXO:** sem registro de qual versão da Política cada pessoa aceitou.

**Quick wins.**
- `chaves_pix` no passo 9 da anonimização;
- as tabelas financeiras na exportação;
- uma frase do módulo financeiro na Política;
- devolver as sinalizações **autoradas** na exportação;
- nomear o randomuser.me na Política.

**Se só pudesse mudar uma coisa:** fechar a Fatia 5 no mecanismo do titular, começando pela
`chaves_pix`. É a contradição entre texto e código que a ANPD confere primeiro.

### 07 · performance-optimizer — 46 (ontem 45)

**Veredito.** Dois acertos reais: `React.cache()` em `getCurrentUser` e a Poppins por `next/font`.
Mas o padrão "consulta em série sem `Promise.all`" foi **replicado** na landing e cresceu no
`/inicio`. O Hero redesenhado reintroduziu o CLS em escala maior: de 0,203 para **0,291**.

**Ontem → hoje.**
- **Feitas:** `cache` em `getCurrentUser`; `next/font`; fotos leves (por outro caminho).
- **Não feitas:**
  - `cache` em `getMyWorkspaces`;
  - clima no servidor + `HeroCard` por prop;
  - `Suspense` no `/inicio`;
  - `preconnect` e ícones locais do Leaflet;
  - `regions` no Vercel.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| TTFB logado | 30% | 35 | 40 |
| LCP | 20% | 40 | 50 |
| CLS do Hero | 15% | 35 | 22 |
| Fontes e imagens | 20% | 45 | 68 |
| Cache e streaming | 15% | 40 | 38 |

**Problemas.**
- **CRÍTICO:** o CLS do Hero (item 3); `getMyWorkspaces` sem `cache` (item 4).
- **ALTO:** a cascata da landing (TTFB de 192 → 542 ms); ~13 `await` em série no `/inicio` (LCP de 2,46 → 3,74 s, TBT de 143 → 309 ms).
- **MÉDIO:** Leaflet no `unpkg`; TTFB dos recibos de 1,5–2,6 s.
- **BAIXO:** `remotePatterns` e `regions`.

**Se só pudesse mudar uma coisa:** o `min-height` no bloco de temperatura do Hero. "Hoje ele é
bonito e instável."

### 08 · supabase-specialist — 80 (ontem 45)

**Veredito.** As duas costuras de ontem foram fechadas de verdade, com gatilho e teste de ataque:
- `servicos` sem invariante no banco;
- a conta de exemplo lendo o mundo real (0040 + `lib/auth/exemplo.ts` + `lib/admin/consultas.ts`).

Resta o que já era ALTO: a leitura global de `profiles` e o `current_app_role()` inerte. E o
"pendente" que libera contato subiu para ALTO, pelo ângulo de raspagem em massa.

**Ontem → hoje.**
- **Feitas:** travar `servicos`; isolar o mundo de exemplo; testes de integração, inclusive das tabelas novas.
- **Parcial:** `tem_servico_com` (fechou o cancelado; o pendente continua).
- **Não feitas:**
  - o auth hook (decisão consciente, D-030);
  - praça na busca e `LIMIT`;
  - quick wins de índice e senha de exemplo.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| RLS v2 | 30% | 25 | 85 |
| PII e localização | 20% | 60 | 70 |
| SECURITY DEFINER, grants e Storage | 20% | 85 | 88 |
| Service role e exemplo | 20% | 20 | 85 |
| Praça e testes | 10% | 45 | 60 |

**Elogios.**
- `validar_transicao_servico` vale para qualquer role;
- `lib/admin/alcance.ts` é o ponto único de alcance, usado por 16 arquivos;
- as ~15 funções novas têm `search_path = ''`, `revoke` e `grant` explícitos, e `COMMENT ON` em 100%;
- os recibos resolvem o "id arbitrário".

**Problemas.**
- **ALTO:**
  - `profiles_select_all` expõe quem está suspenso;
  - "pendente" libera PII sem limite de pedidos;
  - ~48 cláusulas dependem do `current_app_role()` inerte.
- **MÉDIO:** busca sem praça e sem `LIMIT`.
- **BAIXO:**
  - `validar_transicao_servico` sem `search_path`;
  - `flags_da_pessoa` sem vínculo;
  - índices faltando.

**Se só pudesse mudar uma coisa:** rate limit na criação de `servicos`, ou menos PII no "pendente".

### 09 · code-reviewer — 82 (ontem 64)

**Veredito.** As duas quebras mais graves de ontem foram corrigidas com defesa em camadas:
- escalação de módulo entre empresas: `lib/auth/modules.ts:29-34` e `ehMembroDaEmpresa`;
- corrida na reserva: índice único parcial `servicos_slot_ocupado_unico` + RLS com subconsulta. A solução é melhor que a sugerida.

A escalada para Administrador foi fechada numa regra única, em `lib/auth/papeis.ts`. A enumeração
no convite também foi fechada, inclusive o canal de tempo (`after()`). Sobrou o fuso residual da v1
e alguns BAIXOS.

**Ontem → hoje.**
- **Feitas:** módulos por empresa; a corrida; o cadastro sem `admin`; a enumeração; a senha fora do `localStorage`; `timingSafeEqual` no `CRON_SECRET`; rate limit no geocode.
- **Parciais:** o fuso central (falta o residual da v1); `server-only` no `demo.ts`; zod nas actions de objeto.
- **Não feitas:** `tryWriter` em `admin-servicos`; o middleware 404.

**Notas por critério.**

| Critério | Peso | Ontem | Hoje |
|---|---|---|---|
| Autorização e IDOR | 30% | 55 | 85 |
| Validação | 20% | 75 | 80 |
| Correção | 20% | 55 | 75 |
| Segredos | 15% | 78 | 88 |
| Abuso | 15% | 62 | 82 |

**Problemas.**
- **MÉDIO:** o fuso residual da v1 (item 21).
- **BAIXO:**
  - `requireUser` em `comentarServicoAction`;
  - o middleware manda rota inexistente para `/login`;
  - `demo.ts` com senhas;
  - o tipo de `trocarMeuPapelAction`.

**Se só pudesse mudar uma coisa:** varrer o fuso residual. O helper certo já existe, faltam três
chamadas.

---

## 6. O que o controller conferiu no código

### 6.1 Na vistoria (11/09)

- **Procede, CRÍTICO de LGPD:** `chaves_pix`, `recebimentos`, `notas_avulsas` e `comissoes` não
  aparecem em `lib/titular/anonimizar.ts` nem em `lib/titular/exportar.ts`.
- **Procede, ALTO de design:** o texto invisível em `app/(auth)/cadastro/form.tsx:123,135`
  (captura `anon__cadastro-prestador__mobile__1de3.png`).
- **Procede, performance:** `lib/auth/workspace.ts` sem `cache()`; o CLS do Hero em 0,291.
- **Procede, CI:** `.github/workflows/ci.yml` roda só a suíte unitária.
- **Contexto acrescentado ao parecer 03:** o mural "Necessita-se ajudante!" é pedido do dono (D-034).
- **Decisões do dono questionadas pelo parecer 06:** D-045 e D-036. Ficam para o Leonardo
  decidir, não para o controller reverter.

### 6.2 Correção feita neste handover — a cobertura "pura" não está em 100%

O README da vistoria afirmou que "a lógica pura segue 100%". **Não segue.** Medido de novo em
11/09, com os comandos do `package.json`:

| Medida | Comando | Hoje | Publicado antes |
|---|---|---|---|
| `lib/` inteiro | `npm run test:coverage` | **25,16%** (statements/linhas) · funções 62,33% · branches 90,13% | 33,76% |
| "Lógica pura" (exclui só `lib/actions` e `lib/supabase`) | `npm run test:coverage:puro` | **57,15%** · funções 74,59% · branches 94,38% | 100% (R-33, 08/09) |

**Por que caiu:**
1. Código de servidor que fala com o banco nasceu **fora** das exclusões da medida "pura":
   - `lib/admin/**` — 0,66%: `abas`, `alcance`, `consultas`, `financeiro`, `praca-ativa`;
   - `lib/titular/**` — 4,62%: `anonimizar`, `exportar`.
2. Arquivos puros novos entraram sem teste unitário:
   - com 0%: `lib/clima.ts`, `lib/citacoes.ts`, `lib/tipos-servico.ts`, `lib/fonte-assinatura.ts`, `lib/auth/contas-exemplo-fotos.ts`;
   - parciais: `lib/periodo-da-visita.ts` (48%), `lib/whatsapp.ts` (75%), `lib/auth/workspace.ts` (75%), `lib/anuncios/regras.ts` (90%).
3. Os módulos novos de regra estão bem cobertos: `lib/comissao/regras.ts` 100%,
   `lib/financeiro/*` 99% e `lib/pix/*` 100%.

O conserto é o item 23 do backlog. Não troque a medida só para o número voltar a 100%: tirar
`lib/admin` e `lib/titular` da conta "pura" é correto só se eles passarem a ser cobertos por
integração, e isso precisa ficar escrito.

---

## 7. Decisões pendentes com o Leonardo

1. **D-045** — as sinalizações como "registro da administração", fora do "Baixar meus dados" e
   invisíveis ao alvo (parecer 06, CRÍTICO). Mínimo sugerido: o alvo sabe que existe e o motivo, e
   a exportação devolve o que a própria pessoa escreveu.
2. **D-036** — retrato do randomuser.me também em conta real (parecer 06, ALTO).
3. **D-044.6** — "sem consequência automática" para a comissão em atraso (parecer 04, ALTO). Um
   selo "em dia" resolveria sem suspensão automática.
4. **Visibilidade das red flags** — para qualquer pessoa do papel oposto ou só para a contraparte
   de um serviço (pareceres 06 e 08).
5. **Destino da v1** — rotas de vagas, `/financeiro` e `/relatorios` v1, papel Funcionário
   (pareceres 02, 03, 04).
6. **Versão** — subir o `package.json` (de `0.0.2` para `0.1.0`?) ou tirar o número do rodapé
   público (pareceres 02, 05).
7. **Auth hook** — só depois de escopar as cláusulas de SysAdmin pela marca de exemplo (D-030,
   ADR 0009). Não registre por conta própria: se sair errado, ninguém entra no app.
8. **Mudanças no CI** (`.github/workflows/`) e na cerca `.cvg/gate.yaml`: são revisadas por quem
   responde pelo repositório, não por tarefa.

---

## 8. O que aconteceu depois da vistoria

- **"Mapa aparece, mas endereço não"** (pedido do Leonardo, commit `f4e5384`). A conta de exemplo
  da Marina tinha só o ponto (`profile_local.endereco = null`), e a tela escondia a linha. Agora:
  - o perfil, o detalhe do cliente e o cliente do serviço mostram "Endereço escrito não informado — use o ponto no mapa";
  - `scripts/enderecos-exemplo.mjs` grava rua e bairro, **sem número**, marcados "(endereço de exemplo)", para as nove contas de exemplo.
- **Limpeza:** o servidor da vistoria (porta 3100) foi desligado; a worktree temporária e a
  configuração dela no `.claude/launch.json` saíram (commit `fe71d0e`).
- **Repositório novo e produção** (pedido do Leonardo, 11/09):
  - o código foi para o repositório privado `leonardochalhoub/meajudaai`, na `main`, com todo o histórico (remote `leonardo`);
  - o app está no ar em **https://meajudaai-jet.vercel.app**, com deploy automático a cada push na `main` e funções em `cle1`, junto do banco;
  - o Site URL do Supabase Auth saiu de `http://localhost:3000` e passou para o endereço de produção.

  Variáveis, e-mail e o que fazer ao trocar de domínio estão no README, seção "Produção (Vercel)". **Atenção:** o SMTP padrão do Supabase não serve para cadastro público (ver README).
- **Documentação:** este arquivo, o README (cobertura re-medida, mapa do banco e das pastas v2, testes)
  e o CLAUDE.md (onde está a avaliação, como verificar no navegador, dados de exemplo).

---

## 9. Como rodar e verificar

```bash
npm install
npm run dev            # http://localhost:3000
```

**`.env.local`** (não versionado — peça ao Leonardo):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`;
- `NEXT_PUBLIC_APP_NAME`;
- `SUPABASE_TOKEN`: token de gestão, usado só pela CLI para aplicar migrations;
- `GEMINI_API_KEY`: juiz de revisão do Converge.

As rotas de cron exigem `CRON_SECRET` (ver `vercel.json`). Nunca comite nem cole esses valores.

**Contas de exemplo:** um clique no card da landing, ou `/api/exemplo/entrar?papel=cliente |
prestador_servico | admin | sysadmin | funcionario`. Ficam presas ao "mundo de exemplo": não veem
nem alteram contas reais (`profiles.exemplo`, `lib/auth/exemplo.ts`).

**Dados de exemplo** (idempotentes, só no mundo de exemplo; rode de novo para voltar ao estado
conhecido depois de testes manuais):

```bash
node scripts/comissao-exemplo.mjs       # alíquotas, chave Pix fictícia do Administrador, comissões de 2026
node scripts/financeiro-exemplo.mjs     # 3 clientes, 23 serviços, recebimentos; agosto do Carlos em aberto
node scripts/sinalizacoes-exemplo.mjs   # 2 red flags aprovadas na Marina
node scripts/enderecos-exemplo.mjs      # endereço + ponto das 9 contas de exemplo
node scripts/seed-anuncios.mjs          # 4 prestadores e 11 anúncios
```

**Testes:**

```bash
npm test                                   # unidade, sem banco — 427 verdes
npm run test:integration                   # banco real (RUN_INTEGRATION=1 no .env.local) — 576/577
bash scripts/regressao/rodar-fatia1.sh     # build de produção + 10 passos no Chrome
node scripts/regressao/qr-pix.mjs          # lê o QR Pix gerado pelo app (jsQR) — 4/4
npm run test:coverage                      # 25,16% hoje
npm run test:coverage:puro                 # 57,15% hoje (ver 6.2)
npx tsc --noEmit                           # tipos
```

O único vermelho conhecido da integração é o banner do SysAdmin, que depende do auth hook (ADR 0009).

**Verificar tela:** toda mudança de UI é conferida rodando o app no navegador, porque o teste
automatizado sozinho não basta. Use o Chrome headless via `playwright-core` (`channel: "chrome"`),
como em `scripts/regressao/fatia1.mjs`. O painel de navegador embutido do Claude, quando oculto,
não roda `requestAnimationFrame` e fica preso em "Carregando…". **Não rode `next build` com o
`next dev` no ar no mesmo checkout**: os dois escrevem em `.next`.

---

## 10. Como trabalhar aqui

- **Idioma:** produto, comentários e commits em PT-BR.
- **Commits pequenos**, um por mudança concluída, com o push no branch de trabalho.
- **Banco:** migrations sequenciais em `supabase/migrations/` (a última é a `0059`). Toda tabela,
  coluna e função tem `COMMENT ON`. Para aplicar:
  `SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase db push --linked`. Depois, regenere
  `lib/supabase/database.types.ts`. Migration aplicada não se edita: faça outra. A cerca
  `.cvg/gate.yaml` tranca as migrations aplicadas.
- **Regra no banco, não só na action.** O navegador fala direto com o Supabase usando a chave
  pública, então invariante de dinheiro, estado ou PII mora em policy ou gatilho, com gabarito que
  ataca de fora da aplicação (molde: `tests/fatia1/servicos.test.ts`).
- **Escrita do Administrador:**
  - `tryWriter` confere o papel;
  - o alcance é decidido por `lib/admin/alcance.ts` (`pracasDoAtor`, `pracaAlcancada`, `atorAlcanca`), sempre pelo `workspace_id` do **registro**, nunca pelo id que o cliente mandou;
  - depois, o cliente service-role;
  - leituras de servidor em `lib/admin/*.ts`, com `import "server-only"`, nunca exportadas de arquivo `"use server"`.
- **Dinheiro em centavos** (`lib/comissao/regras.ts`); **datas em America/Sao_Paulo** por
  `lib/datas.ts` (nunca `toLocaleDateString` sem fuso).
- **Documentação:** TSDoc nas funções de `lib/` e um comentário de topo em cada componente e rota
  (conciso, explica o porquê).
- **UI:**
  - rótulos de papel por `papelLabel` (três formas de gênero);
  - Server Component não passa função a Client Component;
  - popover perto de mapa Leaflet com `z-[1000]+`;
  - nunca expor `profile_local.lat/lng` fora da RLS restrita.
- **Processo pesado só onde precisa.** O Leonardo acha lento o fluxo completo (spec, gabarito,
  task-spec, juiz). Use-o onde mexe em banco ou autorização; em UI, lotes com verificação no
  navegador. Ele gosta de ver resultado cedo.
- **Lotes em paralelo:** o `isolation: "worktree"` do Agent tool parte do `main` (a v1). Crie a
  worktree a partir do branch atual e ligue o `node_modules` por junção
  (`New-Item -ItemType Junction`). Ao remover, desfaça a junção primeiro (`cmd /c rmdir`).
- **Juiz de revisão:** a cota gratuita do Gemini (20 pedidos/dia por modelo) acaba rápido. O
  `revisar-lote.sh` aceita `JUIZ=grok` com `XAI_API_KEY` no `.env.local`.

---

## 11. Onde está cada coisa

| O quê | Onde |
|---|---|
| Fonte da verdade do produto, auditoria do que falta | [ROADMAP.md](./ROADMAP.md) (§0 primeiro) |
| Diário das sessões e armadilhas resolvidas | [HANDOVER.md](./HANDOVER.md) |
| Decisões travadas (D-001 a D-048) | [`cvg/docs/tech-spec/_decisoes-travadas.md`](./cvg/docs/tech-spec/_decisoes-travadas.md) |
| ADRs (fatos medidos no banco) | [`cvg/docs/adrs/`](./cvg/docs/adrs/) |
| Requisitos (R-n) | [`cvg/docs/tech-spec/fechar-v2-marketplace.md`](./cvg/docs/tech-spec/fechar-v2-marketplace.md) |
| Vocabulário canônico | [`cvg/docs/CONTEXT.md`](./cvg/docs/CONTEXT.md) |
| **Vistoria de 11/09** (pareceres, métricas, 135 telas, kit de captura) | [`cvg/brain/refs/2026-09-11-vistoria/`](./cvg/brain/refs/2026-09-11-vistoria/README.md) |
| Vistoria de 10/09 (o "antes") | [`cvg/brain/refs/2026-09-10-vistoria/`](./cvg/brain/refs/2026-09-10-vistoria/README.md) |
| Repositórios de referência (Pix, IBGE, Hero, Financeiro em grade) | `refs/` (fora do git; cada um com `.ua/` e `CLAUDE.md`) |
| Comissão e Financeiro | `lib/comissao/`, `lib/financeiro/`, `lib/admin/financeiro.ts`, `lib/actions/{comissao,financeiro,recebimentos}.ts`, `components/financeiro/`, `app/(app)/praca/financeiro`, `app/(app)/meu-financeiro`, `app/(documento)/recibo/` |
| Direitos do titular (LGPD) | `lib/titular/`, `app/api/meus-dados`, `app/api/cron/titular`, `app/(legal)/` |
| Red flags e suspensão | `lib/actions/suspeitas.ts`, `components/flags-pessoa.tsx`, `components/sinalizar-servico.tsx`, migrations 0052–0055 e 0058 |
| Pix | `lib/pix/static-qr.ts`, `components/pix/`, migration 0056 |
