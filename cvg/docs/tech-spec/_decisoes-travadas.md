# Decisões travadas — Pass 1 (Intent), Me Ajuda Aí v2

Log append-only da interrogação do Pass 1. Cada entrada é uma decisão do dono do
produto (Leonardo), tomada em resposta a uma pergunta com recomendação. É daqui
que os requisitos do tech-spec puxam rastreabilidade — requisito sem `Locked:` ou
sem linha do BRD (ROADMAP.md) não entra.

## Rodada 1 — 09/09/2026

**Locked D-001 — Todo Prestador de Serviço pertence a um workspace.**
Rejeitadas: vínculo opcional (minha recomendação) e workspace restrito ao fluxo
antigo de vagas. Razão dada pelo dono: *"O aplicativo é de pequeno porte. Podemos
deployar ele em Niterói com um nome, e em Maceió com outro nome. O workspace deve
ser respeitado."*
→ Isso redefine o que workspace **é**: não é "uma empresa dentro do app", é um
**tenant de praça/marca** — uma instalação por cidade, com nome próprio. Resolve
de uma vez a tensão aberta na §0/§2.2 do ROADMAP: comissão, dashboard do
Administrador, agenda completa do workspace e comentário de admin em serviço
passam todos a ter dono definido.

**Locked D-002 — Escopo do ciclo: todo o backlog da §0 mais a comissão (§16),
exceto o que está bloqueado por fator externo.**
Fora por bloqueio, não por escolha: **Telegram** (depende das credenciais do bot,
que o dono ainda não passou) e o padrão de cidades do repo **amazing-school**
(repo não clonado — o IBGE já foi resolvido por outro caminho). A priorização
`must`/`should`/`could` dentro do spec faz o sequenciamento.

**Locked D-003 — Pronto = a jornada ponta a ponta roda inteira sem intervenção
manual no banco.** Cliente acha por proximidade → agenda → prestador aceita →
executa → cobra o cliente por Pix → paga a comissão → Administrador confirma.
⚠️ **Desambiguação exigida pelo dono:** "sem tocar no banco" qualifica a
**jornada do usuário** — nenhum passo dela pode depender de alguém editar tabela
na mão. Não qualifica o trabalho de construção: *"você pode e Deve tocar no
banco"* (migrations e seed são esperados).

**Locked D-004 — Dataset de demonstração precisa ser refeito.** Palavras do dono
sobre o atual: *"Foram gerados dados falsos, mas está bem ruim de forma geral."*
Requisitos dados: realístico, **pelo menos 2 anos** de histórico, incluindo 2026
**até dezembro**, e serviços agendados no futuro próximo com **limite de ~6
meses**.

**Locked D-005 — A dívida de comissão nasce quando o serviço vira `realizado`.**
Razão dada: *"é um evento que confirma Valor"* — o valor final, já renegociado se
houve. Consequência aceita: serviço cancelado antes de `realizado` simplesmente
não gera dívida, então não existe estorno nem caso de borda de cancelamento.

## Rodada 3 — 09/09/2026, decididas por mim a pedido do dono

Leonardo foi dormir e pediu: *"tome as melhores decisões por mim. Vá até o final."*
As três abaixo eram perguntas abertas do PRD da raia `praca`. Resolvi com o
melhor julgamento disponível e marquei como **minhas**, não dele — se alguma
estiver errada, é aqui que se corrige, e o custo de reverter está anotado.

**D-010 (minha) — Uma praça não tem dono pessoa física.** `workspaces.owner_id`
codifica "empresa com proprietário" (ADR 0003). Passa a significar
**administrador responsável** pela praça: quem responde por ela, não quem a
possui. A coluna sobrevive, o significado muda, o glossário registra.
*Por quê:* remover a coluna quebraria as políticas da v1 que dependem dela; e
uma praça precisa de alguém responsável de qualquer forma — é quem define
alíquota (R-9) e confirma pagamento (R-17). *Reverter custa:* uma migration.

**D-011 (minha) — SysAdmin é supra-praça; não recebe praça.** O ROADMAP §2.1 diz
que ele "enxerga tudo em qualquer workspace". Dar praça a ele contradiria isso.
O backfill de `leg-01` cobre prestador e cliente; admin e funcionário já têm
vínculo por `workspace_members`; sysadmin fica fora por definição.
*Por quê:* é a leitura literal do papel, e evita o absurdo de um dono de
plataforma não enxergar metade dela. *Reverter custa:* uma linha no backfill.

**D-012 (minha) — A instalação declara sua praça por variável de ambiente.**
Cada deploy carrega a identificação da praça que serve. *Por quê:* é o mecanismo
mais simples que atende "deployar em Niterói com um nome e em Maceió com outro"
(D-001/D-007), não exige tabela de domínios, e um deploy novo é uma variável a
mais. *Reverter custa:* trocar a fonte da resolução em um ponto só —
`leg-03-cadastro` isola isso de propósito.
