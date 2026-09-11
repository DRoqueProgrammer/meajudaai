### code-reviewer — NOTA HOJE: 82/100 (ontem: 64)

**Conceito na sua régua:** B (3,5) — de "quebras concretas de invariantes declaradas" para "os três ALTOS de ontem receberam correção real, com defesa em camadas (banco + app), não só remendo na superfície".

**Veredito (2-3 linhas):** As duas quebras mais graves de ontem — escalação de módulo entre empresas e a corrida na reserva — foram corrigidas de um jeito que eu raramente vejo em protótipo: não só a action ganhou uma checagem, o invariante virou constraint/policy/trigger no banco (índice único parcial, RLS com sub-consulta, `is_chamada_privilegiada()`), então mesmo um bug futuro na action não reabre o buraco. A escalada para Administrador (a "porta 3") também foi fechada com uma regra única centralizada (`lib/auth/papeis.ts`) que cadastro, troca de papel e criação de empresa consultam — nenhuma delas decide por conta própria. O que sobrou foi o previsível: um bug de fuso que migrou para um helper central mas não varreu o código residual da v1, e os BAIXOs que o controller já tinha dito que não valiam a pena perseguir.

**Ontem → hoje:**

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| [ALTO] Escopar `getAllowedModules` por `workspace_id` + checar que o alvo é membro em `setModuloFuncionarioAction` | **Feita** | `lib/auth/modules.ts:29-34` (`.eq("workspace_id", workspaceId)`); `lib/actions/modules.ts:51-56` (`ehMembroDaEmpresa`, R-45/ADR 0014) |
| [ALTO] Corrida na reserva: não reverter pra "livre" quando o insert falha por conflito; `.select().single()` no update condicional | **Feita** — solução melhor que a sugerida | `lib/actions/agenda-v2.ts:167-197` (a action nem tenta mais marcar `agenda_slots`); o invariante virou índice único parcial `servicos_slot_ocupado_unico` (`supabase/migrations/0048_horario_volta_depois_do_cancelamento.sql:22-24`) + RLS `servicos_insert_cliente` com sub-consulta (`0038:69-87`) |
| [ALTO] `hojeBR()` central com `timeZone: America/Sao_Paulo` | **Parcial** | Criado e adotado no fluxo v2 (`lib/datas.ts`, usado em `agenda-v2.ts`, `inicio/page.tsx`, `admin/consultas.ts` etc.) — mas **não varreu tudo**: `lib/periodo.ts:29` (`jaPassou`), `lib/validation.ts:52` (`VagaSchema.data_servico`) e `app/(app)/vagas/page.tsx:26` ainda usam `new Date().toLocaleDateString("sv-SE")` sem fuso — residual v1, ainda executado |
| Agravante: cadastro público aceita `admin`; `trocarMeuPapelAction` escala pra admin | **Feita** | Regra única `lib/auth/papeis.ts` (`papelPermitidoNoCadastro`, `podeTrocarPara`) consultada por `lib/actions/auth.ts:82,111,363`; convite de "owner" só por sysadmin (`lib/actions/convite.ts:23-25`); `criarEmpresaAction` também travada a sysadmin (`lib/actions/workspace.ts:50-51`) |
| [MÉDIO] Enumeração de e-mail em `convidarMembroAction` | **Feita** — inclusive o canal de tempo | `lib/actions/workspace.ts:139-189`: resposta sempre `MENSAGEM_CONVITE_NEUTRA`, toda a parte condicional dentro de `after()` — nenhum ramo atrasa a resposta em relação aos outros |
| [MÉDIO] Remover "Salvar credenciais" (senha em `localStorage`) | **Feita** | `app/(auth)/login/page.tsx`: só guarda e-mail (`CHAVE_EMAIL_LEMBRADO`); entrada antiga de senha é ativamente removida (`CHAVE_CREDENCIAIS_ANTIGA`) |
| [BAIXO] `requireUser` → `tryWriter` em `admin-servicos.ts:14` | **Não feita** | `lib/actions/admin-servicos.ts:4,14` continua com `requireUser` (rebaixado ontem pelo controller — não explora nada hoje, `DEMO_ACCOUNTS` não seedado) |
| [BAIXO] `crypto.timingSafeEqual` no `CRON_SECRET` | **Feita** | `lib/seguranca.ts` (`segredoConfere`: hash SHA-256 dos dois lados + `timingSafeEqual`), usado em `app/api/cron/lembretes-avaliacao/route.ts:25` e `app/api/cron/titular/route.ts:29` |
| [BAIXO] `rateLimit` em `geocodeAddress` | **Feita** | `lib/actions/geocode.ts:31-34` — 10/60s por usuário ou por IP |
| [BAIXO] `import "server-only"` em `demo.ts`/`contas-exemplo.ts` | **Parcial** | `contas-exemplo.ts:1` tem; `lib/auth/demo.ts` continua sem — mas o próprio código confirma que este arquivo é morto (comentário em `contas-exemplo.ts:4-5`: "modo demo... obsoleto, os usuários stub nunca chegaram a ser semeados") |
| [BAIXO] Mensagem neutra no convite de equipe | **Feita** | Mesma evidência do item de enumeração acima |
| [BAIXO] Middleware manda rota inexistente para `/login` | **Não feita** | `middleware.ts:57-61` inalterado — qualquer path não listado em `PUBLIC_PREFIXES` ainda vira 302 pra `/login` em vez de 404 |
| Zod mínimo nas actions "de objeto" (`criarSlotAction`, `cancelarServicoAction`, `proporRenegociacaoAction`...) | **Parcial** | Continuam validações ad-hoc (`agenda-v2.ts:157-160,250,340`), não Zod — mas cobrem os casos óbvios, e o gatilho `validar_transicao_servico` (migration 0038) é a rede de segurança real por trás |

**Como cheguei na nota:**
- Autorização por papel/módulo/dono e IDOR — 30% — **ontem 55 → hoje 85**: `lib/admin/alcance.ts` (`pracaAlcancada`, `atorAlcanca`, `pracasDoAtor`) ficou o ponto único de alcance e é consultado de forma consistente em `comissao.ts`, `suspeitas.ts`, `financeiro.ts`, `anuncios-admin.ts`, `pracas.ts` — inclusive checando o `workspace_id` derivado do PRÓPRIO registro antes de autorizar (nunca confiando no id que o cliente mandou), o padrão exato que faltava ontem.
- Validação de entrada e tratamento de erro — 20% — **75 → 80**: ainda ad-hoc em vez de Zod nas actions de objeto, mas com triggers de banco como segunda camada em quase tudo que é novo (comissão, chaves Pix, recebimentos).
- Corretude (fuso, dinheiro, corrida) — 20% — **55 → 75**: corrida resolvida com solução de banco (melhor que a que eu sugeri); dinheiro tratado em centavos (`somar()` em `comissao.ts:44-46`); fuso corrigido no fluxo novo mas não no residual v1.
- Segredos e rotas sensíveis — 15% — **78 → 88**: CRON_SECRET agora em tempo constante, geocode limitado, `chaves_pix`/`recebimentos` com RLS `_own` explícita e o recibo mensal (`recibo/comissao/[prestadorId]/[mes]`) documenta a própria correção do achado da revisão adversarial de ontem (id arbitrário).
- Abuso (rate limit, enumeração) — 15% — **62 → 82**: enumeração fechada com padrão `after()` que também mata o canal de tempo — solução mais completa do que eu tinha pedido.

**O que está bom**
- `pracaAlcancada`/`atorAlcanca` (`lib/admin/alcance.ts`) virou o único lugar que decide alcance administrativo — toda action nova (comissão, suspeitas, financeiro, anúncios) consulta o mesmo helper em vez de reimplementar a regra, exatamente o anti-padrão que o ADR 0012 tinha registrado contra.
- A corrida da reserva foi resolvida no nível certo: índice único parcial (`where status <> 'cancelado'`) + RLS com sub-consulta, não um "confere de novo na action" — `supabase/migrations/0048_horario_volta_depois_do_cancelamento.sql:20-28`.
- `validar_transicao_servico` (migration 0038) trava toda a máquina de estados de `servicos` no banco, para qualquer role — a action deixa de ser a única linha de defesa.
- `criarConviteAction` fecha a porta de convite-para-owner com uma linha, antes de qualquer outra consulta (`lib/actions/convite.ts:23-25`) — a mesma disciplina "recusa antes de consultar" que ontem só existia em parte do código.
- 427/427 testes unitários passam, `npx tsc --noEmit` limpo — nada quebrou nas ~4.100 linhas novas em `lib/actions`/`lib/admin`.
- Recibo mensal de comissão documenta e corrige, no próprio comentário, o achado da revisão adversarial de ontem (id arbitrário revelando pessoa de outro mundo) — `app/(documento)/recibo/comissao/[prestadorId]/[mes]/page.tsx:36,63-74`.

**Problemas**

[MÉDIO] Fuso ainda quebrado no residual v1 — `lib/periodo.ts:29` (`jaPassou`, decide quando "Avaliar/Concluir" aparecem), `lib/validation.ts:52` (`VagaSchema.data_servico`, valida publicação de vaga) e `app/(app)/vagas/page.tsx:26` continuam em `new Date().toLocaleDateString("sv-SE")` sem `timeZone`. Das 21h às 23h59 em Brasília, uma vaga de "hoje" pode ser recusada como "no passado", e uma vaga já vencida ainda aparece elegível para candidatura — o mesmo bug de ontem, só que restrito ao código que a v1 ainda usa (mas usa de verdade: `/vagas` é rota viva). (parte do ALTO de ontem, agora rebaixado — o fluxo principal v2 foi corrigido)

[BAIXO] `comentarServicoAction` continua com `requireUser` em vez de `tryWriter` (`lib/actions/admin-servicos.ts:14`) — inconsistência sem exploração hoje, mantida do parecer de ontem.

[BAIXO] Middleware redireciona qualquer rota inexistente para `/login` em vez de 404 (`middleware.ts:57-61`) — cosmético, sem risco de segurança.

[BAIXO] `lib/auth/demo.ts` guarda 4 senhas em texto puro sem `import "server-only"` — o próprio código já documenta que é morto (nunca semeado); ainda assim, é o tipo de arquivo que sobrevive por inércia e um dia alguém religa.

[BAIXO] `trocarMeuPapelAction(novo: "admin" | "prestador_servico")` mantém `"admin"` no tipo do parâmetro mesmo que `podeTrocarPara` sempre recuse — o bloqueio funciona (testei a lógica: `novo === "admin"` nunca passa), mas o tipo sugere uma opção que não existe; TypeScript não pega isso porque a recusa é em runtime, não no tipo.

**Possibilidades de melhoria** — priorizadas
- Trocar as 3 chamadas residuais de `toLocaleDateString("sv-SE")` por `hojeEmSaoPaulo()`/`dataEmSaoPaulo()` (`lib/periodo.ts:29`, `lib/validation.ts:52`, `app/(app)/vagas/page.tsx:26`) · **P** · fecha de vez o bug de fuso, já que o helper certo já existe e está testado.
- `requireUser` → `tryWriter` em `comentarServicoAction` · **P** · consistência, sem risco real hoje.
- Apertar o tipo de `trocarMeuPapelAction` para `novo: "prestador_servico"` só (ou documentar por que `"admin"` continua no tipo) · **P** · remove um sinal falso pra quem for ler a assinatura depois.
- Migrar as validações ad-hoc de `agenda-v2.ts` (`criarSlotAction`, `cancelarServicoAction`, `proporRenegociacaoAction`) para schemas Zod centralizados · **M** · mais fácil de auditar tudo de uma vez; hoje cada checagem está espalhada e só a trigger do banco garante o invariante de fato.
- Remover `lib/auth/demo.ts` (confirmado morto pelo próprio código) em vez de deixá-lo com senhas hardcoded esperando alguém religar `/api/demo/enter` · **P**.

**Quick wins**
- 3 substituições de `toLocaleDateString("sv-SE")` por `hojeEmSaoPaulo()`.
- `requireUser` → `tryWriter` em `admin-servicos.ts:14`.
- Apagar `lib/auth/demo.ts` (ou ao menos `import "server-only"` nele).
- Ajustar o tipo de `trocarMeuPapelAction`.
- `import "server-only"` também em qualquer outro arquivo de `lib/auth/` que ainda falte (conferir `exemplo.ts`, `papeis.ts` — hoje não guardam segredo, mas é o padrão do resto da pasta).

**Se eu só pudesse mudar uma coisa agora:** varrer o fuso residual (`lib/periodo.ts`, `lib/validation.ts`, `vagas/page.tsx`) — é o único item que ainda repete, ao pé da letra, um problema que eu já tinha marcado ALTO ontem, e o conserto é dessa vez trivial: o helper certo já existe, só falta trocar três chamadas.
