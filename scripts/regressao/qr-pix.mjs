// Confere que o QR Pix com os dados no meio (components/pix/qr-pix.tsx) LÊ de
// verdade: abre o perfil do prestador de exemplo e o detalhe de um serviço,
// pega os pixels do canvas e decodifica com o jsQR — o texto lido tem de ser
// exatamente o BR Code (data-payload). Sem valor, com valor e com descrição.
// Uso: node scripts/regressao/qr-pix.mjs [base]  (servidor no ar; conta de exemplo pela rota de 1 clique)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const BASE = process.argv[2] ?? "http://localhost:3000";
const JOAO = "44acb9df-ec76-4154-aa31-b2deae8c18e2";
const jsqr = fileURLToPath(new URL("../../node_modules/jsqr/dist/jsQR.js", import.meta.url));

const nav = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
await ctx.addInitScript(() => { try { localStorage.setItem("maa-cookies-aceitos", "essenciais"); } catch {} });
const p = await ctx.newPage();
await p.goto(`${BASE}/api/exemplo/entrar?papel=prestador_servico`, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForURL(/\/inicio/, { timeout: 120000 }).catch(() => {});

async function ler(rotulo) {
  await p.waitForSelector("canvas[data-payload]", { timeout: 30000 });
  await p.waitForTimeout(800);
  await p.addScriptTag({ path: jsqr });
  const r = await p.evaluate(() => {
    const c = document.querySelector("canvas[data-payload]");
    const img = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    const lido = window.jsQR(img.data, c.width, c.height);
    return { ok: lido?.data === c.dataset.payload, lido: lido?.data?.slice(0, 40) ?? null };
  });
  console.log(`${r.ok ? "✔" : "✘"} ${rotulo}${r.ok ? "" : ` — lido: ${r.lido}`}`);
  return r.ok;
}

const resultados = [];
await p.goto(`${BASE}/perfil/${JOAO}#chaves-pix`, { waitUntil: "domcontentloaded", timeout: 120000 });
resultados.push(await ler("perfil · valor em aberto"));
await p.getByLabel("Valor (opcional)").fill("6,99");
await p.getByLabel("Do que é (opcional)").fill("Parafusos e buchas");
resultados.push(await ler("perfil · R$ 6,99 com descrição"));
await p.getByLabel("Valor (opcional)").fill("1234,56");
resultados.push(await ler("perfil · R$ 1.234,56"));
await p.getByRole("radio", { name: /Itaú/ }).click();
resultados.push(await ler("perfil · segunda chave"));

// Detalhe de um serviço do João (a cobrança do serviço).
await p.goto(`${BASE}/agenda`, { waitUntil: "domcontentloaded", timeout: 120000 });
const link = await p.evaluate(() => [...document.querySelectorAll('a[href^="/agenda/"]')].map((a) => a.getAttribute("href")).find((h) => h && h.length > 20));
if (link) {
  await p.goto(`${BASE}${link}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (await p.locator("canvas[data-payload]").count()) resultados.push(await ler("cobrança do serviço"));
}

await nav.close();
const ok = resultados.every(Boolean);
console.log(`QR_PIX=${resultados.filter(Boolean).length}/${resultados.length}`);
process.exit(ok ? 0 : 1);
