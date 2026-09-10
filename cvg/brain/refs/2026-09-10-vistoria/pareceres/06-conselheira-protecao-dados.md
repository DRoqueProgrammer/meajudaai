### conselheira-protecao-dados — NOTA: 28/100
**Conceito na minha régua:** C (1,0 pt) — gaps materiais: base legal ausente para várias finalidades reais e direitos do titular não operacionalizados. Não é D porque o texto se assume honestamente como rascunho ("revisar com apoio jurídico antes do lançamento"). Mas não pode circular como política válida no estado atual.

**Veredito:** A Política de Privacidade e os Termos de Uso publicados em `/privacidade` e `/termos` descrevem um produto que não existe mais — o mural de vagas da v1 ("profissional publica diária", "ajudante se candidata") — enquanto o código real coleta PIN de localização exata, gênero, foto, anotações privadas do prestador sobre o cliente e log de IP/geolocalização a cada login, nenhum desses mencionado no texto. Some a isso nenhum mecanismo real de acesso/eliminação/portabilidade, senha salva em texto puro no navegador, e um campo de endereço textual exposto a qualquer autenticado de qualquer praça.

**Como cheguei na nota:**
- Consistência produto v2 × texto publicado (25%): 5/100
- Direitos do titular operacionalizados (25%): 15/100 — só existe "desativar" (reversível); nenhuma exportação, nenhuma eliminação.
- Base legal por finalidade + transferência internacional nomeada (20%): 10/100
- Segurança do tratamento, art. 46 (15%): 20/100 — RLS aberta em `profiles` (inclui endereço textual desde a 0029), senha em `localStorage`.
- Encarregado + retenção com prazo real (15%): 20/100

**O que está bom**
- `profiles_pii` (CPF/telefone/e-mail) tem RLS correta: só dono, sysadmin, ou quem tem serviço em comum (`tem_servico_com`, migration 0027).
- Coordenada exata do PIN (`profile_local.lat/lng`) em tabela separada com RLS estrita, e um par `lat_aprox/lng_aprox` com deslocamento aleatório fixo (~800 m, migration 0033) para nunca expor a posição real — minimização bem pensada.
- `servico_logs` (anotação privada do prestador) com RLS `autor_id = auth.uid()` (migration 0025).
- O texto se autoidentifica como rascunho de protótipo.
- `login_logs` grava e a RLS restringe leitura ao SysAdmin (migration 0031).
- `docs/FOTOS_DEMO.md` já tinha a doutrina certa sobre fotos de pessoas reais (fotos geradas por IA na v1).

## Base legal — mapeamento por finalidade
- Cadastro/login/contrato → art. 7º, V citado genericamente, não linkado dado a dado.
- PIN de localização exata → nenhuma base citada; a política nem menciona o dado.
- Log de login (IP, user-agent, geolocalização) → ausente do texto.
- IP enviado a `ipapi.co` (terceiro, provavelmente fora do Brasil) → transferência internacional (art. 33) não identificada.
- Anotações privadas do prestador sobre o cliente → legítimo interesse sem teste de balanceamento, sem menção.
- Gênero → aceitável (tem "prefiro não responder"), não citado.
- Fotos das contas de exemplo (pessoas reais do Unsplash) → uso de imagem de terceiro sem base.
- Google Fonts / Open-Meteo / OpenStreetMap (IP antes de qualquer consentimento) → sem base, sem menção.

## Problemas
[CRÍTICO] Política e Termos descrevem a v1 — `app/(legal)/privacidade/page.tsx:26-46` e `termos/page.tsx:19-45` falam em "vagas", "candidaturas", "diária", "profissional/ajudante"; o código real coleta PIN exato, gênero, foto, agenda (`lib/actions/auth.ts:49-117`).
[CRÍTICO] Nenhum direito do art. 18 operacionalizado. `desativarMinhaContaAction` (`lib/actions/auth.ts:370-377`) só seta `status='inativo'`, revertido no próximo login. Sem export, eliminação ou anonimização; promessas em `privacidade/page.tsx:61-65` inexequíveis.
[CRÍTICO] Senha em texto puro no `localStorage`: `app/(auth)/login/page.tsx:10,43-57`.
[CRÍTICO] `profiles_select_all` (`using(true)`, ADR 0002) expõe `profiles.endereco` — endereço em texto livre (migration 0029) — a qualquer autenticado de qualquer praça. A coordenada foi protegida, o endereço textual não.
[CRÍTICO] Transferência internacional não declarada: `ipapi.co` recebe o IP a cada login (`lib/actions/auth.ts:187`); Supabase us-east-2, Vercel, Google Fonts, Open-Meteo — nada nomeado em `privacidade/page.tsx:48-52`.
[ALTO] Anotações privadas do prestador sobre o cliente (`components/clientes/servico-cliente-card.tsx:112`) — o cliente é bloqueado de acessá-las; tensão com art. 18, II.
[ALTO] Contas de exemplo com fotos de pessoas reais do Unsplash (`scripts/seed-fake-data.mjs:25-33`) atadas a biografias fabricadas — o próprio `docs/FOTOS_DEMO.md:3-6` já rejeitava isso.
[ALTO] Nenhum encarregado identificado — `lib/contato.ts:4` é e-mail genérico "placeholder de protótipo".
[MÉDIO] Retenção sem mecanismo: sem cron de expurgo; `login_logs` sem TTL.
[MÉDIO] Banner de cookies decorativo: "Recusar não essenciais" não desliga nada. Google Fonts carrega incondicionalmente (`app/layout.tsx:36-41`); geocoding do Hero dispara sem checar consentimento (`components/hero-card.tsx:53-61`).
[MÉDIO] ROADMAP §3 ("nunca fazemos exclusão permanente") × art. 18, VI e art. 16 — precisa de ADR com anonimização com prazo.
[BAIXO] Documentos datados "julho de 2026" sem versão; nenhum registro de qual versão cada usuário aceitou.

## Contribuições de melhoria
- Reescrever privacidade + termos para a v2, com base legal por finalidade · M · alto.
- Nomear processadores e a base do art. 33 · P · alto.
- Exportação e eliminação/anonimização reais (anonimizar `profiles`/`profiles_pii` mantendo o id para integridade de `servicos`/`avaliacoes`) · G · alto.
- Parar de salvar senha em `localStorage` (usar `autoComplete` nativo) · P · alto.
- Mover `profiles.endereco` para tabela com RLS estrita como `profile_local` · M · alto.
- Documentar o balanceamento das anotações privadas e dar transparência mínima ao cliente · M · médio-alto.
- Trocar fotos Unsplash de pessoas reais por avatares gerados · P · médio.
- Nomear o encarregado (pode ser o Leonardo nesta fase) · P · médio.
- Cron de expurgo/anonimização de `login_logs` · P/M · médio.

## Quick wins
- Atualizar a data + changelog de versão nas páginas legais.
- Nomear o encarregado no rodapé da política.
- Uma frase nomeando Supabase/Vercel/Google Fonts/Open-Meteo/OpenStreetMap/ipapi.co.
- Remover o `localStorage` de senha do login.
- Mencionar `login_logs` (IP/dispositivo/geo) e quem acessa.

## Se eu só pudesse mudar uma coisa
Reescrever a Política de Privacidade para descrever o produto de hoje. Enquanto ela documenta um marketplace que não existe mais, nenhum outro mecanismo tem efeito informativo — o titular nunca vai saber que precisa pedir nada.
