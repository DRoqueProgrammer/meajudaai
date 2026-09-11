/**
 * Roteiro de regressão da Fatia 1 no navegador — o gabarito do R-54
 * (cvg/docs/tech-spec/fatia-1-seguranca.md): "nenhuma jornada que funcionava quebra".
 *
 * Escrito pelo controller antes da tarefa 11 (decisão D-026): o executor não o edita.
 * Dez passos, com as contas de exemplo, contra o build de produção:
 *    1. a cliente reserva um horário
 *    2. o prestador confirma
 *    3. o prestador marca realizado
 *    4. a cliente cancela outro serviço, com motivo
 *    5. o prestador vê o WhatsApp da cliente do serviço
 *    6–10. cada um dos 5 botões da landing entra no seu papel
 *
 * A chave de serviço só prepara e limpa: cria dois horários livres do prestador de
 * exemplo num dia distante e, no fim, apaga os serviços, os horários e os acessos que
 * o roteiro criou e recalcula o contador público do prestador. Toda ação é pela tela.
 *
 * Uso:
 *   node scripts/regressao/fatia1.mjs --servir            sobe `next start` e derruba no fim
 *   node scripts/regressao/fatia1.mjs --base <url>        usa um servidor já no ar
 * O navegador é o Chrome instalado (playwright-core, canal "chrome"); CHROME_PATH
 * aponta outro executável. Em falha, a tela de cada passo vai para a pasta
 * temporária do sistema.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

// ── Configuração ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const servir = args.includes("--servir");
const PORTA = process.env.PORTA_REGRESSAO ?? "3100";
const iBase = args.indexOf("--base");
const BASE = iBase >= 0 ? args[iBase + 1] : `http://localhost:${PORTA}`;

// As mesmas contas de lib/auth/contas-exemplo.ts (arquivo TypeScript, só do servidor).
const CLIENTE_EMAIL = "marina.costa@meajudaai.app";
const PRESTADOR_EMAIL = "joao.ferreira@meajudaai.app";
const PAPEIS = [
  ["cliente", /^Cliente$/],
  ["prestador_servico", /^Prestador[ae]? de Serviço$/],
  ["funcionario", /^Funcionári[oae]$/],
  ["admin", /^Administrador[ae]?$/],
  ["sysadmin", /^SysAdmin$/],
];

// Horários do roteiro: longe no futuro e em horas que ninguém usa, para não
// esbarrar na agenda de verdade do prestador de exemplo.
const HORARIO_A = { inicio: "05:10", fim: "06:10" };
const HORARIO_B = { inicio: "06:20", fim: "07:20" };
const MARCA = "Regressão F1";

const env = lerEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("regressão da Fatia 1: faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(2);
}
const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

const pastaTelas = join(tmpdir(), "regressao-fatia1");
mkdirSync(pastaTelas, { recursive: true });

// ── Utilitários ──────────────────────────────────────────────────────────────

/** Lê o .env.local do mesmo jeito que tests/setup.ts — sem dependência nova. */
function lerEnvLocal() {
  try {
    const bruto = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
    const saida = {};
    for (const linha of bruto.split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) saida[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return saida;
  } catch {
    return {};
  }
}

function dataIso(diasAFrente) {
  return new Date(Date.now() + diasAFrente * 86_400_000).toISOString().slice(0, 10);
}

function dataBr(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Espera uma condição do banco virar verdade — a tela pode responder antes do banco, e vice-versa. */
async function esperar(condicao, mensagem, ms = 20_000) {
  const fim = Date.now() + ms;
  for (;;) {
    if (await condicao()) return;
    if (Date.now() > fim) throw new Error(mensagem);
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function servicoDoHorario(slotId) {
  const { data } = await sb
    .from("servicos")
    .select("id, status, cliente_id, cancelado_motivo")
    .eq("slot_id", slotId)
    .maybeSingle();
  return data;
}

async function statusDoHorario(slotId) {
  const { data } = await sb.from("agenda_slots").select("status").eq("id", slotId).maybeSingle();
  return data?.status ?? null;
}

// ── Servidor (opcional) ──────────────────────────────────────────────────────

let servidor = null;
const saidaServidor = [];

async function subirServidor() {
  servidor = spawn(`npx next start -p ${PORTA}`, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  for (const fluxo of [servidor.stdout, servidor.stderr]) {
    fluxo.on("data", (b) => {
      saidaServidor.push(String(b));
      if (saidaServidor.length > 40) saidaServidor.shift();
    });
  }
  const fim = Date.now() + 90_000;
  for (;;) {
    try {
      const r = await fetch(BASE, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      // ainda subindo
    }
    if (Date.now() > fim) {
      throw new Error(`o servidor não respondeu em ${BASE} em 90 s:\n${saidaServidor.join("")}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function derrubarServidor() {
  if (!servidor) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(servidor.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-servidor.pid, "SIGTERM");
    } catch {
      // já saiu
    }
  }
}

// ── Cenário ──────────────────────────────────────────────────────────────────

const inicio = new Date().toISOString();
const cenario = { cliente: "", prestador: "", slots: [], exemplo: [] };

async function prepararCenario() {
  const { data: pessoas, error } = await sb
    .from("profiles_pii")
    .select("user_id, email")
    .in("email", [CLIENTE_EMAIL, PRESTADOR_EMAIL]);
  if (error) throw error;
  cenario.cliente = pessoas.find((p) => p.email === CLIENTE_EMAIL)?.user_id ?? "";
  cenario.prestador = pessoas.find((p) => p.email === PRESTADOR_EMAIL)?.user_id ?? "";
  if (!cenario.cliente || !cenario.prestador) throw new Error("contas de exemplo de cliente e prestador não encontradas");

  const { data: todas } = await sb.from("profiles_pii").select("user_id, email").like("email", "%@meajudaai.app");
  cenario.exemplo = (todas ?? []).map((p) => p.user_id);

  await limparSobras();

  const data = dataIso(400);
  for (const h of [HORARIO_A, HORARIO_B]) {
    const { data: slot, error: e } = await sb
      .from("agenda_slots")
      .insert({ prestador_id: cenario.prestador, data, hora_inicio: h.inicio, hora_fim: h.fim, status: "livre" })
      .select("id")
      .single();
    if (e) throw e;
    cenario.slots.push({ id: slot.id, data, ...h });
  }
}

/** Sobras de uma execução anterior que caiu no meio — só o que tem a marca do roteiro. */
async function limparSobras() {
  const { data: velhos } = await sb
    .from("servicos")
    .select("id, slot_id")
    .eq("prestador_id", cenario.prestador)
    .like("descricao", `${MARCA}%`);
  const slotsVelhos = (velhos ?? []).map((s) => s.slot_id);
  if (velhos?.length) await sb.from("servicos").delete().in("id", velhos.map((s) => s.id));
  const { data: horariosVelhos } = await sb
    .from("agenda_slots")
    .select("id")
    .eq("prestador_id", cenario.prestador)
    .gte("data", dataIso(300))
    .in("hora_inicio", [`${HORARIO_A.inicio}:00`, `${HORARIO_B.inicio}:00`]);
  const ids = [...new Set([...slotsVelhos, ...(horariosVelhos ?? []).map((h) => h.id)])];
  if (ids.length) await sb.from("agenda_slots").delete().in("id", ids);
  await recalcularContador();
}

async function recalcularContador() {
  const { count } = await sb
    .from("servicos")
    .select("id", { count: "exact", head: true })
    .eq("prestador_id", cenario.prestador)
    .eq("status", "realizado");
  if (count != null) await sb.from("profiles").update({ servicos_realizados: count }).eq("user_id", cenario.prestador);
}

async function limparCenario() {
  const ids = cenario.slots.map((s) => s.id);
  if (ids.length) {
    await sb.from("servicos").delete().in("slot_id", ids);
    await sb.from("agenda_slots").delete().in("id", ids);
  }
  if (cenario.prestador) await recalcularContador();
  // Os acessos que os passos 1–10 registraram (entrar numa conta de exemplo grava um).
  if (cenario.exemplo.length) await sb.from("login_logs").delete().in("user_id", cenario.exemplo).gte("created_at", inicio);
}

// ── Navegador ────────────────────────────────────────────────────────────────

let navegador = null;

async function novoContexto() {
  const ctx = await navegador.newContext({
    baseURL: BASE,
    viewport: { width: 1280, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // "Usar minha localização" no formulário de reserva — o ponto fica em Icaraí, Niterói.
    geolocation: { latitude: -22.9035, longitude: -43.1105 },
    permissions: ["geolocation"],
  });
  ctx.setDefaultTimeout(15_000);
  ctx.setDefaultNavigationTimeout(30_000);
  // O roteiro prova as jornadas do app, não a internet: fotos de perfil, tiles e ícones
  // do mapa vêm de terceiros, e um deles lento segura o evento "load" da página e
  // derruba o passo sem que o app tenha errado nada. Fora do próprio app, nada carrega.
  await ctx.route((endereco) => !endereco.href.startsWith(BASE), (rota) => rota.abort());
  return ctx;
}

/**
 * Página nova com o aviso de cookies tratado como uma pessoa trataria: quando ele
 * cobre o que o roteiro vai clicar, fecha e segue. Desde o lote 2C da Fatia 2 o
 * aviso é só informativo ("Entendi" — o app não usa cookie não essencial); o nome
 * antigo fica no padrão para a regressão rodar também contra um build anterior.
 */
async function novaPagina(ctx) {
  const pagina = await ctx.newPage();
  await pagina.addLocatorHandler(pagina.getByRole("button", { name: /^(Entendi|Recusar não essenciais)$/ }), async (botao) => {
    await botao.click();
  });
  return pagina;
}

async function entrarComoExemplo(pagina, papel) {
  await pagina.goto(`/api/exemplo/entrar?papel=${papel}`);
  await pagina.waitForURL(/\/inicio(\?|$)/);
}

/** A cliente reserva um horário do prestador pela tela do perfil dele. */
async function reservar(pagina, slot, descricao) {
  await pagina.goto(`/prestador/${cenario.prestador}`);
  // O seletor de horário (Fatia 3, lote D) dá a cada chip o nome "dd/mm/aaaa · HH:MM–HH:MM";
  // escolher um chip revela, abaixo dos horários, o formulário daquele horário.
  await pagina.getByRole("button", { name: `${dataBr(slot.data)} · ${slot.inicio}–${slot.fim}` }).click();
  await pagina.getByPlaceholder("O que você precisa?").fill(descricao);
  // Desde 10/09 o tipo de serviço é obrigatório na reserva (migration 0047) e o
  // botão do GPS se chama "Marcar minha localização atual".
  await pagina.getByLabel("Tipo de serviço").selectOption({ label: "Instalação elétrica" });
  await pagina.getByPlaceholder("Rua, número, bairro").fill("Rua Moreira César, 54 — Icaraí, Niterói");
  await pagina.getByRole("button", { name: /Marcar minha localização atual|Usar minha localização/ }).click();
  await pagina.getByRole("button", { name: "Reservar horário" }).click();
  await pagina.getByText("Pedido enviado!").waitFor();
}

// ── Passos ───────────────────────────────────────────────────────────────────

const resultados = [];

async function passo(n, nome, pagina, fn) {
  try {
    await fn();
    resultados.push({ n, nome, ok: true });
    console.log(`  ✔ ${String(n).padStart(2)}. ${nome}`);
  } catch (e) {
    const detalhe = String(e?.message ?? e).split("\n")[0];
    resultados.push({ n, nome, ok: false, detalhe });
    console.log(`  ✘ ${String(n).padStart(2)}. ${nome} — ${detalhe}`);
    if (pagina) {
      const arquivo = join(pastaTelas, `passo-${n}.png`);
      await pagina.screenshot({ path: arquivo, fullPage: true }).catch(() => {});
      console.log(`       tela: ${arquivo}`);
    }
  }
}

async function roteiro() {
  const [slotA, slotB] = cenario.slots;
  const s = sufixo();
  const descA = `${MARCA} — pedido A ${s}`;
  const descB = `${MARCA} — pedido B ${s}`;
  const motivo = `${MARCA} — a cliente desistiu ${s}`;

  const ctxCliente = await novoContexto();
  const cliente = await novaPagina(ctxCliente);
  const ctxPrestador = await novoContexto();
  const prestador = await novaPagina(ctxPrestador);
  // Confirmações do navegador (confirm/prompt) aceitas; o motivo de cancelamento vai no prompt.
  let textoDoPrompt = motivo;
  for (const p of [cliente, prestador]) p.on("dialog", (d) => d.accept(d.type() === "prompt" ? textoDoPrompt : undefined));

  await passo(1, "a cliente reserva um horário", cliente, async () => {
    await entrarComoExemplo(cliente, "cliente");
    await reservar(cliente, slotA, descA);
    await esperar(async () => (await servicoDoHorario(slotA.id))?.status === "pendente", "o serviço não nasceu pendente");
    const s1 = await servicoDoHorario(slotA.id);
    if (s1.cliente_id !== cenario.cliente) throw new Error("o serviço nasceu em nome de outra pessoa");
    await esperar(async () => (await statusDoHorario(slotA.id)) === "pendente", "o horário continuou livre depois da reserva (ADR 0011)");
  });

  await passo(2, "o prestador confirma", prestador, async () => {
    await entrarComoExemplo(prestador, "prestador_servico");
    await prestador.goto(`/agenda/${slotA.id}`);
    await prestador.getByRole("button", { name: "Aceitar serviço" }).click();
    await esperar(async () => (await servicoDoHorario(slotA.id))?.status === "confirmado", "o serviço não virou confirmado");
    await prestador.getByText("confirmado", { exact: true }).first().waitFor();
  });

  await passo(3, "o prestador marca realizado", prestador, async () => {
    await prestador.goto(`/agenda/${slotA.id}`);
    await prestador.getByRole("button", { name: "Marcar como realizado" }).click();
    await esperar(async () => (await servicoDoHorario(slotA.id))?.status === "realizado", "o serviço não virou realizado");
    await prestador.getByText("realizado", { exact: true }).first().waitFor();
  });

  await passo(4, "a cliente cancela outro serviço, com motivo", cliente, async () => {
    await reservar(cliente, slotB, descB);
    await cliente.goto("/meus-servicos");
    // Desde a Fatia 4 o motivo vai num formulário inline (não mais no prompt do
    // navegador): "Cancelar serviço" abre o campo, "Confirmar cancelamento" envia.
    const linha = cliente.locator(
      `xpath=//p[contains(normalize-space(.), "${descB}")]/ancestor::div[.//button[normalize-space(.)="Cancelar serviço"]][1]`,
    );
    await linha.getByRole("button", { name: "Cancelar serviço" }).click();
    await linha.getByLabel("Motivo do cancelamento").fill(motivo);
    await linha.getByRole("button", { name: "Confirmar cancelamento" }).click();
    await esperar(async () => {
      const sB = await servicoDoHorario(slotB.id);
      return sB?.status === "cancelado" && sB.cancelado_motivo === motivo;
    }, "o serviço não foi cancelado com o motivo");
    // Defeito conhecido (D-031): às vezes a resposta da action é cancelada no navegador e
    // o botão fica em "Cancelando…" — o cancelamento está salvo, a tela é que não se
    // atualiza sozinha. O passo prova a jornada (o que a pessoa vê depois de cancelar) e
    // registra o defeito sem esconder: se a tela não se atualizar, recarrega e avisa.
    try {
      await cliente.getByText(`Cancelado: ${motivo}`).waitFor({ timeout: 15_000 });
    } catch {
      console.log("       aviso: a tela não se atualizou sozinha depois de cancelar (D-031) — recarregando");
      await cliente.reload();
      await cliente.getByText(`Cancelado: ${motivo}`).waitFor();
    }
  });

  await passo(5, "o prestador vê o WhatsApp da cliente do serviço", prestador, async () => {
    const { data: pii } = await sb.from("profiles_pii").select("telefone").eq("user_id", cenario.cliente).single();
    const digitos = String(pii?.telefone ?? "").replace(/\D/g, "");
    if (!digitos) throw new Error("a cliente de exemplo não tem telefone cadastrado");
    const esperado = `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
    await prestador.goto(`/agenda/${slotA.id}`);
    await prestador.locator(`a[href="${esperado}"]`).first().waitFor();
  });

  await ctxCliente.close();
  await ctxPrestador.close();

  let n = 6;
  for (const [papel, rotulo] of PAPEIS) {
    const ctx = await novoContexto();
    const pagina = await novaPagina(ctx);
    await passo(n++, `o botão da landing entra como ${papel}`, pagina, async () => {
      await pagina.goto("/");
      await pagina.locator(`a[href="/api/exemplo/entrar?papel=${papel}"]`).click();
      await pagina.waitForURL(/\/inicio(\?|$)/);
      await pagina.locator("aside").getByText(rotulo).first().waitFor();
    });
    await ctx.close();
  }
}

// ── Execução ─────────────────────────────────────────────────────────────────

let codigo = 1;
try {
  if (servir) await subirServidor();
  await prepararCenario();
  navegador = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: "chrome", headless: true },
  );
  console.log(`Regressão da Fatia 1 (R-54) · ${BASE}`);
  await roteiro();
  const certos = resultados.filter((r) => r.ok).length;
  console.log(`REGRESSAO_FATIA1=${certos}/10`);
  codigo = certos === 10 && resultados.length === 10 ? 0 : 1;
} catch (e) {
  console.error(`regressão da Fatia 1: ${e?.message ?? e}`);
  console.log(`REGRESSAO_FATIA1=ERRO`);
} finally {
  await navegador?.close().catch(() => {});
  await limparCenario().catch((e) => console.error(`limpeza: ${e?.message ?? e}`));
  derrubarServidor();
}
process.exit(codigo);
