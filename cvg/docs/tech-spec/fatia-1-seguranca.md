# Tech-spec — Fatia 1 · Fechar os riscos de segurança da vistoria

> Converge Pass 1 (Intent) · 10/09/2026 · lane **NORMAL** (1 → 2 → 5 → 7 → 8), verificação
> independente de tier 2 obrigatória (`cvg lane`: piso por login e migration).
> **Origem:** o pedido do dono em 10/09/2026 — *"Vamos melhorar. Faça todas as
> recomendações destes agentes."* — sobre a vistoria de 10/09
> ([`cvg/brain/refs/2026-09-10-vistoria/`](../../brain/refs/2026-09-10-vistoria/README.md)),
> com o "SIM" dele para começar pela segurança. Contexto do produto: [ROADMAP.md](../../../ROADMAP.md).
> **Por que fatia:** [`cvg/brain/decisions/2026-09-10-vistoria-em-fatias.md`](../../brain/decisions/2026-09-10-vistoria-em-fatias.md).
> **Ids:** continuam a numeração do spec [`fechar-v2-marketplace.md`](./fechar-v2-marketplace.md) (R-37 em diante, GAP-008 em diante) para nenhum id colidir entre fatias.
> **Altitude:** o quê e quão bem. Nenhuma tecnologia é escolhida aqui.

## TL;DR

Fechar os três riscos de segurança que a vistoria confirmou no código, e os vizinhos
deles, antes que o app receba qualquer pessoa real.

**Resultado esperado (outcome):** hoje um cliente qualquer consegue ler o contato e o
endereço de qualquer prestador, qualquer visitante entra como SysAdmin em um clique, e
qualquer pessoa pode se tornar Administrador. Ao fim desta fatia, cada uma dessas
portas está fechada, provada por um teste que ataca de fora da aplicação — e nenhuma
jornada que funcionava deixa de funcionar.

## Problema restatado (Problem restated)

O banco do Me Ajuda Aí confia na tela: as regras de negócio do agendamento vivem só no
código da aplicação, e o banco aceita qualquer escrita de quem está logado desde que
ele diga ser a parte certa. Como o navegador fala direto com o banco, um cliente pode
inventar um serviço "já realizado" com qualquer prestador e, a partir daí, ler o
telefone, o e-mail, a chave de recebimento e o ponto exato dele — e ainda inflar a
reputação pública do prestador. Ao mesmo tempo, as contas de exemplo que a landing
oferece em um clique incluem SysAdmin e Administrador reais e editáveis: qualquer
visitante lê os registros de acesso de todo mundo. E o cadastro público aceita criar
Administrador, o que, somado a uma liberação de módulos que não olha a empresa, deixa
uma pessoa abrir telas de outra empresa. Hoje os dados são de exemplo; o dia em que
houver gente de verdade, isso é incidente de dado pessoal. Resolvido, da cadeira do
dono: nenhuma dessas portas abre, há um teste para cada uma, e o app continua fazendo
tudo o que já fazia.

## Escopo (Scope)

### Dentro (in scope)

- **Nascimento e ciclo de vida do serviço** — só pelo fluxo de reserva e pelas
  transições permitidas a cada papel; o contador público só se move pelo fluxo.
- **Quem vê contato, local exato e endereço de quem** — só as partes de um serviço
  válido.
- **Contas de exemplo** — sem papel administrativo em um clique; senha fora do código.
- **Papel de Administrador** — ninguém se atribui sozinho.
- **Liberação de módulos** — presa à empresa que liberou.
- **Senha no aparelho** — o app não guarda.
- **Vizinhos de baixo custo** — convite que não revela conta, busca sem conta de
  desenvolvimento, e as duas proteções baratas contra abuso (agendador e busca de endereço).
- **Testes de ataque permanentes** e roteiro de regressão das jornadas.

### Fora (out of scope)

- **Leitura global de perfis** (ADR 0002) — depende da fronteira de praça; fica na
  Fatia 5, que emenda o programa "Fechar a v2".
- **Registrar o gancho de papel no token** (ADR 0009) — decisão D-014 do dono ainda
  pendente; fica na Fatia 5.
- **Textos legais, encarregado e direitos do titular** — Fatia 2 (textos) e Fatia 5
  (exportação e anonimização).
- **Corrida da reserva e fuso horário** — são corretude da agenda, não controle de
  acesso; Fatia 4.
- **Qualquer mudança visual** — Fatia 3.

## Requisitos (Requirements)

Prioridade: `must` só para o que o resultado declarado falha sem. "Fora da aplicação"
= um usuário autenticado falando direto com o banco pelos mesmos meios que o
navegador usa, sem passar pelas telas.

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
  realizado; serviço cancelado não libera. *Verificável:* sem serviço, ou só com
  serviço cancelado, a leitura desses dados da outra pessoa devolve 0 registros; com
  serviço válido, devolve 1. (Estados que liberam: ver GAP-010.)
- **R-41 (must)** — O endereço escrito de uma pessoa segue a mesma regra do ponto
  exato: deixa de ser legível por qualquer usuário autenticado. *Verificável:* um
  usuário sem serviço válido com a pessoa lê 0 endereços dela; a própria pessoa e a
  outra parte de um serviço válido leem 1.

### Contas de exemplo e papel de Administrador

- **R-42 (must)** — Nenhum visitante entra sem senha numa conta de papel
  administrativo: as contas de exemplo de 1 clique se limitam a Cliente e Prestador de
  Serviço. *Verificável:* pedidos de entrada de exemplo como SysAdmin, Administrador
  e Funcionário são recusados em 3 de 3; a landing mostra 0 cartões de conta
  administrativa. (Quais contas ficam: GAP-008.)
- **R-43 (must)** — A senha das contas de exemplo sai do código-fonte e é trocada.
  *Verificável:* busca pela senha antiga no repositório encontra 0 ocorrências; o
  login com a senha antiga falha em 5 de 5 contas de exemplo; as contas de Cliente e
  Prestador seguem entrando pelo atalho de 1 clique.
- **R-44 (must)** — Ninguém se torna Administrador por conta própria: o cadastro
  público oferece só Cliente e Prestador de Serviço, a troca de papel não leva a
  Administrador, e Administrador nasce só por convite de quem já administra.
  *Verificável:* cadastro com papel administrativo forjado é recusado em 100%; troca
  de papel para Administrador é recusada em 100%; administradores já existentes
  continuam entrando (0 contas administrativas perdem acesso). (Ver GAP-009.)
- **R-45 (must)** — A liberação de um módulo para um funcionário vale só dentro da
  empresa que a liberou, e só para quem é membro dela. *Verificável:* liberação feita
  pelo dono de outra empresa é recusada em 100%; um módulo liberado na empresa B abre
  0 telas com dados da empresa A.

### Credenciais e vizinhos de baixo custo

- **R-46 (must)** — O app não guarda senha no aparelho: a opção "lembrar" guarda no
  máximo o e-mail, e salvar senha fica a cargo do gerenciador do próprio navegador.
  *Verificável:* depois de um login com a opção marcada, o armazenamento do navegador
  contém a senha 0 vezes. (Ver GAP-011.)
- **R-47 (should)** — Convidar alguém para a equipe não revela se um e-mail tem conta.
  *Verificável:* a resposta ao convite é idêntica, em texto, para um e-mail cadastrado
  e para um não cadastrado (2 de 2 iguais).
- **R-48 (should)** — A busca de prestadores mostra só prestadores de verdade.
  *Verificável:* a busca feita pela conta de exemplo Cliente devolve 0 resultados de
  conta de desenvolvimento ou sem categoria. (Ver GAP-012.)
- **R-49 (could)** — As duas portas automáticas resistem a abuso barato: a chave do
  agendador é conferida sem vazar, pelo tempo de resposta, quantos caracteres
  acertou; a busca de endereço aceita no máximo 10 pedidos por pessoa a cada 60
  segundos. *Verificável:* o 11º pedido em 60 s é recusado; a conferência da chave
  leva o mesmo tempo para chave certa e errada de mesmo tamanho (diferença abaixo do
  ruído de medição em 1.000 repetições).

### Prova

- **R-50 (must)** — Cada caminho de ataque desta fatia vira um teste permanente, que
  falha com a regra antiga e passa com a nova. *Verificável:* pelo menos 1 teste por
  requisito de R-37 a R-45 (9 caminhos) na suíte que fala com o banco, todos verdes;
  cada um falha quando a regra correspondente é removida.
- **R-51 (must)** — Nenhuma jornada que funcionava quebra. *Verificável:* roteiro no
  navegador com as contas de exemplo — cliente reserva, prestador confirma,
  prestador marca realizado, cliente cancela outro serviço com motivo, prestador vê o
  WhatsApp do cliente do serviço — 5 de 5 passos OK depois da fatia.

### Exclusões declaradas

- **W-4 (wont)** — Leitura global de perfis: 0 mudanças nesta fatia; é da fronteira
  de praça (Fatia 5).
- **W-5 (wont)** — Gancho de papel no token: 0 mudanças nesta fatia (D-014 pendente).

## Métricas de sucesso (Success metrics)

O KPI do dono é o da própria vistoria: o app só recebe gente real com os riscos
confirmados fechados.

| Métrica | Hoje | Alvo |
|---|---|---|
| Riscos de segurança confirmados em aberto | 3 (medido na vistoria, conferido na fonte) | 0 |
| Caminhos de ataque cobertos por teste permanente | 0 | ≥ 9 |
| Contas de exemplo de papel administrativo acessíveis sem senha | 3 (SysAdmin, Administrador, Funcionário) | 0 |
| Formas de alguém virar Administrador sozinho | 2 (cadastro público, troca de papel) | 0 |
| Senha guardada no navegador depois do login | sim, em texto puro | 0 ocorrências |
| Achados CRÍTICOS nas lentes supabase-specialist e code-reviewer, na re-vistoria | 2 | 0 |
| Jornadas das contas de exemplo que deixam de funcionar | — | 0 de 5 |

## Dados nomeados (Data named)

- **Serviço** — estado, horário de origem, prestador, cliente, preço, motivo de
  cancelamento.
- **Horário oferecido** — dono, estado (livre, pendente, confirmado).
- **Pessoa** — papel, contato (telefone, e-mail), chave de recebimento, ponto exato,
  endereço escrito, estado da conta.
- **Contador público** de serviços realizados do prestador.
- **Conta de exemplo** — qual papel, como se entra.
- **Empresa, membro e módulo liberado.**
- **Convite** para a equipe.

## Premissas abertas e registro de lacunas (Open assumptions & gap register)

As lacunas `blocker` abaixo são decisões do dono: o spec não se assina com elas
abertas. Cada uma traz a recomendação do controller.

```yaml
- id: GAP-008
  type: scope
  severity: blocker
  question: "Quais contas de exemplo continuam entrando em 1 clique pela landing? Recomendação: só Cliente e Prestador de Serviço; SysAdmin, Administrador e Funcionário saem (seguem existindo, mas com senha)."
  blocks: "R-42"
  owner: "Leonardo Chalhoub"
  resolution: (open)

- id: GAP-009
  type: scope
  severity: blocker
  question: "O cadastro público deixa de oferecer 'Tenho uma empresa' (Administrador) e a troca prestador→Administrador acaba? Recomendação: sim — na v2 Administrador nasce por convite (ROADMAP §2.1); administradores existentes não são afetados."
  blocks: "R-44"
  owner: "Leonardo Chalhoub"
  resolution: (open)

- id: GAP-010
  type: definition
  severity: blocker
  question: "Um serviço ainda pendente já libera o contato entre cliente e prestador? Recomendação: sim — pendente, confirmado e realizado liberam (é como eles combinam antes do aceite); cancelado não libera."
  blocks: "R-40"
  owner: "Leonardo Chalhoub"
  resolution: (open)

- id: GAP-011
  type: scope
  severity: blocker
  question: "'Salvar credenciais' foi um pedido seu. Passa a lembrar só o e-mail, deixando a senha para o gerenciador do navegador? Recomendação: sim."
  blocks: "R-46"
  owner: "Leonardo Chalhoub"
  resolution: (open)

- id: GAP-012
  type: data
  severity: minor
  question: "A conta 'João Prestador (dev)' que aparece na busca é desativada (a regra do produto é nunca deletar)? Recomendação: desativar."
  blocks: "R-48"
  owner: "Leonardo Chalhoub"
  resolution: (open)

- id: GAP-013
  type: scope
  severity: minor
  question: "O app está publicado para o público? Em qual endereço? Muda a urgência desta fatia, não o que ela faz. Recomendação: assumir que não está."
  blocks: "nenhum requisito"
  owner: "Leonardo Chalhoub"
  resolution: (open)
```

## Assinatura (Sign-off)

Este documento é um objeto de consenso: ele não autoriza a descida ao Pass 2
enquanto o dono do produto não assinar.

- Sign-off verdict: _pending_
- Data: —
