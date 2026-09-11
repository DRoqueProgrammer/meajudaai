### conselheira-protecao-dados — NOTA HOJE: 66/100 (ontem: 28)

**Conceito na minha régua:** B (2,0 pts) — aceitável como rascunho avançado, precisa de advogado antes de virar documento final. Não é B+ porque dois problemas continuam materiais: um deles novo, verificável e grave (chave Pix sobrevive à "anonimização"); o outro é a pergunta central desta vistoria (D-045) e minha resposta, com a lei na mão, é que a resposta dada não sustenta uma fiscalização.

**Veredito:** Ontem eu vi um documento de marketing disfarçado de política, colado num produto que não existia mais. Hoje o time reescreveu a Política e os Termos para descrever o produto real, construiu um mecanismo genuíno de acesso e eliminação (exportação + anonimização + carência travada por gatilho + cron de expurgo), nomeou o encarregado com nome e e-mail reais, e corrigiu quatro CRÍTICOs de ontem (v1 no texto, senha em `localStorage`, endereço exposto, transferência internacional omitida). É a melhora mais acentuada de qualquer lente deste conselho que eu conseguiria imaginar em 30 horas. Mas a Fatia 5 (comissão, chaves Pix, recibos, sinalizações), toda construída DEPOIS que a Política foi assinada, não voltou para dentro do mecanismo de titular nem do texto — e a decisão do dono sobre sinalizações (D-045) recategoriza dado pessoal do alvo como "registro da administração", o que a lei não permite fazer por decreto interno.

> **Nota do controller:** o CRÍTICO da chave Pix foi conferido na fonte — `chaves_pix`, `recebimentos`, `notas_avulsas` e `comissoes` não aparecem em `lib/titular/anonimizar.ts` nem em `lib/titular/exportar.ts`. Procede.

## Ontem → hoje

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| Reescrever privacidade + termos para a v2 | **Feita** | `app/(legal)/privacidade/page.tsx`, `app/(legal)/termos/page.tsx` — v2 completa, base legal por finalidade, commit `6191e65` |
| Nomear processadores e a base do art. 33 | **Feita** | `privacidade/page.tsx:111-151` — Supabase, Vercel, OpenStreetMap, Open-Meteo, ipapi.co nomeados; parágrafo dedicado a transferência internacional |
| Exportação e eliminação/anonimização reais | **Feita, com gap novo** | `lib/titular/exportar.ts`, `lib/titular/anonimizar.ts`, migrations 0042/0043 — mecanismo real, mas não cobre a Fatia 5 (ver Problemas) |
| Parar de salvar senha em `localStorage` | **Feita** | `app/(auth)/login/page.tsx:49-76` — só o e-mail é lembrado, senha nunca toca `localStorage` |
| Mover `profiles.endereco` para tabela com RLS estrita | **Feita** | migration `0039_contato_e_endereco_entre_as_partes.sql` — coluna migrada para `profile_local`, `profiles.endereco` dropada |
| Documentar o balanceamento das anotações privadas | **Parcial** | `privacidade/page.tsx:94-100` — texto de legítimo interesse existe, mas o acesso ainda depende de pedir manualmente ao encarregado, sem botão |
| Trocar fotos Unsplash de pessoas reais por avatares gerados | **Não feita — piorou** | D-036 (`_decisoes-travadas.md:316-320`) manda o oposto: fotos reais do randomuser.me agora valem para CONTAS REAIS, não só demo (`lib/actions/auth.ts:154`) |
| Nomear o encarregado | **Feita** | `privacidade/page.tsx:204-209`, `lib/contato.ts:1-5` — Leonardo Chalhoub, e-mail pessoal real |
| Cron de expurgo/anonimização de `login_logs` | **Feita** | `app/api/cron/titular/route.ts:57-66` — expurga `login_logs` >180 dias, condiz com o texto |
| Atualizar data + changelog nas páginas legais | **Feita** | `privacidade/page.tsx:220-226`, `termos/page.tsx:139-144` — "Versão 1.0" com histórico |
| Banner de cookies honesto | **Feita** | `components/cookie-consent.tsx:8-16` — só "Entendi", sem "Recusar" decorativo |

## Como cheguei na nota

- Consistência produto v2 × texto publicado (25%): ontem 5 → hoje **75** — preciso para o que cobre, mas silencioso sobre tudo que a Fatia 5 trouxe (comissão, recibos com nome, sinalizações, várias chaves Pix): a Política é do dia 10/09 e essas features são decisões do dia 11/09 pela manhã (`_decisoes-travadas.md`, "Rodada 9").
- Direitos do titular operacionalizados (25%): ontem 15 → hoje **55** — o mecanismo em si (exportar/anonimizar) é sério e bem construído, mas materialmente incompleto: falta a Fatia 5 inteira e o D-045 tira até conteúdo AUTORAL do titular.
- Base legal por finalidade + transferência internacional (20%): ontem 10 → hoje **85** — mapeamento explícito, art. 33 citado corretamente.
- Segurança do tratamento, art. 46 (15%): ontem 20 → hoje **80** — os dois CRÍTICOs de segurança de ontem (senha, endereço) resolvidos.
- Encarregado + retenção com prazo real (15%): ontem 20 → hoje **80** — DPO nomeável e contatável, retenção de `login_logs` real; retenção do módulo financeiro não documentada.

## O que está bom

- `anonimizarTitular` (`lib/titular/anonimizar.ts:62-251`) é um trabalho sério de anonimização de verdade: 18 passos, cada um confere erro e lança (`AnonimizacaoFalhou`), idempotente, nunca deleta `auth.users` (preserva a integridade do histórico da outra parte) — isto é o oposto do "desativar reversível" que eu reprovei ontem.
- A carência de 7 dias deixou de ser um default de coluna e passou a ser imposta por gatilho (`0043_carencia_travada_e_conta_removida.sql:17-50`): uma sessão comprometida não consegue mais forçar a data pra trás nem reabrir um pedido cancelado — corrige exatamente a lacuna que eu teria encontrado se tivesse testado a 0042 sozinha.
- Política de Privacidade nomeia cada processador e declara a transferência internacional por nome (`privacidade/page.tsx:118-151`) — Supabase, Vercel, OpenStreetMap, Open-Meteo, ipapi.co — em vez do genérico "usamos provedores".
- Cookie banner deixou de ser enganoso: `components/cookie-consent.tsx:8-16` documenta a própria correção no comentário, citando meu achado de ontem.
- Fonte 100% self-hosted (`app/layout.tsx:2-8`): comentário no próprio código explica que evita a requisição a `fonts.googleapis.com` — sem tráfego de terceiro pré-consentimento.
- Encarregado citado por nome e e-mail real, não um placeholder (`privacidade/page.tsx:204-209`; `lib/contato.ts:1-5`).

## Problemas

[CRÍTICO] **(NOVO)** Chave Pix não anonimiza. `chaves_pix` (migration `0056_varias_chaves_pix.sql:13-20`) guarda até 5 chaves reais (CPF, e-mail, telefone ou chave aleatória) por pessoa. `lib/titular/anonimizar.ts` não tem nenhuma referência a essa tabela — busquei e não há (`grep chaves_pix lib/titular/` = zero ocorrências) — enquanto o passo 9 limpa só o campo legado único `profiles_pii.chave_pix`. Como a conta nunca é deletada de `auth.users` (de propósito, para preservar histórico), as linhas em `chaves_pix` sobrevivem para sempre, intactas, depois que o pedido é marcado "concluído". A Política promete: *"seus dados pessoais são anonimizados em até 15 dias"* (`privacidade/page.tsx:164-167`) — essa frase é falsa para a chave Pix. É um dado financeiro sensível (viabiliza transferência de dinheiro) sobrevivendo à própria eliminação que o produto anuncia. Impacto: a alegação central do produto ("baixar/excluir meus dados") é falsificável no código, no exato ponto que este conselho pediu para verificar.

[CRÍTICO] **Sinalizações e a D-045 não resistem ao art. 18/art. 6, IV.** `flags_da_pessoa` (`supabase/migrations/0055_sinalizacoes_nas_duas_direcoes.sql:87-113`) devolve a bandeira aprovada para QUALQUER pessoa do papel oposto (todo prestador vê flags de qualquer cliente; todo cliente vê flags de qualquer prestador — não apenas a contraparte do serviço específico) e para a administração — mas nunca para o próprio alvo (`auth.uid() <> p_alvo`), chamada de `/perfil/[id]` (`app/(app)/perfil/[id]/page.tsx:114`), a tela pública que qualquer usuário logado abre. D-045 (`_decisoes-travadas.md:397-400`) resolve isso dizendo que são *"registros pertencentes ao Administrador, nunca dados dos prestadores ou clientes"* — e por isso saem de "Baixar meus dados" (`lib/titular/exportar.ts:69-72`). Juridicamente isso inverte a definição de dado pessoal: o art. 5º, I da LGPD define dado pessoal pela relação com a pessoa identificada, não por quem escreveu ou administra o registro — quem decide se algo é dado pessoal é a lei, não uma decisão de produto. O resultado prático é o mais grave possível: um fato sobre a pessoa é mostrado a QUALQUER estranho do papel oposto que abrir o perfil dela, mas escondido da própria pessoa — exatamente o oposto do art. 6º, IV (livre acesso: "consulta facilitada... sobre a integralidade de seus dados pessoais") e do art. 18, II (confirmação da existência de tratamento). Sem contraditório: o alvo nunca sabe que existe uma sinalização aprovada sobre ele, não tem como contestar antes da aprovação nem depois.

[CRÍTICO] **A mesma D-045 exclui até o que a PESSOA ESCREVEU sobre si mesma.** O comentário em `lib/titular/exportar.ts:69-72` diz explicitamente: *"Sinalizações (as que ela escreveu e as que a têm como alvo) [...] NÃO entram [no Baixar meus dados]: são registros da administração."* Uma sinalização que a própria pessoa AUTOROU (a `justificativa` que ela mesma digitou, seu próprio relato) é, sem nenhuma ambiguidade possível, dado pessoal dela — é o mesmo tipo de conteúdo que `mensagens_enviadas` (incluída na exportação) já trata como pertencente ao autor. Excluir isso da própria exportação não tem base jurídica alguma; é a decisão do dono indo além até de onde a preocupação original (proteger o processo de moderação) justificaria.

[ALTO] **(escalou desde ontem)** Fotos de pessoas reais desconhecidas atribuídas a contas reais de produção. Ontem eu via isso só nas contas de exemplo (Unsplash). Hoje, por decisão explícita D-036 (`_decisoes-travadas.md:316-320`), toda conta REAL sem foto — cadastro de verdade, `lib/actions/auth.ts:154`, ou depois de remover a própria foto, `lib/actions/perfil.ts:169` — recebe um retrato do randomuser.me pelo gênero. O próprio `docs/FOTOS_DEMO.md:9-13` (ainda no repo, contradito pelo topo do arquivo) registra por que isso é problemático: *"anexar o rosto de alguém de verdade a uma identidade fabricada seria apresentar essa pessoa como usuária de um serviço que ela nunca usou."* Isso não é mais um problema de LGPD sobre o titular da conta — é direito de imagem (art. 5º, X CF; art. 20 CC) de um terceiro completamente estranho ao produto, que nunca deu qualquer consentimento, tendo o rosto usado para representar um eletricista ou uma cliente real cujo endereço um estranho vai visitar em casa. Quem tomou essa decisão foi, pela própria D-045, "o encarregado de dados" — o que reforça a preocupação: não houve segunda opinião jurídica.

[ALTO] **(NOVO)** Financeiro inteiro fora do raio do titular. `recebimentos.pagador_nome` e `notas_avulsas.pagador_nome` (nome em texto puro, migrations `0059:18-30` e `0058:34-46`) não são tocados por `anonimizarTitular` nem aparecem em `exportarDadosDoTitular`. Um prestador que pede exclusão continua com seu histórico de recebimentos e chaves Pix intacto no banco; um cliente cujo nome está gravado em recibos emitidos por um prestador não tem como sequer saber disso pela própria conta.

[MÉDIO] Anotações privadas do prestador sobre o cliente continuam sem mecanismo de acesso no produto — a Política (`privacidade/page.tsx:94-100`) promete que a pessoa "pode pedir ao encarregado" para saber o teor, mas isso depende de um e-mail manual, não de um botão. Parcial, não resolvido.
[MÉDIO] Política silenciosa sobre a Fatia 5: comissão, recibo, nota avulsa, várias chaves Pix e sinalizações não aparecem no inventário de dados (seção 1) nem na retenção (seção 5) — a Política foi assinada em 10/09 e essas features nasceram em 11/09.
[BAIXO] Ainda sem registro de qual versão da Política cada usuário aceitou (mesmo achado de ontem, não resolvido).

## Possibilidades de melhoria

- Incluir `chaves_pix`, `recebimentos`, `notas_avulsas`, `comissoes` (por id do titular) em `anonimizarTitular` e em `exportarDadosDoTitular` · **P** · impacto alto — fecha o CRÍTICO mais grave e mais fácil de corrigir tecnicamente.
- Rever D-045 com o encarregado: no mínimo, dar ao alvo o direito de SABER que existe uma sinalização aprovada e o motivo (categoria `motivo`, sem o texto livre se quiser proteger o autor), e devolver ao titular as sinalizações que ELE MESMO escreveu na própria exportação · **M** · impacto alto — é a pergunta que este conselho pediu para responder.
- Trocar o fallback de foto de randomuser.me por avatar gerado (iniciais/geométrico) ou IA, restaurando a doutrina de `docs/FOTOS_DEMO.md` também para contas reais · **P** · impacto médio-alto (risco de imagem de terceiro).
- Atualizar a Política (seção 1 e 5) para cobrir o módulo financeiro e as sinalizações, mesmo que a resposta sobre D-045 não mude — hoje o texto está desatualizado por decisões um dia mais novas que ele · **P** · impacto médio.
- Dar ao alvo de uma sinalização recusada/pendente visibilidade de que algo está em análise, sem revelar o autor — reduz o problema de due process sem quebrar o objetivo de moderação · **M** · impacto médio.

## Quick wins

- Adicionar `chaves_pix` ao passo 9 de `anonimizarTitular` (delete, igual ao `profile_local`) — poucas linhas, mesmo padrão já usado.
- Adicionar `chaves_pix`, `recebimentos`, `notas_avulsas` a `exportarDadosDoTitular` (mesmo padrão `.eq(coluna, userId)`).
- Uma frase na Política citando o módulo financeiro (comissão, recibos, chaves Pix) no inventário de dados.
- Reverter a exclusão das sinalizações AUTORADAS pela própria pessoa em `exportar.ts` — mantém a exclusão das recebidas se quiser sustentar D-045, mas para de negar o que ela mesma escreveu.
- Nomear o randomuser.me na Política como fonte de foto padrão (transparência mínima enquanto a decisão de produto não muda).

## Se eu só pudesse mudar uma coisa agora

Fechar o gap da Fatia 5 no mecanismo de titular — nem que seja só `chaves_pix` primeiro, porque é o mais perigoso (chave financeira sobrevivendo à "exclusão") e o mais fácil de corrigir (a arquitetura de `anonimizarTitular`/`exportarDadosDoTitular` já existe e é boa; só falta estender). Ele custou o produto ficar honesto no texto e ganhar um mecanismo real, mas deixou uma promessa central falsificável no próprio código — e é exatamente esse tipo de contradição entre o texto e o código que eu, e a ANPD numa fiscalização real, vamos sempre conferir primeiro.
