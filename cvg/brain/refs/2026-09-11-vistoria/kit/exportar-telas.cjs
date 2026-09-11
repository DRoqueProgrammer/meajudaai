// Exporta a primeira tela de cada página (celular e desktop, + amostras de tema escuro,
// primeira visita e interação) como JPEG leve, para versionar como o "antes" da vistoria.
// Uso: node exportar-telas.cjs <pasta-destino>
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const RAIZ = path.resolve(__dirname, "..", "evidencias");
const destino = path.resolve(process.argv[2]);
fs.mkdirSync(destino, { recursive: true });
const m = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));
const LARGURA = { mobile: 390, desktop: 1000 };

(async () => {
  const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const p = await b.newPage();
  const vistos = new Set();
  let n = 0;
  let bytes = 0;
  for (const r of m.registros) {
    if (!LARGURA[r.vp] || !r.arquivos || !r.arquivos.length) continue;
    const origem = r.arquivos[0];
    const nome = origem.replace(/__\d+de\d+\.png$/, "").replace(/\.png$/, "") + ".jpg";
    if (vistos.has(nome)) continue;
    vistos.add(nome);
    const png = fs.readFileSync(path.join(RAIZ, "shots", origem)).toString("base64");
    const uri = await p.evaluate(
      async ([src, w]) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const e = Math.min(1, w / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * e);
        c.height = Math.round(img.naturalHeight * e);
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.72);
      },
      ["data:image/png;base64," + png, LARGURA[r.vp]],
    );
    const buf = Buffer.from(uri.split(",")[1], "base64");
    fs.writeFileSync(path.join(destino, nome), buf);
    n++;
    bytes += buf.length;
  }
  await b.close();
  console.log(`${n} telas, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
})();
