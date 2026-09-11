### supabase-specialist — NOTA HOJE: 80/100 (ontem: 45)
**Conceito na sua régua:** os dois achados CRÍTICOS de ontem (limiar 0,98) eram RLS/PII de tarefa CRÍTICA — hoje ambos têm confiança alta (≈0,90): regra em gatilho, não só em `lib/`, com teste de integração que ataca "de fora da aplicação" e passa. O que resta é ALTO/MÉDIO conhecido, não CRÍTICO novo.

**Veredito:** as duas costuras que eu apontei ontem — `servicos` sem invariante no banco e conta de exemplo lendo o mundo real — foram fechadas de verdade, com gatilho + teste de ataque, não só com uma trava na tela. O que sobra é o que já era ALTO ontem e continua ALTO (leitura global de `profiles`, `current_app_role()` inerte) mais um MÉDIO que ganhou um ângulo novo: expor contato/local no primeiro "pendente" agora não depende de dado forjado, só de reservar um horário livre — sem limite de tentativas.

**Ontem → hoje**

| Recomendação de ontem | Status | Evidência |
|---|---|---|
| Travar `servicos` no banco (with check + trigger de transição) | **Feita** | `supabase/migrations/0038_servico_nasce_e_muda_pelo_fluxo.sql:69-223` (policy + `validar_transicao_servico`), reforçada em `0043:118-137` (prestador ativo) e `0055:29-53` (cliente ativo) — teste de ataque real em `tests/fatia1/servicos.test.ts:90-130` |
| Isolar contas de exemplo de sysadmin/admin (ou negar `createAdminClient()` no login de exemplo) | **Feita** | `0040_marca_do_mundo_de_exemplo.sql` (coluna `exemplo`) + `lib/auth/exemplo.ts:23-25` (`podeAgirSobre`) + `lib/admin/consultas.ts` (todo `listarX` recorta por `ator.exemplo`) — `app/(app)/admin/logs/page.tsx:38` chama `listarAcessos(admin, { exemplo: user.exemplo }, …)`; teste `tests/fatia1/exemplo.test.ts:108-123` prova que a conta de exemplo não vê o usuário real |
| Registrar o auth hook com roteiro de teste | **Não feita** (decisão consciente) | `0053:77`, `0055:85` — comentário explícito "`current_app_role()` não serve aqui — D-030"; as migrations novas passaram a evitar depender dele, mas nenhuma registrou o hook |
| `tem_servico_com` restrito a `confirmado`/`realizado` | **Parcial** | `0039_contato_e_endereco_entre_as_partes.sql:75-85` excluiu `cancelado`, mas manteve `pendente` — `tests/fatia1/contato.test.ts:79-84` confirma que "pendente" já abre PII |
| Praça/cidade em `agenda_slots`/`servicos`/`profile_local` + filtro/raio/`LIMIT` na busca | **Não feita** | `buscar_prestadores_proximos` em `0043:76-107` é o mesmo corpo da `0033`, sem cidade/praça nem `LIMIT` — G, fora de ordem ainda (ADR 0003) |
| Testes de integração para `servicos`/`agenda_slots`/`profile_local`/`tem_servico_com`, incluindo o ataque como teste | **Feita** | `tests/fatia1/servicos.test.ts`, `contato.test.ts`, `exemplo.test.ts`, mais `tests/comissao/banco.test.ts:70,113` e `tests/anuncios/chaves-pix.test.ts:44` cobrindo as tabelas novas |

**Quick wins de ontem:** `and status <> 'cancelado'` em `tem_servico_com` — feito (0039). Girar `SENHA_CONTA_EXEMPLO` — não feito (`lib/auth/contas-exemplo.ts:49`, mesma senha de ontem — baixo risco agora que o isolamento existe). Índice em `profiles(tipo_base, categoria)` — não feito. Mitigação `and status <> 'realizado'` no insert — superada por algo melhor (`status = 'pendente'` exato). CI falhando em `current_app_role()` sem comentário — não feito.

**Como cheguei na nota:**
- RLS do fluxo v2 (`servicos`/`agenda_slots`) — 30% — ontem 25 → hoje **85** (gatilho fecha nascimento e transição, com teste de ataque real)
- Desenho de PII/localização — 20% — ontem 60 → hoje **70** (cancelado fechado; pendente continua abrindo, ponto abaixo)
- Funções `SECURITY DEFINER`, grants e Storage — 20% — ontem 85 → hoje **88** (~15 funções novas, todas com `revoke`/`grant` explícito; padrão mantido)
- Service role / contas de exemplo — 20% — ontem 20 → hoje **85** (isolamento centralizado e testado)
- Isolamento por praça, higiene de migrations e testes de RLS — 10% — ontem 45 → hoje **60** (testes de integração cresceram muito; praça na busca continua ausente)

Ponderado: 0,30×85 + 0,20×70 + 0,20×88 + 0,20×85 + 0,10×60 ≈ **80**.

**O que está bom**
- O gatilho `validar_transicao_servico` (0038, refeito em 0047/0051) trava vínculo, `preco_tipo`, `created_at` e a máquina de estados por papel — dispara para QUALQUER role, então não é um "buraco de RLS" que uma policy futura reabre.
- O isolamento do mundo de exemplo é um ponto único e reutilizado: `lib/admin/alcance.ts` e `lib/admin/consultas.ts` são chamados por 16 arquivos (`grep` em `app`/`lib`), não reimplementado tela a tela.
- `liberar_horario_do_cancelado` (`0048:30-49`) e `marcar_horario_pendente` (`0038:101-116`) resolvem exatamente o furo que a RLS de `agenda_slots` (só o prestador dono) deixaria aberto para a sessão do cliente — via `SECURITY DEFINER` restrito, revogado de `anon`/`authenticated`.
- Todas as ~15 funções novas mantêm `set search_path = ''` + `revoke ... from anon, public` + `grant` explícito (`0044:59-101`, `0049:9-83`, `0057:50-245`) — e `COMMENT ON` em 100% das tabelas/colunas/funções novas, sem exceção encontrada.
- Os documentos financeiros (`app/(documento)/recibo/nota/[id]/page.tsx:36-39`, `recibo/comissao/.../page.tsx:53-60`) resolvem o "recibo com id arbitrário" via `pracaAlcancada`/`atorAlcanca`, e o `recibo/recebimento/[id]` deixa a própria RLS de `recebimentos` decidir — sem distinguir "não existe" de "sem permissão".
- Cobertura de teste de RLS deu um salto real: `tests/comissao/banco.test.ts:70` ("outra pessoa não vê a alíquota"), `:113` ("prestador lê as próprias comissões e não mexe"), `tests/anuncios/chaves-pix.test.ts:44` — a lacuna de ontem (só v1 testado) está bem mais estreita.

**Problemas**

[ALTO] `profiles_select_all` (`0001:34-35`, ADR 0002) continua `using (true)` — nenhuma correção. Hoje isso também expõe as colunas novas: `profiles.status` (ativo/bloqueado/**suspenso**/removido) para qualquer autenticado, ligado ao nome — ou seja, qualquer cliente pode listar quem está suspenso por "pilantragem" (a feature de red flags criada nesta rodada) só varrendo `profiles`. `exemplo` e `emite_nota_fiscal` são de baixo risco (o segundo é intencionalmente público).

[ALTO] `tem_servico_com` continua liberando `profiles_pii`/`profile_local` em `status = 'pendente'` (`0039:75-85`, confirmado por `tests/fatia1/contato.test.ts:79-84`) e a policy de insert de `servicos` (`0055:30-53`) não tem limite de quantas reservas um cliente cria por dia. Como o cadastro de cliente é público e `lib/actions/agenda-v2.ts` não tem rate limit na criação de serviço, uma única conta consegue "reservar" um horário livre de vários prestadores só para destravar telefone, e-mail, chave Pix e coordenada exata — sem nunca comparecer nem confirmar. É o mesmo MÉDIO de ontem, mas o ângulo de raspagem em massa (zero custo, zero limite) pesa mais do que eu dei ontem; por isso subo para ALTO.

[ALTO] Ainda ~48 cláusulas em ~17 migrations dependem de `current_app_role()`, inerte (D-030/ADR 0009) — contagem estável. As migrations mais recentes (0053, 0055) já evitam esse padrão em código novo (comentam a limitação e usam checagem por `profiles.tipo_base`), o que é um sinal maduro, mas o hook continua sem roteiro de registro.

[MÉDIO] Nenhuma tabela v2 tem noção de praça na busca: `buscar_prestadores_proximos` (`0043:76-107`) não filtra cidade/praça nem tem `LIMIT` — inalterado desde ontem.

[BAIXO] (NOVO) `validar_transicao_servico()` (`0038`, `0047`, `0051`) não fixa `search_path` — só as `SECURITY DEFINER` fixam. Risco prático baixo aqui (não é `SECURITY DEFINER`, e o corpo é schema-qualificado), mas quebra a convenção que o resto do banco segue.

[BAIXO] `flags_da_pessoa`/`flags_aprovadas_do_cliente` (`0053:79-96`, `0055:87-113`) liberam contagem de red flags para QUALQUER prestador sobre QUALQUER cliente (e vice-versa), sem exigir vínculo de serviço nem praça — parece intencional (reputação antes de aceitar um serviço), mas vale confirmar com o Leonardo se é essa a intenção ou se devia seguir o mesmo `tem_servico_com`.

[BAIXO] Sem índice em `profiles(tipo_base, categoria)` nem `agenda_slots(status)` — quick win de ontem não feito.

**Possibilidades de melhoria**
1. Restringir `tem_servico_com` a `confirmado`/`realizado` e, para o "pendente" precisar ver contato, mostrar só o necessário para combinar a visita (nome + WhatsApp opcional do prestador, não telefone/e-mail/Pix/coordenada exata) · M.
2. Rate limit na criação de `servicos` por cliente (ex.: N pedidos pendentes simultâneos, ou N por hora) — mesmo padrão das "portas automáticas" da Fatia 1 · P/M.
3. Registrar o auth hook com o roteiro que ficou pendente desde ontem (registrar → rodar os ~220 testes de integração → validar login de cada papel → plano B no painel) · P, mas trava em disciplina de execução, não em código.
4. Cidade/praça em `agenda_slots`/`servicos` + `LIMIT` e filtro na busca, na ordem do ADR 0003 · G.
5. Revisar se `flags_da_pessoa` deveria seguir `tem_servico_com` em vez de qualquer prestador/cliente · P.
6. `set search_path = ''` em `validar_transicao_servico` para fechar a convenção · P (trivial, 3 migrations herdam).

**Quick wins**
1. `create index profiles_busca_idx on profiles (tipo_base, categoria) where tipo_base='prestador_servico'` — ainda pendente de ontem.
2. `create index agenda_slots_status_idx on agenda_slots (status)`.
3. Girar `SENHA_CONTA_EXEMPLO`.
4. `set search_path = ''` nas 3 versões de `validar_transicao_servico`.
5. Limitar `servicos_insert_cliente` a N pedidos `pendente` simultâneos por `cliente_id` (subconsulta de contagem no `with check`).

**Se eu só pudesse mudar uma coisa agora:** colocar um rate limit na criação de `servicos` (ou reduzir o que "pendente" libera de PII) — é o único caminho que ainda deixa qualquer cliente recém-cadastrado raspar telefone, e-mail, chave Pix e localização exata de prestadores em escala, sem exploit nenhum, só usando o fluxo normal repetidas vezes.
