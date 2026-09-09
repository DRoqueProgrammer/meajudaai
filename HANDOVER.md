# Handover — Me Ajuda Aí

Este arquivo existe pra uma sessão nova (modelo diferente, ou uma continuação depois de um tempo parado) retomar sem perder contexto. Leia nesta ordem: **este arquivo** → [ROADMAP.md](./ROADMAP.md) §0 (auditoria — o que falta, sempre atualizada) → [CLAUDE.md](./CLAUDE.md) (convenções e comandos).

Última atualização: **09/09/2026 às 20:31**, mesma sessão de implementação da v2 (pivô de mural-de-vagas pra marketplace de agendamento) — esta é a segunda passada do handover; a primeira foi por volta das 20h, esta cobre mais duas horas de correções pedidas ao vivo olhando o app rodando.

## Onde as coisas estão agora

- Branch de trabalho: `feature/dev_2026-09-09`, publicada e sincronizada com `origin` (GitHub, `DRoqueProgrammer/meajudaai`). Working tree limpo, sem PR aberto ainda.
- `npm run dev` local, servidor rodando via `preview_start` do Claude Code durante a sessão — se for retomar, só `npm run dev` de novo.
- Supabase: projeto `opvdfyyijbgrwztnqldl` (região us-east-2), migrations até **`0037_endereco_por_servico.sql`** aplicadas e os tipos (`lib/supabase/database.types.ts`) regenerados depois da última. Confira `ls supabase/migrations` pra saber o número mais alto antes de criar a próxima — a numeração não tem gaps confiáveis documentados em outro lugar.
- `npm run typecheck` (`tsc --noEmit`) está limpo no fim desta sessão. Todo o fluxo abaixo foi verificado rodando no browser (login real como João Ferreira/prestador e Marina Costa/cliente), não só por tipo.
- `npm install qrcode @types/qrcode` já feito (usado pela cobrança Pix).

## O que foi construído/corrigido nesta sessão (resumo — não repetir)

**Base do pivô (primeira metade da sessão):** papéis (SysAdmin/Administrador/Prestador de Serviço/Cliente) com rótulos respeitando gênero; Agenda v2 (calendário mês/semana + horário recorrente) pro Prestador e pro Cliente; `/admin/logs` e `/admin/usuarios` corrigidos; cidades via IBGE completo (~5.570 municípios); mapa reconstruído pro modelo P2P (`/mapa` do prestador, `/buscar-prestador` do cliente, pino sempre aproximado); crash de RSC corrigido (Server Component passando função pra Client Component); nome da marca corrigido ("Me Ajuda Aí"); categorias com nomes reais (Eletricista, Pedreiro, Mestre de Obras, etc.).

**Segunda metade (correções ao vivo olhando o app, esta passada):**
- **Agenda do prestador, redesenhada de verdade:**
  - Clicar num evento abre um **card efêmero centralizado na tela** (`EventoPopover`, overlay `fixed` com fundo escurecido) — não mais expandindo inline embaixo da linha do tempo, que quebrava texto e empurrava a página. Mostra nome do cliente, data/hora, descrição, preço, status, e um botão "Ver serviço completo" pra `/agenda/[slotId]` (onde ficam as ações: aceitar, cancelar, observações privadas, cobrança Pix, dados do cliente).
  - Texto do bloco de evento na linha do tempo (hora + descrição) agora centralizado, não mais no canto superior esquerdo de uma barra alta.
  - Células do calendário de mês mostram hora+descrição de cada evento (até 3, com "+N"), não mais um pontinho colorido genérico com "1 horário".
  - Card "Você está aberto para" (novo `lib/agenda-resumo.ts`) resume em texto os períodos recorrentes já configurados — antes não existia nenhum resumo, só o calendário cheio de bolinhas.
- **Endereço é POR SERVIÇO, não do perfil** (migration `0037`: `servicos.endereco/lat/lng`) — o mesmo cliente pode pedir serviço em endereços diferentes (a própria casa, a de um parente, o escritório). `SlotReservar` (cliente reservando um horário) agora exige marcar o endereço via `AddressMapPicker`: `reservarSlotAction` valida e grava. **Serviços criados antes desta migration não têm endereço** (mostram "Sem localização exata cadastrada" graciosamente — não é bug).
- **Dados do cliente na página do serviço** (`/agenda/[slotId]`, novo `components/agenda/cliente-do-servico.tsx`): nome (popover clicável → perfil, abre em nova aba), telefone formatado com ícone oficial do WhatsApp (`components/telefone-whatsapp.tsx`, `lib/format.ts::formatTelefone`), endereço, mapa Leaflet com o PIN exato do serviço, botões "Abrir no Google Maps" e "Compartilhar no WhatsApp" (`lib/whatsapp.ts::waShareLink`).
- **Cobrança Pix por serviço** — completa agora: `lib/pix/static-qr.ts` (builder EMV/BR Code portado de `refs/foco-contabil`), campo "Chave Pix" em `/perfil/editar` (grava em `profiles_pii.chave_pix` via `salvarPerfilAction`), `components/pix/cobranca-pix.tsx` (QR + copia-e-cola, nome do cliente/data/valor no meio) exibido em `/agenda/[slotId]` quando o prestador tem chave configurada. **Não resolvido:** "administrador configurar a chave Pix em nome do prestador" — hoje só o dono edita (RLS `pii_update_self`).
- **Home do Prestador, reconstruída do zero** — antes era 100% v1 ("QUERO TRABALHAR", "Próximas diárias em `<cidade>`" puxando a tabela `vagas`, nada relevante pro papel novo). Agora: atalhos reais (Minha agenda, Meus clientes), nudge "Complete seu perfil" (falta foto/bio/categoria/preço/chave Pix — link direto pra editar), 4 KPIs (próximos horários ou hoje, pendentes aguardando resposta — destacado em amarelo, faturado no mês, realizados total — link pro próprio perfil), gráfico de faturamento dos últimos 6 meses (SVG próprio, sem lib — `components/dashboard/grafico-faturamento.tsx`, hover mostra nº de serviços e nº de clientes distintos do mês), e uma lista "Hoje" (ou "Próximos horários" se hoje estiver vazio) clicável pra cada slot.
- **Contador de "serviços realizados"** — `profiles.servicos_realizados` (migration `0035`, denormalizado via trigger `atualizar_servicos_realizados`) porque `servicos` tem RLS restrita às partes envolvidas; um cliente vendo o perfil público de um prestador que nunca contratou precisa ver o total real, não um SELECT que a RLS zeraria pra zero. Aparece na home do prestador **e** no perfil público (`/perfil/[id]`) — o v1 mostrava "diárias concluídas" (sempre 0 pra um prestador v2); agora mostra o número certo quando `tipo_base = prestador_servico`.
- **Home do Cliente:** seção "Últimos serviços" (5 mais recentes, popover do prestador, status colorido, "Ver todos" pra `/meus-servicos`).
- **Aba Clientes do prestador tinha um bug real de fluxo:** dava pra Renegociar ou Cancelar um serviço pendente, mas não pra **Aceitar** — só existia esse botão em `/agenda/[slotId]`. Corrigido em `components/clientes/servico-cliente-card.tsx`.
- Cards de serviço (Clientes do prestador, Meus Serviços do cliente) refeitos compactos com data+hora real (não só a data de criação) e status colorido — antes eram linhas largas com pouco conteúdo.
- `migration 0036`: `profile_local` também liberado entre partes de um serviço (`tem_servico_com`) como capacidade geral — não é o caminho usado pelo endereço por serviço (que vive em `servicos` direto, mais simples), mas fica disponível se algo precisar da localização "residencial" cadastrada da pessoa.
- `PerfilPopover`: corrigido z-index (`z-[1001]`, estava atrás de mapas Leaflet — Leaflet usa panes com z-index ~200-650); link "Ver perfil completo" agora sempre abre em nova aba.
- Nav lateral: bloco de tema/Sair usava `mt-auto` e colava no fundo do viewport, abrindo um vão enorme em páginas com poucos itens de menu — agora fica logo após o último item do menu. Toggle de tema virou ícone só (sem o texto "Ativar modo escuro/claro").
- `lib/categorias.ts`, tagline da landing, rótulo "Categorias de Prestadores de Serviços" — pequenos textos corrigidos.

Lista completa e detalhada (com o que ainda falta) está em **[ROADMAP.md §0](./ROADMAP.md#0-auditoria--o-que-falta)**.

## Pendências conhecidas (ver ROADMAP §0 pra versão viva, com mais contexto)

- **Recibos de serviço** e **aba Financeiro do prestador** — Leonardo pediu explicitamente pra deixar pra depois ("vamos adicionar depois"). Apontou `refs/foco-contabil` e `refs/careconnect` como referência (ler o `.ua/` desses repos antes de desenhar do zero) e mencionou o próprio recurso deveria existir também num terceiro repo, "amazing-school", não clonado em `refs/`. Detalhe já dado: o prestador pode subir uma assinatura (upload) pra usar nos recibos; se não tiver, o recibo sai só com nome + função, pra imprimir/assinar à mão ou mandar sem assinar mesmo.
- **SysAdmin e Administrador sem dashboard próprio** — ainda caem no `/inicio` genérico (que hoje só tem branches pra Cliente/Prestador/Empresa-vagas). Confirmado ao vivo que isso está errado; ninguém pediu o desenho ainda, então não foi feito.
- **Hero card "feio"** — pendência de design (não de função) que o Leonardo repetiu mais de uma vez sem dar direção concreta do que trocar. Não mexido nesta sessão — precisa de uma conversa de design antes de tentar de novo às cegas.
- Carrossel de fotos do prestador (schema só tem `foto_url` único); aprovação de cadastro do prestador (Telegram/site) + selo "aguardando aprovação"; Telegram (bloqueado — precisa das credenciais do bot do Leonardo); papéis customizados dinâmicos além de "funcionário"; seletor de ícone/logo do workspace; mostrar o comentário público do admin na UI do prestador/cliente (RLS já libera, falta só exibir); verificar se `login_logs` está gravando de fato num login novo pelo formulário (visto vazio numa sessão com cookie antigo — pode não ser bug).

## Tensão de arquitetura não resolvida

O modelo P2P v2 (Prestador de Serviço não pertence a workspace nenhum) conflita com partes do modelo v1 que ainda estão em uso (Administrador/Funcionário publicam/gerenciam `vagas` dentro de um `workspace`). Hoje isso convive como **dois sistemas paralelos na mesma base de código** — `/mapa`, por exemplo, tem branches de código completamente diferentes pra Prestador (v2, `meus_clientes_no_mapa`) vs Administrador/Funcionário (v1, `vaga_local`); `/inicio` também. Antes de expandir qualquer feature que dependa de "Administrador enxerga/gerencia um Prestador" (inclusive o dashboard do Administrador acima), é preciso decidir: prestadores autônomos passam a ser membros de um workspace, ou o conceito de workspace fica restrito ao fluxo antigo de diária? Ver ROADMAP.md §2.2 e a nota ❓ na seção 0.

## Acesso e credenciais — o que NÃO está neste repositório

- **Conta real de SysAdmin do Leonardo** (e-mail/senha reais, não as contas de exemplo): foram passadas verbalmente na conversa, não estão em nenhum arquivo do repo por design (não commitar credenciais reais). Se precisar testar como o SysAdmin de verdade, peça de novo ao Leonardo.
- **Token do Supabase** (`SUPABASE_TOKEN` em `.env.local`, não comitado): Personal/Management API Token da conta inteira do Leonardo, autorizado por ele pra uso livre **neste projeto** (criar tabelas, aplicar migrations, o que for preciso). Não é o mesmo que `SUPABASE_SERVICE_ROLE_KEY` (esse sim é lido pelo app; o `SUPABASE_TOKEN` só serve pra CLI).
- **Credenciais das contas de exemplo** (não sensíveis, são dados fake): estão em `lib/auth/contas-exemplo.ts` e no README — senha única `MeAjudaAi2026!`.

## Convenções que valem a pena internalizar antes de mexer em UI

- `lib/papel-label.ts` (`papelLabel(role, genero)`) e `lib/saudacao.ts` (`boasVindas(genero, nome)`) seguem a mesma regra de 3 formas (masculino/feminino/neutro-com-"e"). Qualquer texto novo que mencione o papel de alguém deve usar `papelLabel`, não uma string fixa.
- Server Component não pode passar função como prop pra Client Component (RSC não serializa closures) — se precisar de um "renderer" customizado vindo de uma página server, passe dados serializáveis + uma prop `variant` e deixe o componente cliente decidir internamente (ver `AgendaCalendarV2`/`DiaTimeline`).
- Nunca expor `profile_local.lat`/`lng` (coordenada exata da residência) fora de RLS restrita — proximidade/mapa de terceiros sempre via função `SECURITY DEFINER` que só devolve distância ou `lat_aprox`/`lng_aprox` (migration `0033`). Já o endereço **de um serviço específico** vive direto em `servicos.endereco/lat/lng` (migration `0037`) porque `servicos` já tem RLS restrita às partes envolvidas — não precisa desse cuidado extra.
- Popovers/overlays client-side: cuidado com z-index perto de mapas Leaflet (panes usam ~200-650) — use `z-[1000]+` pra qualquer coisa que deva ficar por cima de um mapa.
- Cards de lista (serviços, clientes) seguem um padrão compacto consolidado nesta sessão: `rounded-xl border border-line bg-card px-3 py-2.5`, status como pílula colorida (`STATUS_ESTILO` — mesmo mapa de cores repetido em alguns arquivos, poderia virar um util compartilhado se aparecer de novo), nunca o `.card` genérico (p-4, mais espaçoso) pra itens de lista repetidos.
- Todo texto do produto é em PT-BR; comentários de código também.
