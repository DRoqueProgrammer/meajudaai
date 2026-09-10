### supabase-specialist — NOTA: 45/100
**Conceito:** tarefa CRÍTICA (RLS/PII/credenciais, limiar 0,98 na escala da persona) — confiança medida ≈ 0,35. Postura correta: REFUSE-and-fix antes de aceitar dado real de terceiros.

> Verificação do controller (Opus 5): os dois CRÍTICOS foram conferidos na fonte — `0024_agenda_v2_slots_servicos.sql:67-74` (with check só `cliente_id = auth.uid()`), `0027:7-20` (`tem_servico_com` em qualquer status), nenhum trigger que bloqueie (o único em `servicos` é o contador da `0035`), e o screenshot `sysadmin__admin-logs__desktop__1de1.png` mostra a conta de exemplo SysAdmin lendo `login_logs`.

**Veredito:** A arquitetura de dados sensíveis é bem pensada — `profiles`/`profiles_pii`/`profile_local` separados, coordenada aproximada para mapa, funções `SECURITY DEFINER` com `search_path` fixado em 100% dos casos. Mas duas costuras anulam parte desse cuidado: a policy de escrita em `servicos` não valida nada além de "eu sou uma das partes", e o login de 1 clique como conta de exemplo entrega o SysAdmin/Administrador reais e editáveis a qualquer visitante.

**Como cheguei na nota:**
- RLS das tabelas do fluxo v2 (`servicos`/`agenda_slots`/`profile_local`) — 30% — 25
- Desenho de PII/localização — 20% — 60
- Funções `SECURITY DEFINER`, grants e Storage — 20% — 85
- Service role no app / auth / contas de exemplo — 20% — 20
- Isolamento por praça, higiene de migrations e testes de RLS — 10% — 45

**O que está bom**
- `profile_local` nunca expõe `lat/lng` reais fora de dono/parte; busca e mapa usam `lat_aprox/lng_aprox` com deslocamento fixo de ~800 m (`0033_local_aproximado_mapa.sql:30-49`).
- `buscar_prestadores_proximos` e `meus_clientes_no_mapa` só devolvem distância/pino aproximado (`0026`, `0033:56-121`).
- Toda função `SECURITY DEFINER` (~20 funções) fixa `search_path` e faz `revoke ... from anon, public`.
- `lib/supabase/admin.ts` é `"server-only"`; os 26 usos de `createAdminClient()` estão todos no servidor.
- `COMMENT ON` em tabela e coluna desde a `0019`, mantido até a `0037`.
- Bucket `avatares`: leitura pública justificada, escrita restrita à própria pasta (`0012:27-44`).

**Problemas**

[CRÍTICO] `servicos_insert_cliente`/`servicos_update_parties` sem invariante de negócio no banco (`0024:67-74`). O `with check` não confere slot `livre`, preço contra o perfil, nem transição de status; tudo isso existe só em `lib/actions/agenda-v2.ts:99-137`, contornável com a anon key:
```js
const { data: prestadores } = await sb.from('profiles').select('user_id').eq('tipo_base','prestador_servico');
const { data: slots } = await sb.from('agenda_slots').select('id').eq('status','livre').limit(1);
await sb.from('servicos').insert({ slot_id: slots[0].id, cliente_id: (await sb.auth.getUser()).data.user.id,
  prestador_id: prestadores[3].user_id, descricao: 'x', preco_tipo: 'servico', preco_valor: 0.01, status: 'realizado' });
await sb.from('profiles_pii').select('telefone,email,chave_pix').eq('user_id', prestadores[3].user_id); // devolve a linha
await sb.from('profile_local').select('lat,lng').eq('user_id', prestadores[3].user_id);                 // coordenada exata
```
Impacto: qualquer cliente (o cadastro de cliente é público e sem aprovação) lê telefone, e-mail, chave Pix e coordenada exata de qualquer prestador; infla `profiles.servicos_realizados` (trigger da `0035`); mina a futura comissão, que nasce do `status = realizado`.

[CRÍTICO] Contas de exemplo com senha única e pública dão SysAdmin/Administrador reais a qualquer visitante — `lib/auth/contas-exemplo.ts:43`, `app/api/exemplo/entrar/route.ts:16-55`, papel vindo de `profiles.tipo_base` (`lib/auth/roles.ts:29-35`). `app/(app)/admin/logs/page.tsx:22-41` e `admin/servicos/page.tsx:9-20` usam `createAdminClient()` depois desse gate. Um GET em `/api/exemplo/entrar?papel=sysadmin` basta para ver IP/cidade/dispositivo de todo login e todos os serviços com preço — e a conta é editável.

[ALTO] `profiles_select_all` — leitura global (`0001:34-35`, ADR 0002), ainda sem correção.

[ALTO] 45 cláusulas em 17 migrations dependem de `current_app_role()`, inerte (ADR 0009) — contagem reconfirmada. Funcionam só porque as rotas admin usam `createAdminClient()`; a próxima página que ler essas tabelas com o client de sessão vai falhar em silêncio para o SysAdmin.

[MÉDIO] `tem_servico_com` (`0027:8-13`) libera PII/local exato em qualquer status — inclusive `pendente` e `cancelado` — e o acesso nunca expira.

[MÉDIO] Nenhuma tabela v2 tem noção de praça; `buscar_prestadores_proximos` (`0033:56-86`) não filtra cidade/praça nem tem `LIMIT`.

[BAIXO] `tests/rls.test.ts` cobre só o modelo v1 — zero teste de integração para `servicos`, `agenda_slots`, `profile_local`, `tem_servico_com`, `buscar_prestadores_proximos`, `login_logs`.

[BAIXO] Sem índice em `profiles(tipo_base, categoria)` nem em `agenda_slots(status)`.

**Contribuições de melhoria**
1. Travar `servicos` no banco: `with check` exigindo slot `livre` e do `prestador_id`; trigger `BEFORE UPDATE` para transições (pendente→confirmado só pelo prestador; →cancelado exige motivo; confirmado→realizado só pelo prestador) · M.
2. Isolar as contas de exemplo de sysadmin/admin num tenant sintético, ou negar `createAdminClient()` quando a sessão vier do login de exemplo; girar a senha · P (mitigar) / M (isolar).
3. Registrar o auth hook com roteiro de teste: registrar → rodar os 22 testes de integração → validar login de cada papel → plano B: desregistrar no painel (volta ao fallback) · P.
4. `tem_servico_com` restrito a `status in ('confirmado','realizado')` · P.
5. Praça/cidade em `agenda_slots`/`servicos`/`profile_local` e filtro + raio + `LIMIT` na busca, na ordem do ADR 0003 · G.
6. Testes de integração para `servicos`/`agenda_slots`/`profile_local`/`tem_servico_com`, incluindo o ataque acima como teste que hoje falharia · M.

**Quick wins**
1. `and status <> 'cancelado'` em `tem_servico_com` — migration de 3 linhas.
2. Girar `SENHA_CONTA_EXEMPLO`.
3. `create index profiles_busca_idx on profiles (tipo_base, categoria) where tipo_base='prestador_servico'`.
4. `and status <> 'realizado'` no `with check` de `servicos_insert_cliente` como mitigação imediata.
5. CI: falhar se uma migration nova usar `current_app_role()` sem o comentário `-- INERTE (ADR 0009)`.

**Se eu só pudesse mudar uma coisa:** fechar a policy de insert/update de `servicos` no banco — é o único buraco que, sozinho, deixa qualquer cliente ler telefone, e-mail, chave Pix e coordenada exata de qualquer prestador e fraudar a reputação; o resto tem um fallback que funciona hoje, este não.
