### code-reviewer — NOTA: 64/100
**Conceito:** C (2,5) — arquitetura de segurança correta na maior parte, com quebras concretas de invariantes que o próprio código declara.

> Verificação do controller (Opus 5):
> - **Rebaixado de CRÍTICO para BAIXO:** `comentarServicoAction` sem `tryWriter`. O `tryWriter` (`lib/auth/guard.ts:15-19`) só bloqueia os e-mails de `DEMO_ACCOUNTS`, contas que nunca foram semeadas (`lib/auth/contas-exemplo.ts:2-4`); o cenário via `/api/demo/enter` não funciona. As contas de exemplo reais escrevem por design — o risco verdadeiro é o apontado pelo supabase-specialist (SysAdmin de exemplo público).
> - **Confirmado:** a condição de corrida em `reservarSlotAction` (`lib/actions/agenda-v2.ts:116-137`).
> - **Agravante confirmado:** o cadastro público aceita `tipo_base: "admin"` (`lib/validation.ts:13`; só `funcionario` é barrado sem convite em `lib/actions/auth.ts:72`) e `trocarMeuPapelAction` (`auth.ts:291-347`) deixa um prestador virar administrador com empresa própria. Qualquer pessoa pode se tornar Administrador — contraria o ROADMAP §2.1 (só o SysAdmin cria Administrador) — e isso torna a escalada de módulo abaixo acessível a qualquer um.

**Veredito:** O padrão dominante (`tryWriter`, Zod nos formulários, `service_role` isolado, RLS + checagem de app em camadas) é sólido e consistente. Mas há uma escalação de módulo entre empresas (quebra o isolamento D-001), uma corrida que desfaz reservas legítimas e um bug de fuso que atinge todo usuário das 21h à meia-noite.

**Como cheguei na nota:**
- Autorização por papel/módulo/dono e IDOR — 30% — 55
- Validação de entrada e tratamento de erro — 20% — 75
- Corretude (fuso, dinheiro, corrida) — 20% — 55
- Segredos e rotas sensíveis — 15% — 78
- Abuso (rate limit, enumeração) — 15% — 62

**O que está bom**
- `tryWriter`/`requireWriter` em 17 de 18 arquivos de `lib/actions/`, exceções documentadas.
- `/auth/confirmar` monta o redirect por concatenação fixa (`app/auth/confirmar/route.ts:39-40`) — `next=//evil.com` não escapa.
- Segredos isolados: `createAdminClient` com `"server-only"`; `SENHA_CONTA_EXEMPLO` só em código de servidor.
- `servicos.slot_id` tem `unique` (`0024:50`) — a corrida não duplica reserva.
- Rate limit (`lib/rate-limit.ts`) nos pontos certos, com limitação documentada.
- `CRON_SECRET` recusa por padrão quando a env não existe.

**Problemas**
[ALTO] Escalação de módulo entre empresas. `getAllowedModules` (`lib/auth/modules.ts:19-29`) filtra `user_modules` só por `user_id`, sem `workspace_id` (ao contrário de `getAllowedCapabilities`, 52-70). `setModuloFuncionarioAction` (`lib/actions/modules.ts:14-42`) checa que quem chama é owner do workspace, mas não que o alvo é membro dele. Com uma empresa-casca própria (ver agravante acima), dá para ligar "financeiro"/"relatorios" para funcionário de outra empresa, e `guardModule` libera a página com dados da empresa real.
[ALTO] Corrida na reserva: o `update ... eq("status","livre")` não confere linhas afetadas; quando o insert do perdedor falha por `unique(slot_id)`, o código devolve o slot para `livre` (linha 135), desfazendo a reserva do vencedor.
[ALTO] "Hoje" do servidor não é `America/Sao_Paulo`: `toLocaleDateString("sv-SE")` sem `timeZone` herda UTC na Vercel. Usado em `lib/validation.ts:31`, `lib/periodo.ts`, `app/(app)/inicio/page.tsx:115`, `app/(app)/prestador/[id]/page.tsx:26`, `lib/actions/agenda-v2.ts:60` e outros — errado das 21h às 23h59 todo dia.
[MÉDIO] Enumeração de e-mail em `convidarMembroAction` (`lib/actions/workspace.ts:121-136`), ao contrário do cuidado de `recuperarSenhaAction`.
[MÉDIO] Senha em texto puro no `localStorage` ("Salvar credenciais", `app/(auth)/login/page.tsx:10,43-58`) — o `autocomplete` já está certo; o navegador faz melhor.
[BAIXO] `comentarServicoAction` usa `requireUser` em vez de `tryWriter` (`lib/actions/admin-servicos.ts:14`) — inconsistência (rebaixado, ver nota).
[BAIXO] `CRON_SECRET` comparado sem tempo constante.
[BAIXO] `geocodeAddress` sem rate limit (Nominatim tem limite de ~1 req/s por IP).
[BAIXO] `lib/auth/demo.ts` e `contas-exemplo.ts` sem `import "server-only"`.
[BAIXO] Middleware manda rota inexistente para `/login` (`middleware.ts:57-61`).

**Contribuições de melhoria**
- Escopo por workspace em `getAllowedModules` + checar que o alvo é membro em `setModuloFuncionarioAction`; remover "admin" do cadastro público e da troca de papel · P.
- `hojeBR()` central com `timeZone: "America/Sao_Paulo"` (ou `TZ` na Vercel) · M.
- `.select("id").single()` no update condicional da reserva; não reverter para `livre` quando o insert falha por conflito · P.
- Mensagem neutra no convite de equipe · P.
- Remover "Salvar credenciais" · P.
- Zod mínimo nas actions "de objeto" (`criarSlotAction`, `confirmarServicoAction`, `proporRenegociacaoAction`, `cancelarServicoAction`...) · M.

**Quick wins**
- `requireUser` → `tryWriter` em `admin-servicos.ts:14`.
- `crypto.timingSafeEqual` no `CRON_SECRET`.
- `import "server-only"` em `demo.ts` e `contas-exemplo.ts`.
- `rateLimit` em `geocodeAddress`.
- Mensagem neutra em `convidarMembroAction`.

**Se eu só pudesse mudar uma coisa:** a escalação de módulo entre empresas — quebra uma decisão de arquitetura declarada (isolamento D-001) e o conserto é pequeno.
