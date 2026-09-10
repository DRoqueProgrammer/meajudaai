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

**D-013 (minha) — A cerca de escrita fica como está; migration é trabalho autorizado por humano.**
O `.cvg/gate.yaml` — o teto que nenhuma task pode alargar — protege
`**/migrations/**` e `**/auth/**`, e limita a 12 arquivos por task. A raia
fundação (`praca`) precisa exatamente desses caminhos: `leg-01` cria coluna e
faz backfill, e a correção do ADR 0009 mexe em autenticação.

Decisão: **não alarguei a cerca.** O próprio arquivo diz *"Review it for the
consuming repository before unattended execution"* — é uma decisão de quem
responde pelo repositório, não minha, e o efeito de errar é um agente autônomo
escrevendo migration num banco de produção às três da manhã.

Consequência prática: o loop do Pass 8 pode executar as raias `superficies`,
`prestador` (parcial) e `dados`, mas **não** a raia `praca` nem a correção do
0009. Essas duas precisam de você na cadeira — ou de uma decisão explícita de
alargar a cerca.

**D-014 (minha) — Não registrei o auth hook enquanto você dormia.**
O ADR 0009 mostrou que 45 cláusulas de policy dependem de um claim que não
existe, e a correção "certa" é registrar o `custom_access_token_hook` no painel
do Supabase — o que eu conseguiria fazer com o token de gestão.

Não fiz. Registrar um auth hook muda como **todo** JWT do projeto é emitido; se
sair errado, ninguém entra no app, e você descobriria isso acordando com o
produto fora do ar. O achado — que é a parte valiosa — está registrado e
verificado. A correção espera você.

## Rodada 4 — 10/09/2026 · Fatia 1 (segurança) e adiantadas das próximas fatias

Perguntas feitas depois da vistoria de 10/09 (`cvg/brain/refs/2026-09-10-vistoria/`),
cada uma com a recomendação do controller. As respostas são do Leonardo, citadas
literalmente; onde a resposta dele pediu uma consequência de desenho, a consequência
está marcada como **do controller** — é aqui que se corrige se estiver errada.

**Locked D-015 — Contas de exemplo: uma por papel, sempre pelos botões da landing.**
Recomendação rejeitada (tirar SysAdmin, Administrador e Funcionário da landing).
Palavras do dono: *"Não, uma conta fake para cada papel, para podermos mostrar o
protótipo facilmente. As contas fake têm e-mails e senhas falsos, mas o acesso é sempre
pelos botões da main page."*
→ **Consequência do controller:** o risco confirmado (a conta de exemplo SysAdmin lê os
dados de todo mundo) fecha por **isolamento**, não por remoção: uma conta de exemplo, de
qualquer papel, só enxerga e altera o mundo de exemplo (R-42). A senha segue falsa, mas
não pode chegar ao navegador (R-43).

**Locked D-016 — Administrador nasce só por ação do SysAdmin; o SysAdmin governa praças.**
Palavras do dono: *"Sim, vamos melhorar. Apenas um sysadmin pode assign um workspace a um
Sócio ou mais. O padrão quando se clica um sócio é escolher o workspace padrão e ele
apenas verá esse, a menos que o sysadmin o inclua em outro workspace. Precisa cuidar para
que o sysadmin tenha meios, botão, para criar novos workspaces, isso não existe hoje. Se
um admin tiver apenas UM workspace, nenhum seletor deve aparecer para ele com uma opção."*
→ Sai "Tenho uma empresa" do cadastro público; acaba a troca prestador → Administrador;
só o SysAdmin cria praça e vincula Administrador a uma ou mais praças, com praça padrão;
Administrador vê só as vinculadas; com uma praça, nenhum seletor (R-44, R-46 a R-49).
"Sócio" foi lido como **Administrador** e "workspace" como **praça** (D-001, CONTEXT.md).
→ **Consequência do controller:** o Administrador deixa de criar empresa própria e deixa
de convidar outro Administrador (o ROADMAP §2.2 previa isso) — segue convidando os papéis
abaixo dele (GAP-015).

**Locked D-017 — Serviço pendente já libera o contato; cancelado corta.** Resposta: *"Sim."*

**Locked D-018 — "Salvar credenciais" lembra só o e-mail; a senha fica com o gerenciador
do navegador.** Resposta: *"Sim."* Substitui o "salvar credenciais" do login pedido antes.

**Locked D-019 — A conta "João Prestador (dev)" fica ativa.** Recomendação rejeitada
(desativar). Resposta: *"Não precisa!"* → W-6.

**Locked D-020 — O app não está publicado.** *"Ainda não. Fazendo tudo localmente, depois
vai ser deployado na vercel.app."* O endereço público entra como configuração do deploy
(Open Graph e sitemap da Fatia 2 dependem dele).

**D-021 (do controller, por delegação) — A cerca de escrita é revisada: histórico
trancado, caminho normal aberto.** Substitui a D-013. Pergunta feita: tirar
`**/migrations/**` e `**/auth/**` do `.cvg/gate.yaml`. Resposta do dono: *"Não entendi,
mas você sabe mais que eu. Tome a decisão melhor e ideal para esse problema."*
Decisão:
- **Migrations já aplicadas ao banco (0001–0037) continuam trancadas** — reescrever
  histórico que já rodou é o erro mais caro que existe. **Migration nova passa a ser
  permitida**: é o caminho normal de mudar o banco, e toda task que cria uma passa pela
  verificação independente de tier 2 (a lane já exige). Quando uma migration nova é
  aplicada, ela entra na lista trancada no mesmo commit.
- **`app/auth/**` (as rotas de confirmação de login) continua trancado.** A camada de
  autorização em `lib/auth/` fica editável — as fatias 1 e 5 precisam dela —, também
  sob tier 2.
- Todo o resto fica como estava: `.env`, segredos, chaves, `.cvg/`, workflows, pagamento
  e cobrança; teto de 12 arquivos por task.
*Por quê:* a D-013 deixava a Fatia 1 inexecutável pelo loop — justamente a fatia de
segurança. A nova cerca protege o que é irreversível (histórico) e libera o que é normal
(migration nova), em vez de tudo ou nada. *Reverter custa:* editar uma lista no
`.cvg/gate.yaml`.

**Locked D-022 (adiantada, Fatia 3) — O Hero perde a citação.** Resposta: *"OK."* Fica
saudação, relógio e clima colapsável, na direção da conselheira-design. Substitui a
citação aleatória do ROADMAP §2.5 e da convenção do Hero no `CLAUDE.md` — os dois são
atualizados quando a Fatia 3 entregar.

**Locked D-023 (adiantada, Fatia 2) — Direitos do titular: desativar, excluir e baixar.**
Palavras do dono: *"Sim, e ainda coloque um botão para a pessoa poder baixar um JSON com
todos os dados de todas suas atividades na plataforma desde o momento 1."*
→ "Desativar" continua reversível; nasce "excluir meus dados", que anonimiza em até 15
dias; e nasce "baixar meus dados", um arquivo com todos os dados e todas as atividades da
pessoa desde o cadastro. Concilia o "nunca deletar" do ROADMAP §3 com o art. 18 da LGPD.

**Locked D-024 (adiantada, Fatia 2) — Encarregado de dados: o próprio Leonardo.**
Palavras do dono: *"Por enquanto sou eu, isso é um protótipo. leochalhoub@hotmail.com"*
— esse é o contato público que a Política de Privacidade vai trazer.

## Rodada 5 — 10/09/2026 · Pass 5 da Fatia 1

O dono aprovou a quebra em tarefas com *"aprovo, faça o que precisar para ficar bom"*.
As decisões abaixo são do controller, sob essa delegação.

**D-025 (do controller, por delegação) — A Fatia 1 ganha a tarefa 12: o prestador marca
o serviço como realizado.** O scan do Pass 5 mostrou que esse caminho não existe na
aplicação (ADR 0016) — os 25 serviços realizados vieram de script. Sem ele, o R-38 ("só o
prestador marca realizado") fica sem caminho legítimo e o roteiro do R-54 não fecha. Não
muda o spec assinado: o spec já exige a jornada; o terreno é que não a tinha.

**D-026 (do controller) — Os evals da Fatia 1 são testes-gabarito escritos antes da
execução.** O executor não os edita (entram em `do_not_touch`): um teste escrito por quem
implementa passa por construção e não prova nada. Onde a regra mora no banco, o gabarito
ataca de fora da aplicação (chave pública + sessão real); onde mora na aplicação, o
gabarito fixa um contrato pequeno e testável (função pura ou action com a sessão
simulada) e o eval confere, por busca no código, que as telas e actions o usam.

**Anotado para a Fatia 5 (não é decisão, é risco):** a política de atualização de
`servicos` também deixa o cliente reescrever `preco_valor` direto — hoje isso é
necessário porque aceitar a renegociação é o cliente copiando `preco_pendente` para
`preco_valor` (`responderRenegociacaoAction`). A Fatia 1 preserva a renegociação e trata só
de estado; a integridade do valor final é pré-requisito da comissão (R-11) e entra no
programa "Fechar a v2".

**D-027 (do controller) — O Pass 8 da Fatia 1 executa pelo protocolo do motor Task-Spec,
não pelo `cvg loop`.** Verificado no kernel (`.agents/skills/task-loop/scripts`): o
adaptador do Claude roda `claude -p --permission-mode acceptEdits` — edita arquivos, mas
não tem autoridade de shell —, e o isolamento padrão é um worktree de estado commitado,
sem `.env.local` nem o vínculo do Supabase. As tarefas 1, 2, 3 e 5 precisam aplicar
migration no único banco e regenerar os tipos; nenhuma das duas coisas cabe nesse
envelope. O caminho escolhido é o que a própria skill `task-spec` prescreve para qualquer
executor: `taskspec handoff` (contrato só de leitura) → um agente **Sonnet** executa, com
contexto novo e shell → o controller revisa o diff → verificação independente de tier 2
(`cvg verify`, exigida pela lane) → `taskspec accept --stamp` re-roda os evals e confere
HMAC, dependências e escopo de escrita. As tarefas andam uma de cada vez no checkout
principal, porque as migrations formam uma fila e várias tarefas tocam os mesmos arquivos.
*Reverter custa:* nada — a mesma task-spec assinada serve ao `cvg loop` quando o adaptador
ganhar shell.

**D-028 (do controller) — Gabarito sem credencial quebra, não pula.** Um teste de
integração pulado deixa o vitest verde sem provar nada; o `tests/fatia1/harness.ts` lança
erro quando `RUN_INTEGRATION=1` e faltam as variáveis do Supabase.

**D-029 (do controller) — Tier 2 no Windows pelo gemini, e sem Pass 7 na Fatia 1.** O
`cvg verify` não subia o juiz no Windows (o `CreateProcess` não acha o `gemini.CMD`) e
passava o diff como argumento, o que estoura o limite de linha de comando num diff de
migration. Fork mínimo do `verify-work.py` nos dois tool homes: prompt por stdin,
gemini em modo read-only, executável resolvido por `shutil.which` — detalhes em
`cvg/brain/decisions/2026-09-10-verificacao-tier2-no-windows.md`. O `cvg bind` (Pass 7)
também quebra no Windows e só alimenta o `cvg loop`, que a D-027 deixou de lado; a cerca
que a Fatia 1 precisa é conferida pelo `taskspec accept` e pelo `cvg gate --path`.
*Reverter custa:* reaplicar o `install.sh` do Converge.

**D-030 (do controller) — Risco adormecido: o auth hook acorda as cláusulas de SysAdmin
para a conta de exemplo.** Achado na preparação da tarefa 3. `current_app_role()` lê o papel
de `app_metadata.app_role` no JWT, que só o `custom_access_token_hook` preenche — e o hook
nunca foi registrado no Dashboard; nenhum usuário tem `app_role` gravado. Hoje, portanto,
toda sessão é `cliente` para o banco, as cláusulas `current_app_role() = 'sysadmin'` (e
`'admin'` em `servicos`) de ~20 políticas não disparam, e as telas administrativas leem com a
chave de serviço (a Fatia 1 escopa essas leituras pela marca de exemplo). O perigo é
futuro: registrado o hook, a conta de exemplo SysAdmin — aberta por qualquer visitante —
leria dados de contato, serviços, acessos e mensagens reais e escreveria o banner da home
direto no banco. Decisão: não registrar o hook antes de escopar essas cláusulas pela marca
de exemplo (a conta de exemplo só vê e altera o mundo de exemplo, R-42). Aviso no
`CLAUDE.md`, ao lado da pendência do hook; o escopo das políticas entra junto com o W-4 da
Fatia 5 (leitura global de `profiles`), que já mexe nas mesmas políticas.
