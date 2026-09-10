# Tech-spec — Fatia 1 · Fechar os riscos de segurança da vistoria

> Converge Pass 1 (Intent) · 10/09/2026 · lane **NORMAL** (1 → 2 → 5 → 7 → 8), verificação
> independente de tier 2 obrigatória (`cvg lane`: piso por login e migration).
> **Origem:** o pedido do dono em 10/09/2026 — *"Vamos melhorar. Faça todas as
> recomendações destes agentes."* — sobre a vistoria de 10/09
> ([`cvg/brain/refs/2026-09-10-vistoria/`](../../brain/refs/2026-09-10-vistoria/README.md)),
> com o "SIM" dele para começar pela segurança. Contexto do produto: [ROADMAP.md](../../../ROADMAP.md).
> **Decisões que sustentam este spec:** D-015 a D-021 em [`_decisoes-travadas.md`](./_decisoes-travadas.md).
> **Por que fatia:** [`cvg/brain/decisions/2026-09-10-vistoria-em-fatias.md`](../../brain/decisions/2026-09-10-vistoria-em-fatias.md).
> **Ids:** continuam a numeração do spec [`fechar-v2-marketplace.md`](./fechar-v2-marketplace.md) (R-37 em diante, GAP-008 em diante) para nenhum id colidir entre fatias.
> **Altitude:** o quê e quão bem. Nenhuma tecnologia é escolhida aqui.

## TL;DR

Fechar os três riscos de segurança que a vistoria confirmou no código, e os vizinhos
deles, antes que o app receba qualquer pessoa real — mantendo as contas de exemplo
de um clique que o dono usa para mostrar o protótipo.

**Resultado esperado (outcome):** hoje um cliente qualquer consegue ler o contato e o
endereço de qualquer prestador, qualquer visitante vê como SysAdmin os dados de todo
mundo, e qualquer pessoa pode se tornar Administrador. Ao fim desta fatia, cada uma
dessas portas está fechada, provada por um teste que ataca de fora da aplicação; o
SysAdmin passa a ser quem cria praças e nomeia Administradores; e nenhuma jornada que
funcionava deixa de funcionar.

## Problema restatado (Problem restated)

O banco do Me Ajuda Aí confia na tela: as regras de negócio do agendamento vivem só no
código da aplicação, e o banco aceita qualquer escrita de quem está logado desde que
ele diga ser a parte certa. Como o navegador fala direto com o banco, um cliente pode
inventar um serviço "já realizado" com qualquer prestador e, a partir daí, ler o
telefone, o e-mail, a chave de recebimento e o ponto exato dele — e ainda inflar a
reputação pública do prestador. As contas de exemplo que a landing oferece em um clique
são contas de verdade: a de SysAdmin enxerga os registros de acesso e os dados de todo
mundo, não só os de exemplo. E o cadastro público aceita criar Administrador, o que,
somado a uma liberação de módulos que não olha a empresa, deixa uma pessoa abrir telas
de outra empresa; do outro lado, o SysAdmin não tem como criar uma praça nem nomear
quem a administra. Hoje os dados são de exemplo; no dia em que houver gente de verdade,
isso é incidente de dado pessoal. Resolvido, da cadeira do dono: nenhuma dessas portas
abre, há um teste para cada uma, a demonstração em um clique continua de pé para os
cinco papéis, o SysAdmin governa praças e Administradores, e o app continua fazendo tudo
o que já fazia.

## Escopo (Scope)

### Dentro (in scope)

- **Nascimento e ciclo de vida do serviço** — só pelo fluxo de reserva e pelas
  transições permitidas a cada papel; o contador público só se move pelo fluxo.
- **Quem vê contato, local exato e endereço de quem** — só as partes de um serviço
  válido.
- **Contas de exemplo** — as cinco continuam em um clique, presas ao mundo de exemplo.
- **Praças e Administradores** — Administrador nasce só por ação do SysAdmin; o SysAdmin
  cria praças e vincula Administradores a elas.
- **Liberação de módulos** — presa à empresa que liberou.
- **Senha no aparelho** — o app não guarda.
- **Vizinhos de baixo custo** — convite que não revela conta e as duas proteções baratas
  contra abuso (agendador e busca de endereço).
- **Testes de ataque permanentes** e roteiro de regressão das jornadas.

### Fora (out of scope)

- **Leitura global de perfis** (ADR 0002) e o **isolamento completo por praça** — dependem
  da fronteira de praça; ficam na Fatia 5, que emenda o programa "Fechar a v2".
- **Registrar o gancho de papel no token** (ADR 0009) — decisão D-014 ainda pendente;
  fica na Fatia 5.
- **Textos legais, encarregado e direitos do titular** — Fatia 2.
- **Corrida da reserva e fuso horário** — são corretude da agenda, não controle de
  acesso; Fatia 4.
- **Qualquer mudança visual além do necessário para os botões e o seletor** — Fatia 3.

## Requisitos (Requirements)

Prioridade: `must` só para o que o resultado declarado falha sem. "Fora da aplicação"
= um usuário autenticado falando direto com o banco pelos mesmos meios que o navegador
usa, sem passar pelas telas.

### Serviço: nascimento, ciclo de vida e reputação

- **R-37 (must)** — Um serviço só nasce do fluxo de reserva: no estado "pendente",
  sobre um horário livre, que pertence ao prestador indicado, com o preço vigente no
  perfil desse prestador. *Verificável:* 4 tentativas forjadas por um cliente fora da
  aplicação — serviço já "realizado", horário ocupado, prestador diferente do dono do
  horário, preço diferente do perfil — são recusadas em 4 de 4; a reserva normal pela
  aplicação segue funcionando em 1 de 1.
- **R-38 (must)** — O estado de um serviço só muda pelas regras do papel: só o
  prestador confirma, só o prestador marca realizado, cancelar exige motivo, e um
  serviço realizado ou cancelado não muda mais. *Verificável:* cada transição
  proibida — cliente confirmando, cliente marcando realizado, cancelamento sem motivo,
  reabertura de realizado ou cancelado — é recusada fora da aplicação em 100% das
  tentativas.
- **R-39 (must)** — O contador público de serviços realizados de um prestador só se
  move por serviços que percorreram o fluxo. *Verificável:* depois das 4 tentativas
  forjadas do R-37, o contador de cada prestador-alvo varia 0.

### Quem vê o quê de quem

- **R-40 (must)** — Telefone, e-mail, chave de recebimento e ponto exato de uma
  pessoa só são visíveis para quem tem com ela um serviço pendente, confirmado ou
  realizado; serviço cancelado não libera (D-017). *Verificável:* sem serviço, ou só com
  serviço cancelado, a leitura desses dados da outra pessoa devolve 0 registros; com
  serviço pendente, confirmado ou realizado, devolve 1.
- **R-41 (must)** — O endereço escrito de uma pessoa segue a mesma regra do ponto
  exato: deixa de ser legível por qualquer usuário autenticado. *Verificável:* um
  usuário sem serviço válido com a pessoa lê 0 endereços dela; a própria pessoa e a
  outra parte de um serviço válido leem 1.

### Contas de exemplo

- **R-42 (must)** — As contas de exemplo continuam sendo cinco, uma por papel, com
  entrada pelos botões da landing (D-015) — e cada uma só enxerga e altera o mundo de
  exemplo. *Verificável:* com uma pessoa que não é de exemplo presente na base, as
  telas da conta de exemplo SysAdmin e da conta de exemplo Administrador listam 0
  registros dela (acessos, contato, serviços, usuários), e tentativas dessas contas de
  desativar, mudar o papel ou editar uma conta que não é de exemplo são recusadas em
  100%; a landing continua com 5 botões de entrada, 1 por papel, e os 5 entram.
- **R-43 (should)** — A senha das contas de exemplo só existe no servidor.
  *Verificável:* 0 ocorrências dela no conteúdo enviado ao navegador em qualquer página.

### Praças e Administradores

- **R-44 (must)** — Ninguém se torna Administrador por conta própria: o cadastro público
  oferece só Cliente e Prestador de Serviço, e a troca de papel não leva a Administrador
  (D-016). *Verificável:* cadastro com papel administrativo forjado é recusado em 100%;
  troca de papel para Administrador é recusada em 100%; administradores já existentes
  continuam entrando (0 contas administrativas perdem acesso).
- **R-45 (must)** — A liberação de um módulo para um funcionário vale só dentro da
  empresa que a liberou, e só para quem é membro dela. *Verificável:* liberação feita
  pelo dono de outra empresa é recusada em 100%; um módulo liberado na empresa B abre
  0 telas com dados da empresa A.
- **R-46 (must)** — O SysAdmin cria uma praça nova pela própria área dele. *Verificável:*
  hoje 0 caminhos na interface; alvo 1 ação de criar, e a praça criada aparece na lista
  do SysAdmin logo em seguida; criação de praça por qualquer outro papel é recusada em
  100%.
- **R-47 (must)** — Só o SysAdmin vincula um Administrador a uma ou mais praças, e todo
  vínculo tem uma praça padrão escolhida por ele (D-016). *Verificável:* tentativa de
  vínculo por qualquer papel que não seja SysAdmin é recusada em 100%; um Administrador
  recém-vinculado a 1 praça entra direto nela; um Administrador sem praça padrão
  definida não existe (contagem 0).
- **R-48 (must)** — Um Administrador enxerga só as praças às quais o SysAdmin o vinculou.
  *Verificável:* vinculado a 1 praça, lista 1; vinculado a 2, lista 2; praças não
  vinculadas aparecem 0 vezes.
- **R-49 (must)** — Com uma praça só, o Administrador não vê seletor de praça.
  *Verificável:* com 1 praça, 0 seletores na tela; com 2 ou mais, 1 seletor.

### Credenciais e vizinhos de baixo custo

- **R-50 (must)** — O app não guarda senha no aparelho: a opção "lembrar" guarda só o
  e-mail, e salvar senha fica a cargo do gerenciador do próprio navegador (D-018).
  *Verificável:* depois de um login com a opção marcada, o armazenamento do navegador
  contém a senha 0 vezes e o e-mail 1 vez.
- **R-51 (should)** — Convidar alguém para a equipe não revela se um e-mail tem conta.
  *Verificável:* a resposta ao convite é idêntica, em texto, para um e-mail cadastrado
  e para um não cadastrado (2 de 2 iguais).
- **R-52 (could)** — As duas portas automáticas resistem a abuso barato: a chave do
  agendador é conferida sem vazar, pelo tempo de resposta, quantos caracteres acertou;
  a busca de endereço aceita no máximo 10 pedidos por pessoa a cada 60 segundos.
  *Verificável:* o 11º pedido em 60 s é recusado; a conferência da chave leva o mesmo
  tempo para chave certa e errada de mesmo tamanho (diferença abaixo do ruído de
  medição em 1.000 repetições).

### Prova

- **R-53 (must)** — Cada caminho de ataque desta fatia vira um teste permanente, que
  falha com a regra antiga e passa com a nova. *Verificável:* pelo menos 1 teste por
  requisito — R-37, R-38, R-39, R-40, R-41, R-42, R-44, R-45, R-46 e R-47 (10 caminhos) —
  na suíte que fala com o banco, todos verdes; cada um falha quando a regra
  correspondente é removida.
- **R-54 (must)** — Nenhuma jornada que funcionava quebra. *Verificável:* roteiro no
  navegador com as contas de exemplo — cliente reserva, prestador confirma, prestador
  marca realizado, cliente cancela outro serviço com motivo, prestador vê o WhatsApp do
  cliente do serviço, e cada um dos 5 botões da landing entra no seu papel — 10 de 10
  passos OK depois da fatia.

### Exclusões declaradas

- **W-4 (wont)** — Leitura global de perfis: 0 mudanças nesta fatia; é da fronteira de
  praça (Fatia 5).
- **W-5 (wont)** — Gancho de papel no token: 0 mudanças nesta fatia (D-014 pendente).
- **W-6 (wont)** — A conta de desenvolvimento que aparece na busca continua ativa, por
  decisão do dono (D-019): 0 mudanças nela.

## Métricas de sucesso (Success metrics)

O KPI do dono é o da própria vistoria: o app só recebe gente real com os riscos
confirmados fechados — sem perder a demonstração em um clique.

| Métrica | Hoje | Alvo |
|---|---|---|
| Riscos de segurança confirmados em aberto | 3 (medido na vistoria, conferido na fonte) | 0 |
| Caminhos de ataque cobertos por teste permanente | 0 | ≥ 10 |
| Registros de pessoas que não são de exemplo visíveis à conta de exemplo SysAdmin | todos | 0 |
| Formas de alguém virar Administrador sozinho | 2 (cadastro público, troca de papel) | 0 |
| Caminhos para o SysAdmin criar praça na interface | 0 | 1 |
| Seletor de praça exibido a um Administrador com 1 praça | sim | não |
| Senha guardada no navegador depois do login | sim, em texto puro | 0 ocorrências |
| Achados CRÍTICOS nas lentes supabase-specialist e code-reviewer, na re-vistoria | 2 | 0 |
| Botões de conta de exemplo na landing que entram no papel certo | 5 de 5 | 5 de 5 |

## Dados nomeados (Data named)

- **Serviço** — estado, horário de origem, prestador, cliente, preço, motivo de
  cancelamento.
- **Horário oferecido** — dono, estado (livre, pendente, confirmado).
- **Pessoa** — papel, contato (telefone, e-mail), chave de recebimento, ponto exato,
  endereço escrito, estado da conta, e se é **pessoa de exemplo** (parte do mundo de
  demonstração) ou não.
- **Contador público** de serviços realizados do prestador.
- **Conta de exemplo** — uma por papel, com entrada pela landing.
- **Praça** (a estrutura hoje chamada *workspace*) e o **vínculo Administrador–praça**,
  com a praça padrão.
- **Empresa, membro e módulo liberado.**
- **Convite** para a equipe.

## Premissas abertas e registro de lacunas (Open assumptions & gap register)

As decisões do dono em 10/09/2026 estão em `_decisoes-travadas.md` (D-015 a D-021).

```yaml
- id: GAP-008
  type: scope
  severity: blocker
  question: "Quais contas de exemplo continuam entrando em 1 clique pela landing?"
  blocks: "R-42"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-015) — as cinco, uma por papel, sempre pelos botões da landing, para mostrar o protótipo. O risco fecha por isolamento: conta de exemplo só enxerga e altera o mundo de exemplo."

- id: GAP-009
  type: scope
  severity: blocker
  question: "O cadastro público deixa de oferecer 'Tenho uma empresa' (Administrador) e a troca prestador→Administrador acaba?"
  blocks: "R-44, R-46, R-47, R-48, R-49"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-016) — sim. Só o SysAdmin vincula praça a um ou mais Administradores, escolhendo a praça padrão; o Administrador vê só as praças vinculadas; o SysAdmin ganha um botão para criar praças; com uma praça só, nenhum seletor."

- id: GAP-010
  type: definition
  severity: blocker
  question: "Um serviço ainda pendente já libera o contato entre cliente e prestador?"
  blocks: "R-40"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-017) — sim: pendente, confirmado e realizado liberam; cancelado corta."

- id: GAP-011
  type: scope
  severity: blocker
  question: "'Salvar credenciais' passa a lembrar só o e-mail, deixando a senha para o gerenciador do navegador?"
  blocks: "R-50"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-018) — sim."

- id: GAP-012
  type: data
  severity: minor
  question: "A conta 'João Prestador (dev)' que aparece na busca é desativada?"
  blocks: "nenhum requisito (ver W-6)"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-019) — não precisa; fica ativa."

- id: GAP-013
  type: scope
  severity: minor
  question: "O app está publicado para o público? Em qual endereço?"
  blocks: "nenhum requisito"
  owner: "Leonardo Chalhoub"
  resolution: "RESOLVIDO 10/09/2026 (D-020) — ainda não; tudo roda localmente, e o deploy futuro será na Vercel (endereço *.vercel.app)."

- id: GAP-014
  type: scope
  severity: minor
  question: "As contas de exemplo de Cliente e Prestador podem interagir com pessoas reais (reservar um prestador real, receber reserva de cliente real)?"
  blocks: "nada nesta fatia — hoje não há pessoa real na base além das contas do dono"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: não. Na Fatia 5, o mundo de exemplo vive numa praça de demonstração, isolada pela fronteira de praça. Até lá, R-42 cobre o risco confirmado (o alcance administrativo)."

- id: GAP-015
  type: scope
  severity: minor
  question: "Um Administrador ainda convida outro Administrador para a própria praça (o ROADMAP §2.2 previa isso)?"
  blocks: "R-47"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido (consequência da D-016): não — vincular Administrador a praça é só do SysAdmin. O Administrador segue convidando os papéis abaixo dele (funcionário)."
```

## Assinatura (Sign-off)

Este documento é um objeto de consenso: ele não autoriza a descida ao Pass 2
enquanto o dono do produto não assinar.

- Sign-off verdict: _pending_
- Data: —
