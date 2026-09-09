# DESIGN: Me Ajuda Aí v2 — Marketplace de Agendamento

> Design técnico gerado a partir do [ROADMAP.md](./ROADMAP.md) (que consolidou brainstorm + define ao longo de várias sessões dictadas por Leonardo). Não existe um `DEFINE_*.md` formal separado — o ROADMAP cumpre esse papel. Adaptação do processo SDD do AgentSpec: sem `sdd-brainstorm` (já feito na conversa), sem spec-linter (este repo não tem o scaffold `.claude/sdd/` do agentspec).

## Metadados

| Atributo | Valor |
|---|---|
| **Feature** | MEAJUDAAI_V2 |
| **Data** | 2026-09-09 |
| **Requisitos-fonte** | [ROADMAP.md](./ROADMAP.md) |
| **Status** | Ready for Build (Fase A) |

---

## ⚠️ Achado crítico — isto não é greenfield

Antes de desenhar, auditei o schema e o código atuais. **Boa parte da arquitetura v2 já existe**, provavelmente de um trabalho anterior (comentários no código citam explicitamente o padrão CareConnect, o mesmo que o ROADMAP recomenda reaproveitar):

| Requisito do ROADMAP | Já existe? | Onde |
|---|---|---|
| 4 papéis (sysadmin/admin/funcionário + um papel de "trabalhador") | ✅ Sim, quase idêntico | `tipo_base` em `profiles`, migration `0008_rbac_roles.sql`: `sysadmin \| admin \| funcionario \| ajudante` |
| RBAC por módulo, funcionário nasce sem módulos, admin liga na hora da criação | ✅ Sim | `user_modules` (migration `0009`), `lib/auth/modules.ts` |
| **Bloqueio de rota no servidor quando módulo não autorizado** (o requisito de segurança que o Leonardo marcou como crítico) | ✅ **Já implementado** | `guardModule()` em `lib/auth/modules.ts:40` — redireciona para `/inicio` no servidor, não é só esconder item de menu |
| Convite para novos membros | ✅ Sim (por link, não WhatsApp ainda) | `invite` (migration `0016`), rota `/convite/[token]` |
| Separação de coordenada exata vs. aproximada | ✅ Sim, mas só para `vagas` | `vaga_local` (exata, RLS estrita) + `vagas.local_aprox_lat/lng` (migration `0014`) — **é o mesmo padrão que precisamos aplicar a `profiles`** |
| Agenda | ⚠️ Existe, mas é o conceito **errado** para a v2 | `/agenda` hoje é a agenda pessoal do `ajudante` (diárias aceitas + dias de indisponibilidade em `bloqueio_agenda`) — não é "horários que um prestador oferece e um cliente reserva" |
| Papel **Cliente** | ❌ Não existe | Precisa ser criado — é o maior buraco estrutural |
| SysAdmin vê tudo, incl. logs sobre admins | ⚠️ Parcial | `sysadmin` já é god-mode nas RLS policies, mas não há tabela de logs/auditoria ainda |
| Hero, Telegram, preço/renegociação, gênero, cookies, IBGE | ❌ Não existe | Net-new |

**Conclusão:** o papel `ajudante` está referenciado em **65 arquivos** (`.ts`/`.tsx`/`.sql`). Trocar o modelo de papéis é um refactor real com blast radius grande — vou desenhar em fases, não como um único PR gigante (consistente com o pedido do Leonardo de commits pequenos e sem pressa, ver `CLAUDE.md` §Fluxo de trabalho).

---

## Arquitetura alvo

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      PAPÉIS (profiles.tipo_base)                     │
├──────────────────────────────────────────────────────────────────────┤
│  sysadmin  →  admin (workspace)  →  funcionario (módulos custom)     │
│                     ↓                                                │
│         prestador_servico  ←→  cliente   (novo par v2)               │
│         (era "ajudante")      (não existe hoje)                      │
└──────────────────────────────────────────────────────────────────────┘

  Cliente busca (proximidade) ──► Perfil do Prestador ──► Agenda (slots)
        │                                                      │
        ▼                                                      ▼
  Solicita horário + descrição ──► Telegram (admin/prestador) ──► Serviço
                                                                   │
                                                    ┌──────────────┼──────────────┐
                                                    ▼              ▼              ▼
                                              Renegociação    Log privado    Comentário
                                              (aceite do        (prestador)   admin
                                               cliente)                     (priv/público)
```

**Componentes principais:**

| Componente | Papel | Tecnologia |
|---|---|---|
| `lib/auth/roles.ts` | Fonte da verdade do papel do usuário | Next.js server, Supabase |
| `lib/auth/modules.ts` | Gate de autorização por módulo (já existe, estender) | Next.js server-only |
| `profile_local` (nova tabela) | Coordenada exata do usuário (Cliente/Prestador), RLS estrita | Postgres/Supabase, molde de `vaga_local` |
| `agenda_slots` / `servicos` (novas tabelas) | Substituem o uso de `vagas`/`candidaturas` para o fluxo de agendamento | Postgres/Supabase |
| Telegram Bot (webhook) | Notificação de aprovação de cadastro e agendamento | Reaproveitar padrão de `refs/caixa-forte-app` |
| Hero component | Saudação + citação + relógio + previsão do tempo | React client component, reaproveitar `refs/caixa-forte-app` |

---

## Decisões-chave

### Decisão 1: Reaproveitar o enum `tipo_base` existente, não criar um sistema de papéis dinâmico

| Atributo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |

**Contexto:** O ROADMAP descreve "Funcionário" como um papel que o admin cria dinamicamente, sugerindo RBAC totalmente configurável. O schema atual tem `tipo_base` como `check constraint` fixo (4 valores).

**Escolha:** Manter `tipo_base` como enum fixo, mas evoluir de 4 para 5 valores: `sysadmin | admin | funcionario | prestador_servico | cliente`. O "Funcionário" continua sendo um papel único (não um sistema de papéis arbitrários) cujo diferencial é justamente o RBAC por módulo já existente em `user_modules`.

**Alternativas rejeitadas:**
1. Sistema de papéis 100% dinâmico (tabela `roles` + `role_permissions`) — rejeitado por over-engineering para um protótipo; o padrão atual (enum fixo + módulos configuráveis para o único papel "variável") já resolve o caso de uso descrito.

**Consequências:**
- Ganho: reaproveita 100% do RBAC já testado (`guardModule`, `user_modules`).
- Trade-off: se no futuro surgir necessidade de múltiplos papéis customizados (não só "Funcionário"), precisa nova migration para generalizar — aceitável para o estágio atual.

### Decisão 2: Renomear `ajudante` → `prestador_servico` via migration de dados, não uma tabela nova

| Atributo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |

**Contexto:** O papel que hoje "presta serviço" já existe como `ajudante` com toda a base (perfil, avaliações, RLS). Criar um papel novo do zero duplicaria trabalho e gerar migração de dados desnecessária.

**Escolha:** Migration renomeia o valor do enum (`update profiles set tipo_base = 'prestador_servico' where tipo_base = 'ajudante'`), atualiza o `check constraint`, e adiciona `cliente` como novo valor válido. Código (`AppRole` em `lib/auth/roles.ts` e os 65 arquivos que referenciam `ajudante`) é atualizado numa segunda fase, arquivo por arquivo, não em um único commit.

**Alternativas rejeitadas:**
1. Manter o nome `ajudante` no banco e só trocar o texto exibido na UI — rejeitado porque o ROADMAP muda a semântica do papel (não é mais "ajuda um profissional numa diária", é "presta serviço direto a um cliente") — manter o nome antigo confundiria sessões futuras.

**Consequências:**
- Trade-off: janela de código com nome antigo no banco / novo no vocabulário do produto durante a transição.
- Benefício: sem downtime de dados, sem duplicar avaliações/histórico já existente.

### Decisão 3: Localização exata do perfil segue o padrão `vaga_local` (já existe)

| Atributo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |

**Contexto:** ROADMAP exige PIN exato obrigatório para Cliente e Prestador, mas o mapa agregado do admin deve agrupar por cidade, não espalhar pontos exatos. A migration `0014` já resolveu exatamente esse problema para `vagas` (coluna aproximada na tabela principal + tabela `_local` separada com RLS estrita para o exato).

**Escolha:** Nova tabela `profile_local` (molde de `vaga_local`): `user_id` PK, `lat`/`lng` exatos, RLS restrita a: o próprio dono, o prestador/cliente em um serviço ativo com ele, e sysadmin. `profiles` ganha `cidade_ibge` (código do IBGE) para a visão agregada por cidade do admin.

**Alternativas rejeitadas:**
1. Guardar lat/lng exato direto em `profiles` (tabela de leitura ampla) — rejeitado: `profiles_select_all` já é `using (true)`, exporia coordenada exata de todo mundo para todo mundo logado.

**Consequências:**
- Supera `docs/adr/0004-localizacao-aproximada.md` — precisa de uma ADR nova documentando a reversão (nota: mesma migration que fez isso para vagas já estabeleceu o precedente arquitetural).
- Ganho: reaproveita função `is_ajudante_aceito`-style (renomear para `is_prestador_do_servico`) e o padrão de RLS já testado.

### Decisão 4: Agenda v2 é um domínio novo (`agenda_slots` + `servicos`), não uma extensão de `bloqueio_agenda`

| Atributo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |

**Contexto:** `bloqueio_agenda` (migration `0015`) modela "dias que o ajudante NÃO está disponível" — o oposto semântico do que a v2 precisa ("horários que o prestador OFERECE, que o cliente reserva"). Tentar esticar essa tabela para o novo significado geraria confusão.

**Escolha:** Novas tabelas `agenda_slots` (horário oferecido pelo prestador: dia, hora início/fim, status livre/pendente/confirmado) e `servicos` (nasce quando um slot é aceito: cliente, prestador, preço, status, histórico de renegociação). `bloqueio_agenda` e a leitura de `vagas`/`candidaturas` em `/agenda` são descontinuadas nessa página quando a Fase C entrar.

**Alternativas rejeitadas:**
1. Adicionar colunas em `bloqueio_agenda` para virar "disponibilidade positiva" — rejeitado: inverteria a semântica de uma tabela com policies e componentes (`AgendaCalendar`) já em produção, mais arriscado que criar tabelas novas.

**Consequências:**
- `refs/careconnect` e `refs/vr-pilates` têm esse exato padrão (slot → reserva) já validado — copiar a forma das tabelas de lá antes de inventar do zero.
- `vagas`/`candidaturas` continuam existindo (não quebra o fluxo v1 enquanto convivem), mas ficam candidatas a deprecação quando a v2 estiver completa.

---

## Estratégia de migração incremental (fases)

| Fase | Escopo | Por quê nessa ordem |
|---|---|---|
| **A — Schema pivô** (este design) | Migration: `tipo_base` ganha `prestador_servico`/`cliente`, `profile_local` + `cidade_ibge`, `genero` em `profiles`, ADR superando 0004 | Tudo depende disso — sem o schema novo, nada mais pode ser construído corretamente |
| **B — Adaptação do código existente** | Atualizar `lib/auth/roles.ts` (`AppRole`), e os arquivos que fazem `role === "ajudante"` — em lotes pequenos, por área (auth → agenda → perfil → componentes), cada lote com teste no browser antes do próximo | 65 arquivos é grande demais pra um commit só; quebrar por área reduz risco e combina com o fluxo de commits pequenos |
| **C — Features net-new** | Agenda v2 (slots/serviços), Cliente (cadastro, busca por proximidade, página), Hero, Telegram, preço/renegociação, logs/auditoria, cookies, login (mostrar senha/salvar credenciais), gênero+saudação | Só faz sentido depois que B estabilizar — cada item aqui é paralelizável entre si (arquivos não se tocam) |

**Esta primeira entrega de build cobre só a Fase A.**

---

## Manifesto de arquivos — Fase A

| # | Arquivo | Ação | Propósito | Dependências |
|---|---|---|---|---|
| 1 | `supabase/migrations/0022_papeis_v2_prestador_cliente.sql` | Criar | Renomeia `ajudante`→`prestador_servico` nos dados, atualiza `check constraint` de `profiles.tipo_base` para incluir `cliente`, atualiza `custom_access_token_hook` default | Nenhuma |
| 2 | `supabase/migrations/0023_localizacao_exata_perfil.sql` | Criar | Tabela `profile_local` (molde `vaga_local`), coluna `profiles.cidade_ibge`, coluna `profiles.genero`, função `is_prestador_do_servico` (placeholder até a Fase C ter `servicos`) | 1 |
| 3 | `docs/adr/0012-localizacao-exata-perfil.md` | Criar | ADR documentando a reversão da 0004 para perfis de usuário | 2 |
| 4 | `lib/auth/roles.ts` | Modificar | `AppRole` passa a incluir `"prestador_servico" \| "cliente"`; fallback de `getCurrentUser` deixa de ser `"ajudante"` | 1 |
| 5 | `lib/modules.ts` | Modificar | Módulos/capacidades por papel — avaliar se `prestador_servico`/`cliente` precisam de módulos próprios (provável: não, só admin/funcionário usam `user_modules`) | 4 |
| 6 | `tests/rls.test.ts` | Modificar | Ajustar isolamento RLS para os novos valores de papel | 1, 2 |

**Total de arquivos (Fase A):** 6. Sem agente especializado do AgentSpec disponível nesta sessão (os 58 agentes do plugin não estão registrados como tipos de agente aqui) — todos marcados **(general)**, eu mesmo implemento sequencialmente.

---

## Padrão de código — migration com `COMMENT ON` (convenção do projeto)

```sql
-- 0022: pivô de papéis v2 — ajudante vira prestador_servico, novo papel cliente.
-- Ver ROADMAP.md e DESIGN_MEAJUDAAI_V2.md (Decisão 2).

update public.profiles set tipo_base = 'prestador_servico' where tipo_base = 'ajudante';

alter table public.profiles drop constraint if exists profiles_tipo_base_check;
alter table public.profiles
  add constraint profiles_tipo_base_check
  check (tipo_base in ('sysadmin','admin','funcionario','prestador_servico','cliente'));

comment on constraint profiles_tipo_base_check on public.profiles is
  'v2: sysadmin (plataforma) > admin (workspace) > funcionario (módulos custom) > '
  'prestador_servico (agenda própria, presta serviço) > cliente (busca e agenda). '
  'Antigo "ajudante" renomeado para "prestador_servico" nesta migration.';

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_claims jsonb;
begin
  select tipo_base into v_role from public.profiles where user_id = (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims','{}'::jsonb);
  v_claims := jsonb_set(v_claims,'{app_metadata}', coalesce(v_claims->'app_metadata','{}'::jsonb));
  v_claims := jsonb_set(v_claims,'{app_metadata,app_role}', to_jsonb(coalesce(v_role,'cliente')));
  return jsonb_set(event,'{claims}', v_claims);
end $$;
```

---

## Estratégia de testes (Fase A)

| Tipo | Escopo | Ferramenta | Cobertura |
|---|---|---|---|
| Unidade | `lib/auth/roles.ts` type guards | `npm test` (vitest) | Novos valores de papel aceitos/rejeitados |
| Integração RLS | `tests/rls.test.ts` | `RUN_INTEGRATION=1 npm test` | `profile_local` só legível por dono/sysadmin/parte do serviço |
| Manual no browser | Login com cada um dos 5 papéis, checar que `guardModule` ainda redireciona corretamente | `npm run dev` + navegador (obrigatório por `CLAUDE.md` §Fluxo de trabalho) | Nenhuma regressão nos papéis existentes (sysadmin/admin/funcionario) |

---

## Considerações de segurança

- **RLS de `profile_local`:** nunca `using (true)` — só dono, sysadmin, e (a partir da Fase C) a outra parte de um serviço ativo.
- **`guardModule` já cobre** o requisito crítico do Leonardo (bloqueio server-side de módulo não autorizado) — Fase A não precisa mexer nisso, só garantir que os novos papéis (`prestador_servico`, `cliente`) retornem conjunto vazio de módulos em `getAllowedModules` (eles não usam o painel de empresa).
- **Migration de dados é irreversível em produção** — como isso ainda é ambiente de protótipo (projeto Supabase `opvdfyyijbgrwztnqldl`, uso indiscriminado autorizado por Leonardo para este projeto), aplicar direto; **não** faria isso sem esse aviso em um projeto com dados reais de usuários.

---

## Próximo passo

Build da Fase A (6 arquivos acima). Depois, retomar o ROADMAP.md para desenhar a Fase C em fatias menores (Agenda v2 primeiro, por ser a mais bloqueante para o fluxo Cliente↔Prestador).
