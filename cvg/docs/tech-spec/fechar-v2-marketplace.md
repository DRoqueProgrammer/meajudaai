# Tech-spec — Fechar a v2 do Me Ajuda Aí

> Converge Pass 1 (Intent) · 09/09/2026
> **BRD de origem:** [ROADMAP.md](../../../ROADMAP.md) — a visão ditada pelo dono do
> produto, nas palavras dele. Não foi copiada pra cá de propósito: ela continua
> sendo a fonte única, e uma cópia viraria drift em uma semana.
> **Decisões que sustentam este spec:** [`_decisoes-travadas.md`](./_decisoes-travadas.md)
> **Altitude:** o quê e quão bem. Nenhuma tecnologia é escolhida aqui — isso é Pass 3.

## TL;DR

Fechar o pivô da v2: cada praça vira um tenant isolado, os quatro papéis ganham
tela própria, e a plataforma passa a receber comissão do prestador.

**Resultado esperado (outcome):** hoje a jornada do produto quebra em dois pontos
— não existe mecanismo de receita, e dois dos quatro papéis caem numa home
genérica. Ao fim deste ciclo, um cliente acha um prestador por proximidade,
agenda, o prestador aceita, executa, cobra o cliente e repassa a comissão, sem
que ninguém precise editar uma tabela na mão. Cada papel entra numa tela feita
pro papel dele, e cada praça é um produto isolado com marca própria.

## Problema restatado (Problem restated)

O Me Ajuda Aí está no meio de um pivô que não terminou. O modelo antigo — um
mural onde uma empresa publica diária e ajudantes se candidatam — continua vivo
no código ao lado do modelo novo, em que um prestador mantém agenda própria e o
cliente agenda direto com ele. Quem usa hoje sente isso em três lugares. Dois dos
quatro papéis, SysAdmin e Administrador, caem numa home genérica que não serve
pra nenhum dos dois. O prestador consegue cobrar o cliente, mas a plataforma não
tem como cobrar o prestador — então o produto não tem receita, e "vale a pena
estar aqui" não tem contrapartida. E não existe noção de praça: o produto foi
pensado pra ser instalado em Niterói com um nome e em Maceió com outro, mas nada
no sistema separa uma praça da outra. Resolvido, da cadeira do dono, é isto: a
jornada inteira roda ponta a ponta sem intervenção manual no banco, cada papel
tem uma tela que faz sentido pro papel dele, e o que é de uma praça não vaza pra
outra.

## Escopo (Scope)

### Dentro (in scope)

Todo o backlog aberto da §0 do ROADMAP mais a comissão da §16, tratados no nível
do problema:

- **Tenancy por praça** — prestador e cliente pertencem a uma praça; o que é de
  uma não aparece na outra.
- **Comissão da plataforma** — alíquota, cálculo, cobrança, confirmação e
  consequência de inadimplência.
- **Telas próprias para SysAdmin e Administrador.**
- **Aprovação de cadastro do prestador** pelo site, com estado visível.
- **Recibo de serviço** e **visão financeira do prestador.**
- **Dataset de demonstração refeito.**
- **Faxina de linguagem v1 → v2** nas telas que ainda falam de diária.
- Itens menores da §0: comentário público do admin visível, papéis customizados
  além de "funcionário", identidade visual por praça, carrossel de fotos,
  verificação do registro de acesso.

### Fora (out of scope)

Explicitamente fora deste ciclo — nenhum destes é requisito aqui:

- **Notificação por Telegram** (ROADMAP §8, §9). Fora **por bloqueio externo**,
  não por escolha: depende de credenciais de bot que o dono ainda não passou.
  Onde o fluxo previa Telegram, este ciclo usa o que já existe no produto.
- **Padrão de cidades do repositório `amazing-school`** (§7, §9): o repo nunca
  foi clonado, e a lista oficial de municípios já foi resolvida por outro
  caminho. Nada a fazer.
- **Confirmação automática de pagamento** (nem do cliente ao prestador, nem do
  prestador à plataforma). Toda confirmação neste ciclo é humana e registrada.
  Integração bancária é ciclo futuro.
- **Como o cliente paga o prestador** continua sendo só a exibição de um código
  de cobrança — este ciclo não constrói conciliação desse pagamento.
- **Aplicativo nativo** — o produto segue sendo web responsivo.

## Requisitos (Requirements)

Prioridade: `must` só para o que o resultado declarado falha sem. `should` e
`could` são graduais. `wont` é exclusão deliberada.

### Tenancy — a praça como unidade de isolamento

- **R-1 (must)** — Todo Prestador de Serviço e todo Cliente pertencem a
  exatamente 1 praça. *Verificável:* nenhum registro de pessoa desses dois papéis
  existe sem praça associada; a contagem de órfãos é 0.
- **R-2 (must)** — Nenhuma consulta feita por um usuário retorna dado de outra
  praça. *Verificável:* para cada superfície que lista pessoas, horários,
  serviços ou registros de auditoria, um usuário da praça A recebe 0 registros da
  praça B. Aplica-se a busca, agenda, perfil, listagens administrativas e logs.
- **R-3 (must)** — O isolamento é decidido no servidor, não na interface.
  *Verificável:* uma requisição forjada pedindo um identificador de outra praça é
  recusada em 100% das tentativas, e não apenas escondida do menu.
- **R-4 (must)** — Uma pessoa que se cadastra publicamente numa instalação nasce
  na praça daquela instalação, sem escolher praça em nenhum passo do formulário.
  *Verificável:* cadastro concluído em duas instalações distintas produz pessoas
  em praças distintas; o número de campos de escolha de praça no formulário é 0.
- **R-5 (must)** — Toda pessoa já existente na base é atribuída a uma praça na
  virada. *Verificável:* após a migração, 0 registros ficam sem praça, e nenhum
  fluxo que funcionava antes passa a falhar.

### Papéis com casa própria

- **R-6 (must)** — Os 4 papéis entram numa tela específica do papel. *Verificável:*
  hoje 2 de 4 (Cliente e Prestador); alvo 4 de 4 — SysAdmin e Administrador param
  de cair na home genérica.
- **R-7 (must)** — A tela do SysAdmin e a do Administrador são operacionais, não
  de boas-vindas: cada uma abre com indicadores e atalhos do que aquele papel
  decide, e nenhuma das duas exibe o cartão de saudação. *Verificável:* o cartão
  de saudação aparece em 0 das 2, e cada uma leva a pelo menos 3 ações do papel.
- **R-8 (should)** — O Administrador enxerga a agenda completa da praça dele —
  todos os prestadores, todos os horários. *Verificável:* a soma dos horários
  visíveis ao Administrador é igual à soma dos horários dos prestadores da praça,
  e 0 de outras praças.

### Comissão da plataforma

- **R-9 (must)** — A alíquota existe em 4 níveis, com precedência determinística
  do mais específico para o mais geral: serviço individual, categoria de serviço,
  prestador, geral da praça. *Verificável:* dado um serviço coberto por mais de
  uma alíquota, o valor cobrado é sempre o do nível mais específico — resultado
  idêntico em 100% das repetições.
- **R-10 (must)** — Só Administrador e SysAdmin alteram qualquer alíquota.
  *Verificável:* tentativa de alteração por Prestador ou Cliente é recusada no
  servidor em 100% dos casos.
- **R-11 (must)** — A dívida do prestador nasce no instante em que um serviço
  passa a `realizado`, e vale o valor final do serviço vezes a alíquota vigente.
  *Verificável:* serviço cancelado antes de `realizado` gera dívida de 0; serviço
  renegociado gera dívida sobre o valor final, não o original.
- **R-12 (must)** — O Administrador cadastra a chave de recebimento da praça.
  *Verificável:* sem chave cadastrada, a praça emite 0 cobranças de comissão, e a
  interface diz isso em vez de emitir cobrança inválida.
- **R-13 (must)** — O prestador vê, na tela dele, a alíquota vigente e o total
  devido do dia. *Verificável:* o total exibido é igual à soma das dívidas
  geradas naquele dia, com diferença de R$ 0,00.
- **R-14 (must)** — Um clique abre a cobrança já com o valor do dia preenchido.
  *Verificável:* 1 clique basta, o valor na cobrança é igual ao total exibido, e o
  prestador digita 0 caracteres.
- **R-15 (must)** — O código de cobrança carrega no centro o nome, a data, o
  valor e o código do projeto, e continua sendo lido por um aplicativo de banco
  real. *Verificável:* leitura bem-sucedida por aplicativo de banco em pelo menos
  2 tentativas independentes; inspeção visual não conta como verificação. Se o
  conteúdo central comprometer a leitura, o código cresce até voltar a ser lido.
- **R-16 (must)** — O prestador declara o pagamento, e essa declaração vira
  pendência para o Administrador. *Verificável:* declarar cria exatamente 1
  pendência; a pendência registra quem, quanto e quando.
- **R-17 (must)** — O Administrador confirma ou recusa a pendência, e a decisão
  fica registrada de forma não editável. *Verificável:* confirmação zera a dívida
  correspondente; recusa a mantém; ambas produzem 1 registro imutável.
- **R-18 (must)** — Inadimplência escala em 3 dias: aviso diário dentro do
  produto e por e-mail nos dias 1, 2 e 3; no 3º dia a conta é suspensa até
  regularizar. *Verificável:* a suspensão ocorre no 3º dia, nem antes nem depois.
- **R-19 (must)** — A conta suspensa oferece um caminho para falar com o
  Administrador. *Verificável:* a tela de suspensão contém pelo menos 1 canal de
  contato acionável.
- **R-20 (should)** — Serviços já agendados com um prestador suspenso não são
  cancelados automaticamente. *Verificável:* após a suspensão, 100% dos serviços
  já confirmados continuam válidos para o cliente.

### Ciclo de vida do prestador

- **R-21 (must)** — O cadastro do prestador passa por aprovação do Administrador
  da praça, feita pelo site. *Verificável:* um cadastro novo não aparece em
  nenhuma busca de cliente antes da aprovação — 0 ocorrências.
- **R-22 (must)** — Enquanto pendente, o prestador vê o próprio estado.
  *Verificável:* a tela dele exibe o estado de aprovação em 100% dos acessos
  enquanto pendente.

### Serviço, recibo e dinheiro do prestador

- **R-23 (should)** — Todo serviço `realizado` pode gerar um recibo. *Verificável:*
  o recibo traz os 5 campos obrigatórios — nome, função, serviço, data e valor
  final — e sai válido nos 2 casos: com e sem assinatura enviada pelo prestador.
- **R-24 (should)** — O prestador tem uma visão financeira com o que faturou por
  período e o que pagou de comissão. *Verificável:* os totais batem com a soma
  dos serviços e das comissões do período, diferença de R$ 0,00.
- **R-25 (should)** — O comentário que o Administrador marcou como público é
  visível ao cliente e ao prestador daquele serviço. *Verificável:* comentário
  público aparece para os 2; comentário privado aparece para 0 deles.

### Dados de demonstração

- **R-26 (must)** — A base de demonstração cobre pelo menos 24 meses de histórico
  terminando em dezembro de 2026, com serviços futuros agendados até no máximo 6
  meses à frente. *Verificável:* o serviço mais antigo está a pelo menos 24 meses
  do mais recente; nenhum serviço futuro passa de 6 meses.
- **R-27 (must)** — Os dados são plausíveis, não aleatórios: valores compatíveis
  com a categoria, horários dentro do expediente declarado, clientes recorrentes,
  e distribuição de status que reflita uso real. *Verificável:* nenhum serviço
  fora do horário declarado do prestador; pelo menos 30% dos clientes com mais de
  1 serviço; nenhum valor fora da faixa da categoria.

### Faxina e itens menores

- **R-28 (must)** — Nenhuma tela ativa descreve o produto como mural de diárias.
  *Verificável:* revisão das rotas ativas; ocorrências de linguagem da v1 em
  telas do fluxo v2 = 0.
- **R-29 (must)** — O registro de acesso grava de fato num login novo pelo
  formulário. *Verificável:* 1 login novo produz exatamente 1 registro.
- **R-30 (should)** — O Administrador cria papéis além de "funcionário" e define
  na criação quais módulos aquele papel enxerga. *Verificável:* papel novo nasce
  com 0 módulos; tentativa de acessar módulo não concedido é recusada no servidor.
- **R-31 (could)** — O perfil do prestador exibe mais de 1 foto, em carrossel.
  *Verificável:* com 0 fotos, o perfil mostra 0 seções de foto — nunca um
  carrossel vazio.
- **R-32 (could)** — O Administrador escolhe a identidade visual da praça entre os
  2 ícones aprovados, ou envia um logo próprio. *Verificável:* remover o logo
  enviado devolve exatamente o ícone escolhido antes, em 100% dos casos.

### Exclusões declaradas

- **W-1 (wont)** — Notificação por Telegram. Bloqueada por credencial externa:
  0 requisitos deste ciclo dependem dela.
- **W-2 (wont)** — Conciliação automática de pagamento. Toda confirmação é humana
  neste ciclo: 0 integrações bancárias.
- **W-3 (wont)** — Busca transbordando entre praças. O isolamento é total por
  decisão (D-006); atendimento a divisa de cidades é problema de ciclo futuro.

## Métricas de sucesso (Success metrics)

O BRD não trazia nenhuma métrica — estas derivam da definição de pronto travada
com o dono (D-003) e cada uma tem um estado atual medido, não estimado.

| Métrica | Hoje | Alvo |
|---|---|---|
| Pontos em que a jornada ponta a ponta quebra e exige intervenção manual | 2 (sem mecanismo de comissão; Administrador sem tela) | 0 |
| Papéis com tela própria do papel | 2 de 4 | 4 de 4 |
| Mecanismo de receita da plataforma | inexistente | cobrança emitida, declarada e confirmada, com registro imutável |
| Superfícies com isolamento por praça | 0 (o conceito não existe para prestador e cliente) | 100% das superfícies que listam pessoas, horários, serviços ou logs |
| Amplitude do histórico na base de demonstração | insuficiente ("bem ruim", palavras do dono) | >= 24 meses até dez/2026, futuros <= 6 meses |
| Telas do fluxo v2 falando a língua da v1 | presente na landing e em rotas de diária | 0 |

## Dados nomeados (Data named)

O que o produto manipula, no nível do problema — não é modelagem, que é Pass 3:

- **Praça** — a unidade de isolamento e de marca; tem nome, identidade visual,
  chave de recebimento e uma alíquota geral.
- **Pessoa** — papel, gênero (que governa a saudação e os rótulos), contato,
  endereço com ponto exato, e a praça a que pertence.
- **Estado de aprovação** do prestador, com quem aprovou e quando.
- **Horário oferecido** pelo prestador, incluindo recorrência.
- **Solicitação** do cliente sobre um horário, com a descrição do que precisa.
- **Serviço** — nasce do aceite; carrega valor, status, endereço próprio (que não
  é o do perfil de ninguém), histórico de renegociação e categoria.
- **Alíquota** — nos 4 níveis, com quem definiu e quando.
- **Dívida de comissão** — nasce de um serviço realizado; tem valor, data e
  situação.
- **Declaração e confirmação de pagamento** — quem declarou, quem confirmou,
  quanto e quando.
- **Registro de auditoria** — acesso, renegociação, anotação e comentário, cada
  um com escopo de visibilidade próprio (a matriz da §5.2 do ROADMAP).
- **Categoria de serviço** — o vocabulário que liga preço, alíquota e busca.

## Premissas abertas e registro de lacunas (Open assumptions & gap register)

Nenhuma lacuna **blocker** permanece aberta: as cinco que travavam o spec foram
resolvidas na interrogação (D-001 a D-009, em `_decisoes-travadas.md`). As
abaixo são todas `minor` — cada uma com dono nomeado e com o padrão que este
spec assume enquanto a resposta não vem.

```yaml
- id: GAP-001
  type: number
  severity: minor
  question: "A dívida de comissão acumula entre dias, ou cada dia é uma cobrança isolada?"
  blocks: "R-13, R-18"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: acumula como saldo devedor, e a suspensão do R-18 conta 3 dias a partir da pendência mais antiga em aberto. Confirmar."

- id: GAP-002
  type: definition
  severity: minor
  question: "O cartão de boas-vindas é chamado de feio desde o começo, mas nenhuma direção concreta foi dada. O que exatamente muda?"
  blocks: "nenhum requisito — não é falsificável como está, por isso ficou fora dos requisitos"
  owner: "Leonardo Chalhoub"
  resolution: "Aberto por escolha: sem direção, qualquer tentativa é chute. Precisa de uma conversa de design, não de um requisito."

- id: GAP-003
  type: definition
  severity: minor
  question: "Qual o texto exato do aviso de que o preço pode mudar após avaliação no local?"
  blocks: "exibição de preço no perfil do prestador"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: texto curto redigido por nós e submetido à aprovação antes de ir ao ar."

- id: GAP-004
  type: scope
  severity: minor
  question: "Se o cliente recusa a renegociação de valor, o serviço cancela, mantém o valor antigo, ou fica em impasse?"
  blocks: "R-11 na parte de valor final"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: recusa mantém o valor original e o serviço segue; o impasse é problema humano, não de sistema."

- id: GAP-005
  type: scope
  severity: minor
  question: "Um horário pendente sem resposta do prestador expira? Em quanto tempo?"
  blocks: "R-11 (o que nunca vira serviço nunca gera dívida)"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: não expira automaticamente neste ciclo; o cliente pode desistir."

- id: GAP-006
  type: number
  severity: minor
  question: "Cobertura de teste tem meta numérica? A intenção de amarrar o bump de versão à cobertura ficou sem métrica."
  blocks: "convenção de versionamento no README"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: medimos a cobertura atual e propomos a meta com o número na mão, em vez de arbitrar agora."

- id: GAP-007
  type: definition
  severity: minor
  question: "A identidade visual do produto fora de qualquer praça (tela de entrada, material público) continua fixa, ou o SysAdmin também a define?"
  blocks: "R-32"
  owner: "Leonardo Chalhoub"
  resolution: "Assumido: continua fixa neste ciclo."
```

## Assinatura (Sign-off)

Este documento é um objeto de consenso: ele não autoriza a descida ao Pass 2
enquanto o dono do produto não assinar.

- Sign-off verdict: **pending** — aguardando revisão de Leonardo Chalhoub
- Data: (a preencher na assinatura)

Ao assinar, trocar o veredito por `canonical` e preencher a data no formato
`AAAA-MM-DD`. Só então o Pass 2 (`tech-req-to-adrs`) pode consumir este spec.
