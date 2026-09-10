### claude-best-practices-specialist — NOTA: 62/100
**Conceito:** C+ (degrau 3 de 7 da escada — já reusa em boa parte do app, mas pula validação e consistência na feature que mais importa agora)

**Veredito:** O v1 morreu de forma limpa em pouca coisa (~185 linhas realmente órfãs, fácil de apagar) e continua vivo, sem querer, em lugares que importam — um CTA de mural de vaga aparece pro SysAdmin de verdade. O problema maior não é código morto: é que o v2 (Agenda, a feature do pivô) tem menos disciplina de validação e de padrão de escrita do que o v1 que ele está substituindo.

**Como cheguei na nota:**
- Código morto / resíduo v1 vivo (20%): 60
- Consistência de padrões — Server Actions, `useActionState`, zod (30%): 50
- Duplicação vs. abstração que paga aluguel (20%): 78
- Inegociáveis — trust boundary, erro, acessibilidade (20%): 62
- Documentação / instruções pra agentes (10%): 70

**O que está bom**
- `lib/papel-label.ts` é a abstração certa: nenhum componente tem string de papel hardcoded.
- `components/ui.tsx` e `app/globals.css` têm comentário que paga aluguel (`ui.tsx:12-15` explica a matemática de contraste do amarelo; `globals.css:141-151` documenta extrações reais).
- `app/(app)/mapa/page.tsx:9-18` — coexistência v1/v2 documentada, transição nomeada.
- `lib/validation.ts` centraliza schemas zod com comentário de regra de negócio.
- `lib/actions/*` pequenos e coesos (mediana 30–110 linhas).
- `FormError` (`components/ui.tsx:144-151`) com `role="alert"` e nota do bug corrigido.

**Problemas**
- [CRÍTICO] O CTA "QUERO TRABALHAR" (mural de vaga v1, aponta pra `/vagas`) aparece pro SysAdmin — `app/(app)/inicio/page.tsx:296-363` trata admin/funcionário, cliente e prestador; `sysadmin` cai no `else` (347-363) e recebe a UI de "ajudante", papel que não existe mais (`lib/auth/roles.ts:3`).
- [ALTO] A Agenda v2 (feature central do pivô) quebra o padrão do `CLAUDE.md` (Server Actions + `useActionState` + FormData, funcionar sem JS). `lib/actions/agenda-v2.ts` expõe 8 funções com objeto tipado; os 6 componentes (`criar-slot-form.tsx:32-48`, `slot-reservar.tsx`, `slot-detalhe.tsx`, `responder-renegociacao.tsx`, `cancelar-servico-botao.tsx`, `agenda-calendar.tsx`) usam `useTransition` + `preventDefault`. Sem JS, não enviam nada. O v1 (`publicar-form.tsx`) respeita o padrão que o v2 quebra.
- [ALTO] Nenhuma das 8 funções de `agenda-v2.ts` valida com zod. `reservarSlotAction` (83-140) grava `endereco`/`descricao` sem limite e `lat`/`lng` sem faixa em `servicos`.
- [MÉDIO] 14 dos 19 arquivos em `lib/actions/` não usam os schemas de `lib/validation.ts`.
- [MÉDIO] `ROADMAP.md` §0 já desatualizado: diz que a UI de Pix não existe, mas `lib/pix/static-qr.ts`, `components/pix/cobranca-pix.tsx` e o uso em `app/(app)/agenda/[slotId]/page.tsx:82-92` existem desde o commit `541d6e0`.
- [BAIXO] `components/agenda/agenda-calendar.tsx`, `agenda-view.tsx` e `lib/agenda-conflitos.ts` não são importados por nenhuma página.
- [BAIXO] `app/page.tsx` (landing) usa 26 valores arbitrários do Tailwind (`text-[13.5px]`, `px-[18px]`, `border-[#C9CFD8]`...) fora da escala/tokens — a página mais visível foge do design system.
- [BAIXO] `#0D47A1` hardcoded em `app/layout.tsx:13` e `components/denunciar.tsx:126`.
- [BAIXO] Skills do Converge triplicadas byte a byte em `.claude/skills/`, `.agents/skills/` e `.grok/skills/`.

**Contribuições de melhoria**
1. Branch explícito para `sysadmin` em `/inicio`, removendo o CTA "QUERO TRABALHAR"/`/vagas` · P · risco baixo.
2. Migrar `agenda-v2.ts` + 6 componentes para `useActionState`/FormData + zod (`AgendaSlotSchema`/`ReservaSchema`) · M · risco médio (muda assinatura das actions).
3. Apagar o código morto confirmado (`agenda-calendar.tsx`, `agenda-view.tsx`, `lib/agenda-conflitos.ts` + teste) · P · risco muito baixo.
4. Atualizar o §0 do ROADMAP ao fechar sessões · P.
5. Padronizar validação nas 14 actions sem zod, começando por dinheiro/PII · G · um commit por action.
6. Um único lugar para as skills (script de sync ou junction) · P-M.

**Quick wins**
- Trocar `#0D47A1` hardcoded pelo token.
- Apagar os 3 arquivos mortos.
- Trocar valores arbitrários da landing pela escala do Tailwind.
- Corrigir a linha do Pix no ROADMAP §0.

**Se eu só pudesse mudar uma coisa:** migrar a Agenda v2 pro padrão `useActionState` + zod que o resto do app já sabe fazer — é o único ponto onde a feature nova está pior, em disciplina, do que a v1 que ela substitui.
