# Handover — Me Ajuda Aí

Este arquivo existe pra uma sessão nova (modelo diferente, ou uma continuação depois de um tempo parado) retomar sem perder contexto. Leia nesta ordem: **este arquivo** → [ROADMAP.md](./ROADMAP.md) §0 (auditoria — o que falta, sempre atualizada) → [CLAUDE.md](./CLAUDE.md) (convenções e comandos).

Última atualização: **11/09/2026, madrugada** — sessão do Opus 5 como *controller* (executores Sonnet): vistoria dos 9 agentes; **Fatias 1, 3 e 2 entregues**; anúncios do prestador (a ação v2 do Administrador), Hero novo, cadastro, agenda e faturamento por tipo pedidos ao vivo pelo Leonardo; começo da Fatia 4. A seção logo abaixo é desta sessão; o resto do arquivo é da sessão de 09/09 e continua valendo.

---

## Sessão de 10/09 — vistoria e Fatia 1

**Vistoria.** Nove agentes (do projeto, do Mirante dos Dados e do AgentSpec) deram nota ao app: **48/100**. Pareceres, métricas e 101 telas "antes" em [`cvg/brain/refs/2026-09-10-vistoria/`](./cvg/brain/refs/2026-09-10-vistoria/README.md). Leonardo: *"Faça todas as recomendações destes agentes."* Viraram 5 fatias ([decisão](./cvg/brain/decisions/2026-09-10-vistoria-em-fatias.md)); o design "feio" é a **Fatia 3**, ainda não começada.

**Fatia 1 — entregue.** Spec assinado ([`fatia-1-seguranca.md`](./cvg/docs/tech-spec/fatia-1-seguranca.md)), ADRs 0010–0017, 12 task-specs em `cvg/tasks/done/`, migrations **0038–0041** aplicadas e trancadas na cerca. Fechou: serviço forjado/auto-confirmado (regra no banco), contato e endereço só entre as partes de serviço ativo, contas de exemplo presas ao mundo de exemplo, ninguém vira Administrador sozinho, SysAdmin cria praça e vincula Administrador (`/admin/pracas`), seletor só com 2+ praças, módulos por empresa, login sem senha guardada, convite neutro, cron/geocode contra abuso, botão "Marcar como realizado".

**Como a Fatia 1 foi executada (D-026, D-027) — use o mesmo molde nas próximas:**
1. O controller escreve os **gabaritos antes** (`tests/fatia1/`), o executor não os edita.
2. `taskspec handoff` → um agente **Sonnet** implementa no checkout principal, sem commitar.
3. O controller revisa o diff — e achou coisa em quase toda tarefa: re-vínculo de serviço a outra pessoa (T1), vínculo de praça não atômico e responsável da praça (T5), teste antigo exigindo o defeito (T7), mensagem no campo de erro (T9).
4. `cvg verify --judge gemini` (tier 2, família independente) → `taskspec accept --stamp` → `transition done` → commit (com a migration nova na cerca do `.cvg/gate.yaml`).

**Variáveis que o Task-Spec precisa neste repositório** (o backlog mora em `cvg/tasks`, não em `tasks/`):
```bash
export TASKSPEC_BACKLOG_DIR=C:/Users/leoch/projects/meajudaai/cvg/tasks
export TASKSPEC_WORKSPACE_ROOT=C:/Users/leoch/projects/meajudaai   # sem isto os evals rodam dentro de cvg/
export TASKSPEC_ACCEPTANCE_DIR=C:/Users/leoch/projects/meajudaai/.taskspec/acceptance
export GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' .env.local | cut -d= -f2-)
export GEMINI_MODEL=gemini-3.6-flash   # o modelo padrão do CLI vive sobrecarregado (503) e o juiz estoura o tempo
```

**Consertos de ferramenta no Windows** (reaplicar se reinstalar): `verify-work.py` do Converge nos dois tool homes (D-029); `src/dispatch/handoff.py` do Task-Spec **fora do repositório** (`~/.local/share/task-spec/3.8.0`, usa `shutil.which("bash")` — o `bash` puro achava o do WSL). O Pass 7 (`cvg bind`) ficou de fora (D-029).

**Testes agora (11/09, madrugada):** `npm test` (unidade, sem banco — 344 verdes); `RUN_INTEGRATION=1 npx vitest run --config vitest.integration.config.ts tests/fatia1 tests/fatia2 tests/anuncios tests/agenda tests/faturamento` (banco real — 174 verdes em 25 arquivos; `npm run test:integration` inteiro ainda tem o vermelho antigo do banner do SysAdmin, ADR 0009); `bash scripts/regressao/rodar-fatia1.sh` (build de produção + 10 passos no Chrome, **10/10**, o cancelamento sem o aviso do D-031). **Não rode o build com o `next dev` no ar no mesmo checkout** — os dois escrevem em `.next`.

**Achados que ficaram para depois** (também no ROADMAP §0):
- **D-031** — cancelar serviço às vezes deixava o botão em "Cancelando…". Mitigado na Fatia 4: o motivo vai num formulário inline (sem `prompt`), a tela mostra "Serviço cancelado." assim que a action responde e, se a resposta se perder, recarrega sozinha em 10 s. A causa de fundo (a resposta da server action cancelada no navegador) não foi isolada.
- ~~**"Localizar" no cadastro** exige login~~ — resolvido na Fatia 2 (lote 2C): a busca de endereço aceita visitante, com limite de 10 por minuto por IP.
- **D-030** — não registrar o auth hook antes de escopar as cláusulas de SysAdmin pela marca de exemplo; senão a conta de exemplo, aberta por qualquer visitante, ganha o banco inteiro (liga com o ADR 0009 e a D-014).

**Fatia 3 (redesign) — entregue no mesmo dia, em lotes (D-032).** Leonardo achou a Fatia 1 lenta e escolheu o redesign em seguida; por ser só UI, rodou sem task-spec por tarefa: 4 lotes de executor Sonnet (A fundação → B casca e Início, C landing, D seletor de horário e formulários, os três em paralelo), cada um com tier 2 do Gemini (`revisar-lote.sh` no scratchpad reproduz o prompt do `verify-work.py`), build, testes e a regressão 10/10. Antes e depois: https://claude.ai/code/artifact/659e94e2-1d1f-4cc7-8502-38dbb2f94906. **Armadilha:** o `isolation: "worktree"` do Agent tool cria a worktree a partir de `main` (a v1) — para lotes em paralelo, crie a worktree você mesmo a partir do branch atual e ligue o `node_modules` por junção (`New-Item -ItemType Junction`).

~~Pendência de produto: qual é a ação v2 do Administrador~~ — respondida pelo Leonardo em 10/09 (D-034): os anúncios da praça (ver abaixo).

Leonardo aprovou o redesign pedindo só o rodapé colado no fim da tela (coluna `min-h-dvh` + `<main>` com `flex-1` nos três layouts; no celular, uma faixa da cor do rodapé reserva a nav fixa).

**Fatia 2 (vitrine v2 e LGPD) — mesmo formato de lotes (D-032/D-033).**
- **2A:** privacidade e termos reescritos para a v2; encarregado e canal: `leochalhoub@hotmail.com` (`lib/contato.ts`).
- **2C:** Poppins por `next/font` (sai o Google Fonts do navegador), clima do Hero no servidor (`/api/clima`, cache de 30 min), aviso de cookies informativo ("Entendi" — o app só usa cookie essencial), Open Graph, `robots` e `sitemap`, "Localizar" sem login e seed sem fotos de banco de imagens.
- **2B:** direitos do titular (D-023). Tem "Baixar meus dados" (`/api/meus-dados`, JSON de quem está logado) e "Excluir meus dados": o pedido tem 7 dias para desistir, e um cron diário (`/api/cron/titular`) anonimiza os vencidos e expurga `login_logs` com mais de 180 dias. A anonimização nunca apaga a pessoa do Auth (a cascata levaria o histórico da outra parte): troca o e-mail e a senha, bane a conta, limpa os dados, apaga a foto e cancela os agendamentos futuros avisando a outra parte. A tela `/admin/pedidos-de-exclusao` é do SysAdmin.
- **Revisão do controller → migration 0043:** a carência de 7 dias ficou travada por gatilho (antes, uma chamada direta à API pulava). O perfil ganhou o estado `removido`. A busca e a reserva passaram a exigir prestador com a conta ativa (antes, inativo e bloqueado apareciam e podiam ser reservados).
- **Gabaritos:** `tests/fatia2` tem 14 casos, todos verdes. O Gemini julgou 2B e 2C UPHELD.
- **Cota do Gemini:** o nível gratuito dá 20 pedidos por dia por modelo. Na noite de 10/09 esgotaram `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-flash-latest` (que aponta para o 3.8) e `gemini-3-flash-preview`; o `gemini-2.5-flash` ainda respondia. O `revisar-lote-debug.sh` mostra o erro (o `revisar-lote.sh` o engole e devolve vazio). O script também aceita `JUIZ=grok`, mas só depois que o Leonardo puser `XAI_API_KEY` no `.env.local`.

**Pedidos do Leonardo ao vivo (10/09, noite) — decisões D-034 a D-039.** Tudo em lotes paralelos com worktree própria e gabarito escrito antes pelo controller (commitado no branch do lote; o `main` do trabalho nunca fica com teste vermelho), Gemini em cada lote (todos UPHELD) e prints:
- **Anúncios do prestador (D-034, migrations 0044/0045):** serviço ou "Necessita-se ajudante!" (vaga para ajudante sem conta, com WhatsApp). Até X ativos: ajuste do prestador → padrão da praça da cidade dele (mesmo mundo exemplo/real) → 3. Telas: `/anuncios` do prestador (lote A2), mural público em carrossel e vitrine na página inicial (A3; `scripts/seed-anuncios.mjs` semeia 4 prestadores de exemplo e 11 anúncios), Início do Administrador virou **Painel da praça** com limite padrão, ajuste por prestador e tirar do ar (A4 — Mapa/Financeiro/Relatórios eram só v1 e saíram do menu dele; as páginas existem). Conta de exemplo não publica nem tira do ar (o mural é público).
- **Hero novo (D-035):** saudação grande, frases de volta (`lib/citacoes.ts`, "Outra frase"), relógio grande, tempo agora e 4 dias. Feito pelo controller.
- **Fotos (D-036):** nenhuma conta sem foto — retrato público do randomuser.me pelo gênero (`lib/foto-aleatoria.ts`, `scripts/fotos-publicas.mjs`); cadastro com foto opcional.
- **Cadastro (D-039, lote C1):** duas colunas no notebook, mapa sempre visível e obrigatório, confirmação de senha com olhinho (também no login e na nova senha), máscara do telefone à mostra, campo "Gênero". Endereço e mapa no perfil também para o Administrador (lote 2D). Login respeita `?next=` (só caminho interno, `lib/destino-seguro.ts`).
- **Agenda (D-038, lote G1 + migrations 0046/0048):** o dia mostra a faixa aberta em azul com a legenda "Agenda aberta das X às Y" (sem o "Livre" que mentia); "Agendas abertas" em cartões com X vermelho para fechar (não fecha com serviço agendado). Serviço cancelado libera o horário (supera o ADR 0017) e a corrida da reserva segue travada pelo índice.
- **Tipos de serviço e faturamento (D-037, migration 0047, lote F1):** seis tipos, o cliente escolhe ao agendar e o prestador recategoriza; gráfico empilhado por tipo com filtro (15 dias padrão, 30, 60, 90, este ano, último ano), agrupado por semana, card no hover com tipos em ordem alfabética e por dia.
- **Fatia 4 adiantada:** sessão memoizada (`cache` em `getCurrentUser`), fuso de São Paulo no servidor (`lib/datas.ts`), D-031 mitigado, horário cancelado liberado, classes de componente do CSS na camada certa do Tailwind (utilitários voltam a valer).

**Madrugada de 11/09 — mais pedidos ao vivo (D-040 a D-043):**
- Página pública do prestador `/p/[id]` sem login (0049) — o "Ver agenda" da vitrine leva para lá; painel da plataforma do SysAdmin (lote S5).
- Agenda: período preferido no pedido (0050) e hora combinada da visita (0051).
- Suspeitas e sinalizações nas duas direções, com aprovação do Administrador, bandeiras com hover e suspensão com aviso formal (0052–0055, lote F5). Aba **Serviços** do prestador com "Flag Pilantra" no serviço.
- Clientes: cartão com próximo agendamento e último serviço; endereço, mapa e compartilhar no detalhe.
- Pix: várias chaves (0056), QR grande com "Me Ajuda Aí"/nome/data/valor no meio (jsQR confere a leitura), compartilhar no WhatsApp, cobrança avulsa no perfil.
- Hero: tempo não vaza; faixa recolhida com os próximos dias; blocos de espera somem se o clima falhar.

**Próximo passo:** a leitura do QR por um app de banco real (ROADMAP §16.5), o que sobra da Fatia 4 (zod + `useActionState` nos formulários da agenda, testes de integração das actions, a causa de fundo do D-031) e a comissão da plataforma (bloqueada por decisões do Leonardo).

---

## O que mudou de estrutural nesta sessão: o projeto agora roda sob Converge

O trabalho deixou de ser "implementar o que o Leonardo pediu" e passou a seguir uma cadeia de nove passes com gates executáveis. Isso muda como uma sessão nova deve trabalhar:

- **A fonte de intenção continua sendo o [ROADMAP.md](./ROADMAP.md)** (é o BRD).
- **A fonte de requisito** virou [`cvg/docs/tech-spec/fechar-v2-marketplace.md`](./cvg/docs/tech-spec/fechar-v2-marketplace.md) — assinado `canonical`, 36 requisitos com id estável (`R-n`), cada um falsificável.
- **A fonte de terreno** são os 9 ADRs em [`cvg/docs/adrs/`](./cvg/docs/adrs/) — fatos medidos contra o banco real, não presumidos de documento.
- **O vocabulário canônico** está em [`cvg/docs/CONTEXT.md`](./cvg/docs/CONTEXT.md). Use os termos de lá; não invente sinônimo.
- **O plano de construção** são as 6 raias em [`cvg/swimlanes/`](./cvg/swimlanes/), com 24 legs.

### Comandos que você vai precisar

```bash
cvg doctor          # prontidão do adversário do Pass 4
taskspec doctor     # prontidão do engine de Task-Spec
cvg review --check --dir cvg/swimlanes   # gate de consenso do Pass 4
npm run test:coverage        # cobertura de lib/ inteiro
npm run test:coverage:puro   # cobertura só da lógica pura
```

### Armadilhas de ambiente já resolvidas (não repita o diagnóstico)

Nada disso estava no PATH do MSYS e tudo é exigido pela cadeia. Há shims em `~/bin`:
`python3` (com `PYTHONUTF8=1` — sem isso o Python do Windows estoura `UnicodeEncodeError` em qualquer `→` dos scripts do Converge), `node`, `npm`, `npx`, `shellcheck`, `gemini`, `claude`, `cvg`, `taskspec`.

**`.agents/` não é espelho descartável.** O CLI `cvg` procura o tool home testando `.agents` **antes** de `.claude`, então é de lá que ele executa. Patch em `.claude/skills/` sozinho não tem efeito. Os dois precisam ficar em sincronia.

---

## Decisões travadas — o que está fechado

Todas em [`cvg/docs/tech-spec/_decisoes-travadas.md`](./cvg/docs/tech-spec/_decisoes-travadas.md), com o porquê de cada uma.

**Do Leonardo (D-001 a D-009):**

1. **Workspace virou praça.** A decisão que destravou a tensão aberta na §0 desde o pivô. Não é "uma empresa dentro do app" — é um **tenant de praça**: uma instalação por cidade, com nome próprio. *"Podemos deployar em Niterói com um nome e em Maceió com outro. O workspace deve ser respeitado."*
2. Prestador **e** cliente pertencem a uma praça, com **isolamento total** — cliente de Niterói nunca vê prestador de Maceió.
3. A pessoa entra na praça **pela instalação**, sem escolher.
4. Escopo do ciclo: **todo o backlog da §0 + a comissão**, menos o que está bloqueado por fator externo (Telegram, por credencial).
5. Pronto = a jornada ponta a ponta roda **sem intervenção manual no banco**.
6. Dataset refeito: ≥24 meses até dez/2026, futuros ≤6 meses.
7. Comissão: a dívida nasce quando o serviço vira **`realizado`** — *"é um evento que confirma Valor"*.
8. Inadimplência: avisos diários + e-mail, **suspensão no 3º dia**, com canal pro Administrador.
9. Alíquota em **4 níveis**: serviço → categoria → prestador → praça.
10. **Cobertura: meta 100%**, em duas medidas separadas.

**Minhas, tomadas enquanto ele dormia (D-010 a D-012)** — confira estas primeiro:

- **D-010** — Praça não tem dono pessoa física. `workspaces.owner_id` passa a significar *administrador responsável*. Reverter custa uma migration.
- **D-011** — SysAdmin é **supra-praça**, não recebe praça. Reverter custa uma linha no backfill.
- **D-012** — A instalação declara sua praça por **variável de ambiente**. Reverter custa trocar a resolução num ponto só.

---

## O que o Pass 2 mediu — e corrigiu de premissa

Três coisas que estavam sendo assumidas erradas, medidas contra o banco real:

1. **O papel `ajudante` já não existe** desde a migration `0022`. O `DESIGN_MEAJUDAAI_V2.md` diz "65 arquivos, refactor grande" — está velho. São 8 ocorrências do literal de papel; os 57 arquivos são a coluna `ajudante_id` do subsistema de vagas. **Onde aquele documento contradisser os ADRs, valem os ADRs** (ADR 0008).
2. **O dataset já tem 35,3 meses de amplitude** — acima dos 24 pedidos. O defeito é **densidade** (~1,4 horário/mês) e não alcançar dezembro/2026. Gerar mais passado seria esforço no eixo errado (ADR 0007).
3. **`login_logs` grava sim** — 11 linhas. A suspeita do ROADMAP §0 está resolvida; R-29 virou verificação, não construção.

E o achado mais sério: **`profiles_select_all` usa `using (true)`** e nunca foi substituída em 37 migrations. Hoje qualquer autenticado lê todos os perfis. Isolar por praça não é "ajustar consulta", é trocar a política de leitura da tabela mais central do produto (ADR 0002).

---

## Pass 4 — o que o adversário encontrou

Gemini (família google, cross-family de verdade) atacou os 31 arquivos de plano. Veredito **REVISE**, 6 objeções. Duas valem destaque porque mudam construção:

- **C2 (CRITICAL)** — "decidido no servidor" era ambíguo e perigoso. Neste produto o navegador fala **direto** com o banco usando chave pública: qualquer filtro em camada de aplicação é contornável por fora. A fronteira precisa morar na **política da própria tabela**. O plano foi reescrito e ganhou um critério de aceite que testa chamada feita por fora da aplicação.
- **H1 (HIGH)** — sem atomicidade entre "serviço virou realizado" e "dívida criada", nascem **serviços fantasma**: executados, e cobrados de ninguém. O vazamento é silencioso porque ninguém reclama de uma cobrança que não veio.

Uma objeção (M1) tinha **premissa falsa** e eu verifiquei antes de aceitar: o gatilho periódico já existe (`vercel.json` + `CRON_SECRET`, em uso para lembretes de avaliação).

---

## O que a noite produziu de concreto (não só documento)

- **Os 22 testes de permissão saíram de desligados para 21/22 verdes.** Eles já
  existiam escritos e nunca rodavam. `npm run test:integration`. A limpeza
  funciona: zero resíduo no banco depois (conferido).
- **A única linha vermelha revelou um defeito real de segurança — [ADR 0009](./cvg/docs/adrs/0009-o-god-mode-de-sysadmin-nas-policies-esta-inerte.md).**
  As policies perguntam `current_app_role() = 'sysadmin'`; essa função lê um claim
  de JWT que só existe se o auth hook estiver registrado no painel — e nunca foi.
  Sem o claim ela cai no default `'ajudante'`, papel que não existe mais. **45
  cláusulas de policy dependem disso**, em 17 migrations. Verificado direto: o
  SysAdmin real loga, o JWT vem sem `app_role`, e ele lê **0 linhas** de uma
  tabela que deveria ver inteira. O app disfarça porque tem fallback próprio.
- **As amostras do spike do QR estão prontas pra escanear** —
  `design/spike-qr/index.html`. É o primeiro item do programa e depende de você
  com o celular.
- **R-33 fechado: 100% de cobertura de linha e de função na lógica pura de
  `lib/`** — de 29,16% para 100%, com branches em 97,2%. É um requisito `must`
  do tech-spec assinado, e era o único caminho de progresso que não dependia da
  raia praça: função pura não fala com banco, não é superfície, e não pode
  nascer vazando. **248 testes unitários** (eram 58 quando a sessão começou).
  Entre eles, a autorização por módulo que o ROADMAP §4 marca como
  não-negociável, e a regra que torna as contas públicas de demonstração
  seguras — ambas estavam em 0%.
- Rodapé com créditos e versão, correções da agenda, medição de cobertura
  instalada (`npm run test:coverage` e `test:coverage:puro`).

## Duas coisas que eu decidi NÃO fazer, e por quê

**Não registrei o auth hook** que consertaria o ADR 0009, mesmo tendo o token de
gestão pra isso. Registrar um auth hook muda como **todo** JWT do projeto é
emitido; se sair errado, ninguém entra no app — e você descobriria acordando com
o produto fora do ar. O achado é a parte valiosa e está registrado; a correção
espera você (D-014).

**Não alarguei a cerca de escrita** do `.cvg/gate.yaml`, que protege
`**/migrations/**` e `**/auth/**` — justamente os caminhos que a raia fundação
precisa. O arquivo diz, na primeira linha, que essa revisão é de quem responde
pelo repositório (D-013).

**Consequência honesta das duas:** a ordem de construção que o próprio plano
estabeleceu diz que nenhuma superfície nova deve nascer antes da fronteira de
praça existir — *"senão a superfície nasce vazando"*. E a fronteira precisa de
migration. Então o próximo passo executável do programa **exige você na
cadeira**. Eu não fui adiante construindo coisa fora de ordem só para ter o que
mostrar: seria desfazer amanhã o que eu fizesse hoje.

## Onde parou

A cadeia está no **Pass 4**, com as objeções corrigidas nos planos. O gate de consenso exige que os planos atacados sejam byte a byte os planos vivos (anti-spoof), então afiar os planos obriga a re-rodar o adversário — é o ciclo previsto, não um erro.

**Próximo passo:** fechar o gate do Pass 4 e descer para o **Pass 5** (Task-Specs assinados, um eval por task), depois **Pass 7** (contrato de runtime) e **Pass 8** (o loop de execução).

**A ordem de construção não é a ordem de dependência.** O primeiro leg do programa inteiro é `swimlane-jornada-leg-01`: o spike que descobre se um código de cobrança com dados no centro ainda é lido por app de banco. Se falhar, R-14 e R-15 mudam de forma e a raia comissão muda junto — e descobrir isso depois de construir a cobrança seria o desperdício mais caro deste programa.

---

## Pendências que continuam abertas

- **Telegram** — bloqueado nas credenciais do bot. Declarado `wont` neste ciclo (W-1).
- **Hero "feio"** — deliberadamente **não** virou requisito. Sem direção concreta não é falsificável, e a regra do Pass 1 é que requisito que não dá pra avaliar vai pro registro de lacunas. Está como GAP-002, esperando uma conversa de design.
- **C1 do Pass 4** — a base é compartilhada, então **uma pessoa não pode existir em duas praças com o mesmo e-mail**. Declarei isso como restrição explícita; falta o Leonardo confirmar que serve por enquanto.
- GAP-001, 003, 004, 005, 007 do tech-spec — todas `minor`, todas com padrão assumido e dono nomeado.

---

## Acesso e credenciais — o que NÃO está neste repositório

- **Conta real de SysAdmin do Leonardo**: passada verbalmente, não está em arquivo nenhum por design.
- **`SUPABASE_TOKEN`** em `.env.local`: Personal/Management API Token, autorizado pra uso livre neste projeto.
- **`GEMINI_API_KEY`** em `.env.local`: usada só pelo Gemini CLI como adversário do Pass 4. Sem ela o `cvg doctor` volta a FAIL.
- **Contas de exemplo** (dados fake): `lib/auth/contas-exemplo.ts`, senha `MeAjudaAi2026!`.

---

## Convenções que valem a pena internalizar antes de mexer em UI

- `lib/papel-label.ts` e `lib/saudacao.ts` seguem a regra de 3 formas (masculino/feminino/neutro-com-"e"). Texto novo que mencione papel usa `papelLabel`, nunca string fixa.
- Server Component não passa função como prop pra Client Component — passe dados serializáveis + uma prop `variant`.
- Nunca expor `profile_local.lat`/`lng` fora de RLS restrita. Endereço **de um serviço** é diferente: vive em `servicos.endereco/lat/lng` porque `servicos` já tem RLS restrita às partes.
- Popover perto de mapa Leaflet: `z-[1000]+` (Leaflet usa panes ~200-650).
- Cards de lista: `rounded-xl border border-line bg-card px-3 py-2.5`, status como pílula colorida, nunca o `.card` genérico.
- Horário livre na agenda **não é clicável** — não há serviço pra abrir.
- Todo texto do produto em PT-BR; comentários de código também.
