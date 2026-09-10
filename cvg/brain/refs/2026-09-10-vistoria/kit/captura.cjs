// Kit de evidências do Me Ajuda Aí para o conselho de agentes.
// Percorre o app (build de produção em localhost:3000) como cada papel, em 3 viewports,
// salvando screenshots em "telas" (o que o usuário vê a cada rolagem) + métricas
// automáticas de responsividade/acessibilidade por página, + um passe de performance
// com rede 4G lenta e CPU 4x mais lenta (celular médio).
// Só navega (GET). Login pelas contas de exemplo via /api/exemplo/entrar (1 clique).
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const RAIZ = path.resolve(__dirname, "..", "evidencias");
const SHOTS = path.join(RAIZ, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const VPS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const MAX_TELAS = 5;

const ROTEIRO = {
  anon: ["/", "/login", "/cadastro", "/cadastro?papel=prestador_servico", "/recuperar-senha", "/termos", "/privacidade", "/pagina-que-nao-existe"],
  cliente: ["/inicio", "/buscar-prestador", "@prestador", "/agenda", "/meus-servicos", "@servico", "/mensagens", "/notificacoes", "@perfil", "/perfil/editar"],
  prestador_servico: ["/inicio", "/agenda", "/clientes", "@cliente", "@servico", "/mapa", "/mensagens", "/notificacoes", "@perfil", "/perfil/editar"],
  admin: ["/inicio", "/minhas-vagas", "/equipe", "/mapa", "/financeiro", "/relatorios", "/notificacoes", "@perfil"],
  sysadmin: ["/inicio", "/admin/usuarios", "/admin/denuncias", "/admin/demanda", "/admin/metricas", "/admin/logs", "/admin/servicos", "@perfil"],
  funcionario: ["/inicio"],
};

const ESCURO = {
  anon: ["/"],
  cliente: ["/inicio", "/buscar-prestador"],
  prestador_servico: ["/inicio", "/agenda"],
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

function slugDe(rota) {
  if (rota === "/") return "landing";
  if (rota === "/pagina-que-nao-existe") return "404";
  return rota
    .replace(/^@/, "")
    .replace(/^\//, "")
    .replace(/\?papel=prestador_servico/, "-prestador")
    .replace(/[/?=&]/g, "-");
}

// ---------- auditoria dentro da página (serializada pelo Playwright) ----------
function auditar() {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.05;
  };
  const desc = (el) => {
    const t = el.tagName.toLowerCase();
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 5).join(".") : "";
    const txt = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${t}${cls}${txt ? ` "${txt}"` : ""}`;
  };
  const res = {
    titulo: document.title,
    lang: doc.getAttribute("lang"),
    tema: doc.dataset.theme || "claro",
    vw,
    scrollW: doc.scrollWidth,
    alturaDoc: Math.max(doc.scrollHeight, document.body.scrollHeight),
  };
  res.overflowX = doc.scrollWidth > vw + 1;

  // 1) Estouro horizontal — elementos que passam da borda da tela fora de um container rolável
  const dentroDeScroll = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
    }
    return false;
  };
  const infratores = new Set();
  const lista = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !dentroDeScroll(el)) {
      infratores.add(el);
      if (!infratores.has(el.parentElement)) lista.push(`${desc(el)} [left ${Math.round(r.left)}, right ${Math.round(r.right)}, w ${Math.round(r.width)}]`);
    }
  }
  res.estouroHorizontal = { qtd: infratores.size, externos: lista.slice(0, 8) };

  // 2) Alvos de toque (WCAG 2.5.8 AA = 24px; recomendação mobile = 44px)
  const alvos = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], summary")].filter(visivel);
  const p24 = [];
  const p44 = [];
  for (const el of alvos) {
    const cs = getComputedStyle(el);
    if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li")) continue; // link em texto corrido: isento
    let r = el.getBoundingClientRect();
    if ((el.type === "checkbox" || el.type === "radio") && el.closest("label")) r = el.closest("label").getBoundingClientRect();
    const s = `${desc(el)} (${Math.round(r.width)}×${Math.round(r.height)})`;
    if (r.width < 24 || r.height < 24) p24.push(s);
    else if (r.width < 44 || r.height < 44) p44.push(s);
  }
  res.alvosToque = { total: alvos.length, abaixo24: p24.length, abaixo44: p44.length, ex24: p24.slice(0, 6), ex44: p44.slice(0, 6) };

  // 3) Tipografia + contraste aproximado (WCAG 1.4.3)
  const parseCor = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const fundoDe = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parseCor(cs.backgroundColor);
      if (c && c.a > 0.6) return c;
    }
    return doc.dataset.theme === "dark" ? null : { r: 255, g: 255, b: 255, a: 1 };
  };
  const tamanhos = {};
  const familias = new Set();
  let minFonte = 99;
  const menores12 = [];
  const baixoContraste = [];
  let textos = 0;
  const vistos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || vistos.has(el) || !visivel(el)) continue;
    vistos.add(el);
    textos++;
    const cs = getComputedStyle(el);
    const fsz = parseFloat(cs.fontSize);
    tamanhos[fsz] = (tamanhos[fsz] || 0) + 1;
    familias.add(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
    if (fsz < minFonte) minFonte = fsz;
    if (fsz < 12 && menores12.length < 8) menores12.push(`${fsz}px ${desc(el)}`);
    const cor = parseCor(cs.color);
    const bg = fundoDe(el);
    if (cor && bg) {
      const a = cor.a;
      const mix = { r: cor.r * a + bg.r * (1 - a), g: cor.g * a + bg.g * (1 - a), b: cor.b * a + bg.b * (1 - a) };
      const L1 = lum(mix), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const grande = fsz >= 24 || (fsz >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      if (ratio < (grande ? 3 : 4.5)) baixoContraste.push(`${ratio.toFixed(2)}:1 ${fsz}px ${desc(el)}`);
    }
  }
  res.tipografia = {
    elementosDeTexto: textos,
    minFontePx: minFonte === 99 ? null : minFonte,
    tamanhosDistintos: Object.keys(tamanhos).length,
    distribuicao: Object.fromEntries(Object.entries(tamanhos).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))),
    familias: [...familias],
    menores12,
  };
  res.contraste = { abaixoDoMinimo: baixoContraste.length, exemplos: baixoContraste.slice(0, 8) };

  // 4) Nomes acessíveis, labels, imagens, headings, landmarks
  const semNome = [...document.querySelectorAll("a[href], button, [role=button]")].filter(visivel).filter((el) => {
    const t = (el.innerText || "").trim();
    return !t && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title") && !el.querySelector("img[alt]:not([alt=''])");
  });
  const camposSemLabel = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")].filter(visivel).filter((el) => {
    return (!el.labels || el.labels.length === 0) && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title");
  });
  const imgs = [...document.images].filter(visivel);
  res.a11y = {
    interativosSemNome: semNome.length,
    exSemNome: semNome.slice(0, 5).map(desc),
    camposSemLabel: camposSemLabel.length,
    exCamposSemLabel: camposSemLabel.slice(0, 5).map(desc),
    imgsSemAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
    imgsSuperdimensionadas: imgs
      .filter((i) => i.naturalWidth > 0 && i.naturalWidth > i.getBoundingClientRect().width * devicePixelRatio * 2)
      .slice(0, 5)
      .map((i) => `${i.currentSrc.slice(-60)} natural ${i.naturalWidth}px exibida ${Math.round(i.getBoundingClientRect().width)}px`),
    h1: [...document.querySelectorAll("h1")].map((h) => h.innerText.trim().slice(0, 60)),
    h2: [...document.querySelectorAll("h2")].slice(0, 8).map((h) => h.innerText.trim().slice(0, 60)),
    temMain: !!document.querySelector("main"),
    temNav: !!document.querySelector("nav"),
  };

  // 5) Timing de navegação (produção, localhost; Supabase é remoto)
  const nav = performance.getEntriesByType("navigation")[0];
  const recursos = performance.getEntriesByType("resource");
  const porTipo = {};
  for (const r of recursos) porTipo[r.initiatorType] = (porTipo[r.initiatorType] || 0) + (r.transferSize || 0);
  res.timing = nav
    ? {
        ttfbMs: Math.round(nav.responseStart - nav.requestStart),
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
        loadMs: Math.round(nav.loadEventEnd),
        requisicoes: recursos.length,
        kbTransferidosPorTipo: Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, Math.round(v / 1024)])),
      }
    : null;
  return res;
}

// ---------- utilitários ----------
async function acharLink(page, url, prefixo) {
  try {
    await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 45000 });
  } catch {}
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  return hrefs.find((h) => h && h.startsWith(prefixo) && /[0-9a-f]{8}-[0-9a-f]{4}-/.test(h)) || null;
}

async function telas(page, vpNome, base) {
  const vp = VPS[vpNome].viewport;
  const altura = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  const totais = Math.max(1, Math.ceil(altura / vp.height));
  const n = Math.min(totais, MAX_TELAS);
  const arquivos = [];
  for (let k = 0; k < n; k++) {
    await page.evaluate((y) => window.scrollTo(0, y), k * vp.height);
    await page.waitForTimeout(250);
    const nome = `${base}__${k + 1}de${totais}.png`;
    await page.screenshot({ path: path.join(SHOTS, nome) });
    arquivos.push(nome);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { arquivos, totais };
}

async function visitar(page, papel, rota, url, vpNome, registros, sufixo = "") {
  const erros = [];
  const onConsole = (m) => {
    if (m.type() === "error") erros.push(m.text().slice(0, 240));
  };
  const onErr = (e) => erros.push("pageerror: " + String(e.message).slice(0, 240));
  page.on("console", onConsole);
  page.on("pageerror", onErr);
  let status = null;
  try {
    const resp = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 60000 });
    status = resp ? resp.status() : null;
  } catch (e) {
    erros.push("goto: " + String(e.message).split("\n")[0].slice(0, 200));
  }
  await page.waitForTimeout(1000);
  const metricas = await page.evaluate(auditar).catch((e) => ({ erro: String(e).slice(0, 200) }));
  const base = `${papel}__${slugDe(rota)}${sufixo}__${vpNome}`;
  const { arquivos, totais } = await telas(page, vpNome, base);
  page.off("console", onConsole);
  page.off("pageerror", onErr);
  const reg = { papel, rota, url, urlFinal: page.url().replace(BASE, ""), vp: vpNome, tema: sufixo ? "escuro" : "claro", status, telasTotais: totais, arquivos, metricas, erros };
  registros.push(reg);
  console.log(`${papel} ${vpNome}${sufixo} ${url} -> ${reg.urlFinal} [${status}] telas=${arquivos.length}/${totais} overflowX=${metricas.overflowX} erros=${erros.length}`);
  return reg;
}

function contextoOpts(vpNome) {
  return { ...VPS[vpNome], locale: "pt-BR", timezoneId: "America/Sao_Paulo", colorScheme: "light" };
}

async function prepararContexto(ctx, { tema = "claro", consentimento = true } = {}) {
  await ctx.addInitScript(
    ([tema, consentimento]) => {
      try {
        if (consentimento) localStorage.setItem("maa-cookies-aceitos", "recusado"); // opção mais restritiva
        if (tema === "escuro") localStorage.setItem("maa-tema", "dark");
        else localStorage.removeItem("maa-tema");
      } catch {}
    },
    [tema, consentimento],
  );
}

// ---------- passe principal ----------
async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const registros = [];
  const descobertas = {};

  // Primeira impressão: landing com o banner de cookies (sem consentimento prévio)
  for (const vpNome of ["mobile", "desktop"]) {
    const ctx = await browser.newContext(contextoOpts(vpNome));
    await prepararContexto(ctx, { consentimento: false });
    const page = await ctx.newPage();
    await visitar(page, "anon", "/", "/", vpNome, registros, "-primeira-visita");
    await ctx.close();
  }

  for (const [papel, rotas] of Object.entries(ROTEIRO)) {
    // login uma vez por papel; a sessão é reaproveitada nos 3 viewports
    let estado;
    const ids = {};
    if (papel !== "anon") {
      const ctx = await browser.newContext(contextoOpts("desktop"));
      await prepararContexto(ctx);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/api/exemplo/entrar?papel=${papel}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      console.log(`login ${papel} -> ${page.url()}`);
      if (rotas.includes("@perfil")) ids["@perfil"] = await acharLink(page, "/inicio", "/perfil/");
      if (rotas.includes("@prestador")) ids["@prestador"] = await acharLink(page, "/buscar-prestador", "/prestador/");
      if (rotas.includes("@cliente")) ids["@cliente"] = await acharLink(page, "/clientes", "/clientes/");
      if (rotas.includes("@servico")) {
        for (const u of ["/inicio", "/meus-servicos", ids["@cliente"], "/agenda"].filter(Boolean)) {
          ids["@servico"] = await acharLink(page, u, "/agenda/");
          if (ids["@servico"]) break;
        }
      }
      estado = await ctx.storageState();
      await ctx.close();
      descobertas[papel] = ids;
      console.log(papel, JSON.stringify(ids));
    }

    for (const vpNome of Object.keys(VPS)) {
      const ctx = await browser.newContext({ ...contextoOpts(vpNome), ...(estado ? { storageState: estado } : {}) });
      await prepararContexto(ctx);
      const page = await ctx.newPage();
      for (const rota of rotas) {
        const url = rota.startsWith("@") ? ids[rota] : rota;
        if (!url) {
          console.log(`(sem link para ${rota} em ${papel})`);
          continue;
        }
        await visitar(page, papel, rota, url, vpNome, registros);
      }
      // estados de interação
      if (papel === "cliente" && vpNome === "mobile") {
        await page.goto(BASE + "/inicio", { waitUntil: "networkidle" }).catch(() => {});
        const conta = page.locator('nav[aria-label="Navegação principal"] >> text=Conta');
        if (await conta.count()) {
          await conta.first().click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(SHOTS, "cliente__interacao-folha-conta__mobile__1de1.png") });
          registros.push({ papel, rota: "interação: folha 'Conta' aberta no rodapé mobile", vp: vpNome, arquivos: ["cliente__interacao-folha-conta__mobile__1de1.png"] });
        }
      }
      await ctx.close();
    }

    // modo escuro (amostra)
    if (ESCURO[papel]) {
      for (const vpNome of ["mobile", "desktop"]) {
        const ctx = await browser.newContext({ ...contextoOpts(vpNome), ...(estado ? { storageState: estado } : {}) });
        await prepararContexto(ctx, { tema: "escuro" });
        const page = await ctx.newPage();
        for (const rota of ESCURO[papel]) await visitar(page, papel, rota, rota, vpNome, registros, "-escuro");
        await ctx.close();
      }
    }
  }

  fs.writeFileSync(path.join(RAIZ, "manifest.json"), JSON.stringify({ geradoEm: new Date().toISOString(), base: BASE, viewports: VPS, descobertas, registros }, null, 2));

  // ---------- passe de performance (celular médio: 4G lenta + CPU 4x) ----------
  const perf = [];
  const alvos = [
    ["anon", "/"],
    ["anon", "/login"],
    ["cliente", "/inicio"],
    ["cliente", "/buscar-prestador"],
    ["prestador_servico", "/inicio"],
    ["prestador_servico", "/agenda"],
    ["prestador_servico", "/mapa"],
  ];
  const estados = {};
  for (const papel of ["cliente", "prestador_servico"]) {
    const ctx = await browser.newContext(contextoOpts("mobile"));
    await prepararContexto(ctx);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/api/exemplo/entrar?papel=${papel}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    estados[papel] = await ctx.storageState();
    await ctx.close();
  }
  for (const [papel, url] of alvos) {
    const ctx = await browser.newContext({ ...contextoOpts("mobile"), ...(estados[papel] ? { storageState: estados[papel] } : {}) });
    await prepararContexto(ctx);
    await ctx.addInitScript(() => {
      window.__perf = { lcp: 0, cls: 0, longtasks: [] };
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__perf.longtasks.push(e.duration);
        }).observe({ type: "longtask" });
      } catch {}
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let erro = null;
    try {
      await page.goto(BASE + url, { waitUntil: "load", timeout: 90000 });
    } catch (e) {
      erro = String(e.message).split("\n")[0];
    }
    await page.waitForTimeout(3500);
    const m = await page
      .evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const fcp = performance.getEntriesByName("first-contentful-paint")[0];
        const rec = performance.getEntriesByType("resource");
        const p = window.__perf || { lcp: 0, cls: 0, longtasks: [] };
        const porTipo = {};
        for (const r of rec) porTipo[r.initiatorType] = (porTipo[r.initiatorType] || 0) + (r.transferSize || 0);
        return {
          ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          fcpMs: fcp ? Math.round(fcp.startTime) : null,
          lcpMs: Math.round(p.lcp),
          cls: Number(p.cls.toFixed(3)),
          tbtMs: Math.round(p.longtasks.reduce((s, d) => s + Math.max(0, d - 50), 0)),
          longTasks: p.longtasks.length,
          loadMs: nav ? Math.round(nav.loadEventEnd) : null,
          requisicoes: rec.length,
          kbTotal: Math.round(rec.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024 + (nav ? nav.transferSize / 1024 : 0)),
          kbPorTipo: Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, Math.round(v / 1024)])),
        };
      })
      .catch((e) => ({ erro: String(e) }));
    perf.push({ papel, url, urlFinal: page.url().replace(BASE, ""), condicoes: "mobile 390x844, 4G lenta (1,6 Mbps, 150 ms RTT), CPU 4x, cache frio", erro, ...m });
    console.log("perf", papel, url, JSON.stringify(m));
    await ctx.close();
  }
  fs.writeFileSync(path.join(RAIZ, "perf-mobile-4g.json"), JSON.stringify(perf, null, 2));

  // ---------- resumo legível ----------
  const linhas = ["| papel | página | vp | telas | estouro horiz. | toque <24 | toque <44 | fonte mín. | tam. distintos | contraste baixo | sem nome | campos s/ label | erros console | TTFB |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of registros.filter((r) => r.metricas)) {
    const m = r.metricas;
    if (m.erro) continue;
    linhas.push(
      `| ${r.papel} | ${r.rota}${r.tema === "escuro" ? " (escuro)" : ""} | ${r.vp} | ${r.telasTotais} | ${m.overflowX ? `**SIM** (${m.scrollW}px)` : "não"} | ${m.alvosToque.abaixo24} | ${m.alvosToque.abaixo44} | ${m.tipografia.minFontePx}px | ${m.tipografia.tamanhosDistintos} | ${m.contraste.abaixoDoMinimo} | ${m.a11y.interativosSemNome} | ${m.a11y.camposSemLabel} | ${r.erros.length} | ${m.timing ? m.timing.ttfbMs + "ms" : "-"} |`,
    );
  }
  const perfLinhas = ["| papel | página | TTFB | FCP | LCP | CLS | TBT | KB total | req. |", "|---|---|---|---|---|---|---|---|---|"];
  for (const p of perf) perfLinhas.push(`| ${p.papel} | ${p.url} | ${p.ttfbMs}ms | ${p.fcpMs}ms | ${p.lcpMs}ms | ${p.cls} | ${p.tbtMs}ms | ${p.kbTotal} | ${p.requisicoes} |`);
  fs.writeFileSync(
    path.join(RAIZ, "RESUMO-METRICAS.md"),
    `# Métricas automáticas — Me Ajuda Aí (build de produção, localhost)\n\nGerado em ${new Date().toISOString()}. Detalhes completos (exemplos de cada infração) em \`manifest.json\`.\n\nViewports: mobile 390×844 @2x · tablet 768×1024 · desktop 1440×900. "Telas" = quantas alturas de viewport a página ocupa (screenshots limitados a ${MAX_TELAS}).\n\nContraste é aproximado (cor do texto vs. primeiro fundo sólido ancestral). Alvo de toque: WCAG 2.5.8 AA exige 24px; 44px é a recomendação para dedo.\n\n${linhas.join("\n")}\n\n## Performance — celular médio (4G lenta + CPU 4x, cache frio)\n\n${perfLinhas.join("\n")}\n`,
  );
  await browser.close();
  console.log("OK", registros.length, "registros");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
