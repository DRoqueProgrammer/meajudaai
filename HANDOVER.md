# Handover — Me Ajuda Aí

Este arquivo existe pra uma sessão nova (modelo diferente, ou uma continuação depois de um tempo parado) retomar sem perder contexto. Leia nesta ordem: **este arquivo** → [ROADMAP.md](./ROADMAP.md) §0 (auditoria — o que falta, sempre atualizada) → [CLAUDE.md](./CLAUDE.md) (convenções e comandos).

Última atualização: **09/09/2026, sessão de implementação da v2** (pivô de mural-de-vagas pra marketplace de agendamento).

## Onde as coisas estão agora

- Branch de trabalho: `feature/dev_2026-09-09`, publicada e sincronizada com `origin` (GitHub, `DRoqueProgrammer/meajudaai`). Sem PR aberto ainda.
- `npm run dev` local, servidor já rodando durante a sessão (`preview_start` do Claude Code) — se for retomar, só `npm run dev` de novo.
- Supabase: projeto novo `opvdfyyijbgrwztnqldl` (região us-east-2), todas as migrations até `0034_chave_pix_prestador.sql` aplicadas e os tipos (`lib/supabase/database.types.ts`) regenerados depois da última. Confira `ls supabase/migrations` pra saber o número mais alto antes de criar a próxima.
- `npm run typecheck` (`tsc --noEmit`) está limpo no fim desta sessão.

## O que foi construído/corrigido nesta sessão (resumo — não repetir)

Pivô completo de papéis (SysAdmin/Administrador/Prestador de Serviço/Cliente) com rótulos respeitando gênero; Agenda v2 (calendário mês/semana + linha do tempo por hora, horário recorrente) pro Prestador **e** pro Cliente; "Meus serviços" do Cliente com popover de perfil do prestador e filtro/paginação; `/admin/logs` com abas SysAdmin (geral) / Administração (só admins), conforme a matriz de visibilidade do ROADMAP §5.2; `/admin/usuarios` com os papéis certos (v1 tinha sumido Cliente/Prestador da lista); cidades via IBGE completo (~5.570 municípios, busca com cache) substituindo a lista fixa de 14; mapa reconstruído pro modelo P2P (pino aproximado, nunca coordenada exata — `lat_aprox`/`lng_aprox`, migration `0033`); correção de um crash real de RSC (Server Component passando função pra Client Component); correção do nome da marca ("Me Ajuda Aí", com espaço); zona de risco (desativar conta) com mais distância visual do botão Salvar; categorias de prestador com nomes reais (Eletricista, Pedreiro, etc. + Mestre de Obras) em vez de "Ajudante de X"; ícone/logo corrigido pra não sumir em zoom/tela estreita.

Lista completa e detalhada (com o que ainda falta) está em **[ROADMAP.md §0](./ROADMAP.md#0-auditoria--o-que-falta)**.

## Em andamento — não terminado, cuidado ao assumir que existe

**Cobrança Pix personalizada por serviço** (pedido do Leonardo, ainda incompleto):
- ✅ Migration `0034` aplicada: `profiles_pii.chave_pix` (chave Pix do prestador).
- ✅ `npm install qrcode` + `@types/qrcode` já feito.
- ❌ `lib/pix/static-qr.ts` (builder do BR Code/EMV, CRC16) **ainda não foi portado** — o de referência está pronto em `refs/foco-contabil/lib/pix/static-qr.ts` (~100 linhas, zero deps, é só copiar e traduzir os comentários).
- ❌ Campo "Chave Pix" **ainda não foi adicionado** em `components/perfil-form.tsx` nem em `lib/actions/perfil.ts` (`salvarPerfilAction` não grava em `profiles_pii` hoje — só em `profiles`; vai precisar de um segundo `.update()` ou um upsert combinado).
- ❌ Componente de cobrança (QR + copia-e-cola + nome do cliente/data/valor no meio, exibido pro **próprio prestador**, que mostra a tela pro cliente escanear — não precisa de RLS nova, é sempre o dono lendo a própria `chave_pix`) **ainda não foi construído** nem wireado em `SlotDetalhe` / `components/clientes/servico-cliente-card.tsx`.
- Pedido original do Leonardo, verbatim: *"no perfil dos prestadores de serviço, adicione a questão do PIX personalizado, nome data e valor no meio, para cada serviço. a chave pix do prestador ele configura, ou o administrador se quiser e precisar, no Perfil"*. A parte "ou o administrador configura" **não foi resolvida** — hoje só o próprio prestador consegue editar `profiles_pii` (RLS `pii_update_self`); dar essa permissão pro Administrador exigiria uma policy nova ou uma Server Action com `createAdminClient()` guardada por `user.role === "admin"`, e decidir se vale pra qualquer prestador ou só pra quem tem vínculo de workspace com aquele admin (ver tensão P2P vs workspace abaixo).

**Página inicial do Cliente** (pedido do Leonardo, não iniciado): mostrar os últimos serviços (mais recente → mais antigo, últimos 5, botão "mostrar todos"), e ele pediu explicitamente pra pensar em mais coisas úteis pra essa tela. Ideias que valem avaliar: próximo agendamento em destaque (data/hora/prestador, com contagem regressiva ou "hoje às 14h"), atalho direto pra renegociação de preço pendente (hoje só aparece dentro de Meus Serviços), prestadores favoritos/já usados (recontratar em 1 clique), aviso de serviço concluído aguardando avaliação.

## Pendências que já estavam mapeadas antes desta sessão (ver ROADMAP §0 para a versão viva)

Painel/dashboard do Prestador com KPIs; SysAdmin e Administrador sem dashboard próprio (caem no `/inicio` genérico — Leonardo confirmou ao vivo que isso está errado, precisam de tela própria sem o Hero); Hero ainda considerado "feio" (pendência de design, não de função); carrossel de fotos do prestador; aprovação de cadastro do prestador (Telegram/site) + selo "aguardando aprovação"; Telegram (bloqueado — precisa das credenciais do bot do Leonardo); papéis customizados dinâmicos além de "funcionário"; seletor de ícone/logo do workspace.

## Tensão de arquitetura não resolvida

O modelo P2P v2 (Prestador de Serviço não pertence a workspace nenhum) conflita com partes do modelo v1 que ainda estão em uso (Administrador/Funcionário publicam/gerenciam `vagas` dentro de um `workspace`). Hoje isso convive como **dois sistemas paralelos na mesma base de código** — `/mapa`, por exemplo, tem branches de código completamente diferentes pra Prestador (v2, `meus_clientes_no_mapa`) vs Administrador/Funcionário (v1, `vaga_local`). Antes de expandir qualquer feature que dependa de "Administrador enxerga/gerencia um Prestador", é preciso decidir: prestadores autônomos passam a ser membros de um workspace, ou o conceito de workspace fica restrito ao fluxo antigo de diária? Ver ROADMAP.md §2.2 e a nota ❓ na seção 0.

## Acesso e credenciais — o que NÃO está neste repositório

- **Conta real de SysAdmin do Leonardo** (e-mail/senha reais, não as contas de exemplo): foram passadas verbalmente na conversa, não estão em nenhum arquivo do repo por design (não commitar credenciais reais). Se precisar testar como o SysAdmin de verdade, peça de novo ao Leonardo.
- **Token do Supabase** (`SUPABASE_TOKEN` em `.env.local`, não comitado): Personal/Management API Token da conta inteira do Leonardo, autorizado por ele pra uso livre **neste projeto** (criar tabelas, aplicar migrations, o que for preciso). Não é o mesmo que `SUPABASE_SERVICE_ROLE_KEY` (esse sim é lido pelo app; o `SUPABASE_TOKEN` só serve pra CLI).
- **Credenciais das contas de exemplo** (não sensíveis, são dados fake): estão em `lib/auth/contas-exemplo.ts` e no README.

## Convenções que valem a pena internalizar antes de mexer em UI

- `lib/papel-label.ts` (`papelLabel(role, genero)`) e `lib/saudacao.ts` (`boasVindas(genero, nome)`) seguem a mesma regra de 3 formas (masculino/feminino/neutro-com-"e"). Qualquer texto novo que mencione o papel de alguém deve usar `papelLabel`, não uma string fixa — foi um bug real corrigido nesta sessão (rótulos "Administração da plataforma" pro SysAdmin, dropdown sem Cliente/Prestador).
- Server Component não pode passar função como prop pra Client Component (RSC não serializa closures) — se precisar de um "renderer" customizado vindo de uma página server, passe dados serializáveis + uma prop `variant` e deixe o componente cliente decidir internamente (ver `AgendaCalendarV2`/`DiaTimeline` como exemplo já corrigido).
- Nunca expor `profile_local.lat`/`lng` (coordenada exata) fora de RLS owner-only — qualquer feature de mapa/proximidade nova deve passar por uma função `SECURITY DEFINER` que só devolve distância ou `lat_aprox`/`lng_aprox`.
- Todo texto do produto é em PT-BR; comentários de código também.
