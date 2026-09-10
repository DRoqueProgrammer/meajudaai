# Handover — Me Ajuda Aí

Este arquivo existe pra uma sessão nova (modelo diferente, ou uma continuação depois de um tempo parado) retomar sem perder contexto. Leia nesta ordem: **este arquivo** → [ROADMAP.md](./ROADMAP.md) §0 (auditoria — o que falta, sempre atualizada) → [CLAUDE.md](./CLAUDE.md) (convenções e comandos).

Última atualização: **09/09/2026, madrugada** — sessão do Opus 5 que instalou o Converge e desceu a cadeia até o Pass 4. Leonardo foi dormir no meio e pediu: *"tome as melhores decisões por mim, vá até o final."* Tudo que eu decidi sozinho está marcado como **meu** e listado abaixo, pra auditoria.

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
