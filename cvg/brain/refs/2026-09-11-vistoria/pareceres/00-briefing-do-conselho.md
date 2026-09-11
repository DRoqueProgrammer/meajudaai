# Briefing do Conselho — 2ª rodada de avaliação do "Me Ajuda Aí" (11/09/2026)

Você é um dos 9 agentes do conselho que avaliou este web app ONTEM (10/09/2026). O controller
(Opus 5) te convoca de novo, a pedido do Leonardo, dono do produto.

## O pedido do Leonardo

> "Chame o mesmo conselho de agentes de ontem, que deram scores de 0-100 e sugestões de melhorias.
> Fizemos o que eles pediram. Peça nova rodada de avaliação, quero ver score e possibilidades de
> melhoria sugeridas por cada agente, e no final um score geral e recomendação geral crítica."

Ontem a nota geral foi **48/100**. Ele pediu "faça todas as recomendações destes agentes", e o time
trabalhou ~30 horas nisso (144 commits). Agora quer saber, com honestidade, **o quanto melhorou e o
que ainda falta**. Não seja generoso para agradar nem severo para parecer rigoroso: meça.

## O produto (mesmo de ontem)

- **Marketplace de agendamento de serviços** de construção civil e manutenção: o Prestador de
  Serviço mantém uma agenda de horários; o Cliente busca por proximidade e agenda direto.
- **Fase:** protótipo em pivô da v1 (mural de vagas por diária) para a v2. Ainda há resíduo da v1.
- **Papéis:** SysAdmin · Administrador (gere uma "praça" = tenant por cidade) · Prestador de Serviço
  · Cliente · Funcionário. **Público real:** eletricistas, pedreiros, encanadores e clientes —
  **no celular**, na obra, com pouca paciência.
- **Identidade:** azul `#0D47A1`, amarelo `#FFC107`, verde `#43A047`, Poppins.
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres, Auth,
  Storage, RLS) · Server Actions · Leaflet · PWA · Vercel. Vitest: **427 testes unitários**; integração
  contra o banco real **576/577** (o vermelho é o antigo do banner do SysAdmin, ADR 0009 — conhecido).

## O que mudou desde ontem (commit avaliado ontem: `da13908`; hoje: `e08e529`)

As recomendações viraram 5 fatias: 1 segurança · 2 vitrine v2 e LGPD · 3 redesign · 4 agenda e
desempenho · 5 crescer. Resumo do que entrou (confira você mesmo com
`git log --oneline da13908..e08e529` e `git show`):

- **Fatia 1 — segurança (entregue):** migrations 0038–0041 — serviço só nasce/muda pelo fluxo (regra
  no banco); contato, chave Pix e endereço só entre as partes de um serviço válido; contas de exemplo
  presas ao "mundo de exemplo" (`profiles.exemplo`); ninguém vira Administrador sozinho (o cadastro
  público não aceita mais `admin`); SysAdmin cria praça e vincula Administrador; módulo liberado vale
  só na empresa; convite neutro; login lembra só o e-mail; rate limit nas portas automáticas.
- **Fatia 3 — redesign (entregue):** fundação de tokens, casca, Início, landing, seletor de horário e
  formulários; depois, a pedido do dono, Hero novo (saudação grande, frase, relógio e tempo), cadastro
  em duas colunas com confirmação de senha e foto opcional, "nenhuma conta sem foto".
- **Fatia 2 — vitrine e LGPD (entregue):** "baixar meus dados" e "excluir minha conta" com carência;
  fonte sem Google Fonts (next/font local), clima pelo servidor, banner de cookies honesto, SEO mínimo;
  mural público de anúncios na landing; vitrine pública do prestador (`/p/[id]`); anúncios com limite
  por praça.
- **Fatia 4 — agenda e desempenho (parcial):** sessão memoizada, fuso de São Paulo em tudo, horário
  volta a aceitar reserva depois do cancelamento, cancelar com motivo num formulário, tipos de serviço,
  faturamento empilhado por tipo, período preferido e hora combinada da visita.
- **Fatia 5 — crescer (parcial):** painel da praça (Administrador) e painel da plataforma (SysAdmin)
  no lugar do `/inicio` genérico.
- **Pedidos ao vivo do dono (entregues):** sinalizações entre cliente e prestador com justificativa e
  aprovação do Administrador (red flags), suspensão com aviso formal, "Limpar red flags"; cobrança Pix
  com QR grande (nome/data/valor no meio) e várias chaves; **comissão da plataforma** (alíquota em 4
  níveis, gerada no realizado, "Enviei o Pix" → OK do Administrador); **Financeiro em grade**
  (pessoa × mês, com card de hover, ✓/✗ por serviço, filtros na URL) para o Administrador
  (`/praca/financeiro`) e para o prestador (`/meu-financeiro`); recibos para imprimir/PDF (mensal de
  comissão, nota avulsa, recibo do prestador ao cliente com aviso "sem valor fiscal" e compartilhamento
  por WhatsApp); abas da praça (Serviços, Clientes, Prestadores); "emite nota fiscal" no perfil.
- Migrations novas desde ontem: **0038 a 0059**. Decisões travadas: D-026 a D-048 em
  `cvg/docs/tech-spec/_decisoes-travadas.md`. Continuidade: `HANDOVER.md` (topo). Pendências
  declaradas: `ROADMAP.md` §0.

## Já conhecido e registrado (pesa na nota, mas não é descoberta nova)

- **ADR 0009 / D-030:** o auth hook `custom_access_token_hook` continua sem registro, DE PROPÓSITO —
  registrar antes de escopar as cláusulas de SysAdmin daria o banco inteiro à conta de exemplo pública.
  As escritas administrativas passam por Server Actions com a chave de serviço, depois de conferir
  papel e alcance (`lib/admin/alcance.ts`).
- **D-031:** o "Cancelando…" preso foi mitigado; a causa de fundo não foi isolada.
- **Revisão independente:** o juiz Gemini ficou sem cota; os lotes finais foram revisados pelo
  controller e por um revisor adversarial Sonnet (um achado alto corrigido: recibo com id arbitrário).

## Sua avaliação de ontem

Leia o SEU parecer de ontem antes de tudo:
`C:\Users\leoch\projects\meajudaai\cvg\brain\refs\2026-09-10-vistoria\pareceres\<NN>-<seu-nome>.md`.
Para cada recomendação que você fez ontem, verifique no código/telas de hoje se foi **feita**,
**parcial** ou **não feita** — com evidência. Depois dê a nota de HOJE, com a mesma régua.

## Evidências

**Hoje** (build de produção do commit `e08e529`, `next start` em localhost, capturado com o MESMO kit de
ontem, com as telas novas acrescentadas ao roteiro):
`C:\Users\leoch\AppData\Local\Temp\claude\C--Users-leoch-projects-meajudaai\77d53f84-d612-4728-9ffa-b8d2df3d75b7\scratchpad\vistoria2\evidencias\`
- `INDICE.md` (comece por aqui) · `RESUMO-METRICAS.md` · `manifest.json` · `perf-mobile-4g.json` ·
  `shots/` (PNG, `{papel}__{página}__{viewport}__{N}de{T}.png`; viewports mobile 390×844 @2x, tablet
  768×1024, desktop 1440×900; `-escuro` = tema escuro).
- Saída do build: `C:\Users\leoch\AppData\Local\Temp\mab-v2\build-output.txt`.
- Contas: Marina Costa (cliente), João Ferreira (prestador), Marcelo Lopes (administrador), Ricardo
  Bastos (sysadmin), Beatriz Andrade (funcionário). O mundo de exemplo tem dados de demonstração.

**Ontem** (para comparar): `C:\Users\leoch\projects\meajudaai\cvg\brain\refs\2026-09-10-vistoria\`
— `metricas/RESUMO-METRICAS.md`, `metricas/perf-mobile-4g.json`, `metricas/build-output.txt`, `telas/`
(JPEG "antes", `{papel}__{página}__{viewport}.jpg`) e `relatorio-vistoria.html`.

## Quem mais está no conselho (foque na SUA lente)

| Agente | Lente |
|---|---|
| conselheira-design | visual, UX, tipografia, responsividade, acessibilidade, design system |
| conselheiro-eng-software | arquitetura, testes, CI/CD, reprodutibilidade, observabilidade |
| claude-best-practices-specialist | simplicidade, over-engineering, código morto, duplicação |
| conselheiro-administrador | propósito, utilidade real, jornada, prioridades, monetização |
| marketing-specialist | landing, posicionamento, copy, onboarding, go-to-market por praça |
| conselheira-protecao-dados | LGPD — dados pessoais, consentimento, direitos do titular, políticas |
| performance-optimizer | Core Web Vitals, bundles, renderização, fontes, imagens, mobile |
| supabase-specialist | RLS, Auth, migrations, funções SECURITY DEFINER, Storage |
| code-reviewer | segurança de aplicação (OWASP) e corretude: actions, rotas, middleware |

## Regras (obrigatórias)

- **SOMENTE LEITURA.** Não edite nem crie arquivos no repositório, não faça commit, não rode migration
  nem SQL, não instale pacotes, não suba servidor, não abra navegador, não tente logar no app. Não use
  a chave de serviço do Supabase (o banco é o protótipo real).
- **Nunca rode `npm run build` / `next build`** nem `npm run test:integration` / a config de integração
  (escreve no banco real). `npx vitest run` (unitários) e `npx tsc --noEmit` são permitidos.
- Pode: ler código e docs, `grep`/`ls`/`git log`/`git show`/`git diff`, ver os screenshots.
- Ignore partes da sua persona que dependam de ferramentas indisponíveis aqui (MCPs, KBs de plugin,
  outros repositórios) e o formato de parecer da persona — use o formato abaixo, com a voz, o rigor e a
  régua dela.
- Cite evidência como `arquivo:linha` ou pelo nome do screenshot. Achado CRÍTICO precisa de evidência
  verificável (o controller confere na fonte antes de levar ao Leonardo; ontem um CRÍTICO caiu por
  premissa falsa).

## Formato de entrega (obrigatório)

Responda em **português do Brasil**, em markdown, exatamente nesta estrutura:

```
### <nome-do-agente> — NOTA HOJE: NN/100 (ontem: NN)
**Conceito na sua régua (se tiver):** ...
**Veredito (2-3 linhas):** o que mudou de fato e onde o app está agora.

**Ontem → hoje:** tabela | recomendação de ontem | feita / parcial / não feita | evidência |
(todas as recomendações e quick wins relevantes do seu parecer de ontem)

**Como cheguei na nota:** 3 a 5 sub-critérios, peso (%) e nota parcial 0-100 (ontem e hoje).

**O que está bom** — 3 a 6 bullets com evidência.

**Problemas** — por gravidade. Cada um:
[CRÍTICO|ALTO|MÉDIO|BAIXO] descrição — evidência — impacto. Marque (NOVO) o que não existia ontem.

**Possibilidades de melhoria** — priorizadas. Cada uma: o quê · como, concretamente · esforço
(P ≤ 1 dia / M ≤ 1 semana / G > 1 semana) · impacto esperado.

**Quick wins** — até 5 coisas de até ~1h cada.

**Se eu só pudesse mudar uma coisa agora:** ...
```

**Calibragem (a mesma de ontem):** 90–100 pronto para produção / referência de mercado · 75–89 bom,
ajustes pontuais · 60–74 funcional, com lacunas visíveis · 40–59 protótipo com problemas estruturais ·
abaixo de 40 precisa ser refeito.

Tamanho: 1.000–1.800 palavras (a conselheira-design pode ir até ~2.500).
