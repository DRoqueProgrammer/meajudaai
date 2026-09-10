// Spike do `swimlane-jornada-leg-01` — o primeiro leg do programa inteiro.
//
// PERGUNTA QUE ELE RESPONDE: um código de cobrança Pix que carrega nome, data,
// valor e código do projeto NO CENTRO continua sendo lido por aplicativo de
// banco real? E, se não, qual o limite de conteúdo central que ainda funciona?
//
// POR QUE É O PRIMEIRO: se a resposta for "não", R-14 e R-15 do tech-spec mudam
// de forma e a raia `comissao` muda junto. Descobrir isso depois de construir a
// cobrança seria o desperdício mais caro deste programa (ver o Build order do
// PRD da raia `jornada`).
//
// POR QUE ELE PARA AQUI: a verificação exige um humano com o celular. Este
// script produz as amostras; a leitura é do Leonardo, em 3 bancos diferentes —
// a barra subiu de 2 tentativas para 3 bancos por causa da objeção M2 do Pass 4
// (duas leituras no mesmo app provam o app, não o código).
//
// SVG puro, sem dependência nativa: o `qrcode` já está no projeto e emite SVG.
//
// Rodar:  node scripts/spike-qr-centro.mjs
// Saída:  design/spike-qr/index.html  (abre no navegador e escaneia da tela)

import { writeFileSync, mkdirSync } from "node:fs";
import QRCode from "qrcode";

// ── payload real, com os mesmos campos que a cobrança de comissão vai usar ────
// Reproduz `lib/pix/static-qr.ts` de propósito: um spike não deve depender do
// build do app pra rodar, senão para de rodar no dia em que o app quebra.
const campo = (id, v) => `${id}${String(v.length).padStart(2, "0")}${v}`;

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function montarPix({ chave, nome, cidade, valor, txid }) {
  const p =
    campo("00", "01") +
    campo("01", "11") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", txid || "***")) +
    "6304";
  return p + crc16(p);
}

// ── as combinações a testar ──────────────────────────────────────────────────
// A variável independente é o LADO do bloco central, como fração do lado do QR.
// Correção de erro H recupera ~30% dos módulos, mas o bloco central cobre uma
// área contígua — o limite prático fica bem abaixo dos 30% teóricos.
const TAMANHOS = [
  { nome: "sem-centro", fracao: 0.0, obs: "controle — se este falhar, o problema é outro" },
  { nome: "centro-16pct", fracao: 0.16, obs: "conservador" },
  { nome: "centro-22pct", fracao: 0.22, obs: "provável limite útil" },
  { nome: "centro-28pct", fracao: 0.28, obs: "agressivo" },
  { nome: "centro-34pct", fracao: 0.34, obs: "esperado FALHAR — serve de piso" },
];

const payload = montarPix({
  chave: "meajudaai@exemplo.com.br",
  nome: "ME AJUDA AI NITEROI",
  cidade: "NITEROI",
  valor: 137.5,
  txid: "MAA2026091001",
});

const CENTRO = ["ME AJUDA AI", "10/09/2026", "R$ 137,50", "MAA-0001"];
const LADO = 1000; // viewBox interno; o CSS controla o tamanho na tela

function comCentro(svg, fracao) {
  if (fracao <= 0) return svg;
  // O SVG do `qrcode` usa viewBox "0 0 N N" em módulos. Descobre N pra
  // posicionar o bloco central em coordenadas do próprio viewBox.
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) /);
  const n = m ? parseFloat(m[1]) : 33;
  const lado = n * fracao;
  const x = (n - lado) / 2;
  const raio = lado * 0.1;
  const alturaLinha = lado / (CENTRO.length + 1.2);
  const textos = CENTRO.map((t, i) => {
    const peso = i === 2 ? ' font-weight="700"' : "";
    const tam = alturaLinha * 0.6;
    const y = x + alturaLinha * (i + 1.0);
    return `<text x="${n / 2}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${tam}"${peso} fill="#0D47A1">${t}</text>`;
  }).join("");
  const overlay =
    `<rect x="${x}" y="${x}" width="${lado}" height="${lado}" rx="${raio}" ry="${raio}" fill="#FFFFFF" stroke="#0D47A1" stroke-width="${lado * 0.02}"/>` +
    textos;
  return svg.replace("</svg>", overlay + "</svg>");
}

mkdirSync("design/spike-qr", { recursive: true });

const cartoes = [];
for (const t of TAMANHOS) {
  // Correção de erro H (~30%): é o único nível que torna oclusão central viável.
  // O componente atual do app (components/pix/cobranca-pix.tsx) usa "M" (~15%),
  // que não suporta bloco central — trocar isso já é um achado deste spike.
  let svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#0D47A1", light: "#FFFFFF" },
  });
  svg = comCentro(svg, t.fracao);
  svg = svg.replace("<svg", `<svg width="${LADO}" height="${LADO}"`);
  const arquivo = `design/spike-qr/qr-${t.nome}.svg`;
  writeFileSync(arquivo, svg);
  cartoes.push({ ...t, svg });
  console.log("gerado", arquivo);
}

const figuras = cartoes
  .map(
    (c) => `  <figure>
    <div class="qr">${c.svg.replace(/width="\d+" height="\d+"/, 'style="width:100%;height:auto;display:block"')}</div>
    <figcaption>
      <b>${c.nome}</b> — ${c.obs}
      <label><input type="checkbox"> Banco 1 leu</label>
      <label><input type="checkbox"> Banco 2 leu</label>
      <label><input type="checkbox"> Banco 3 leu</label>
    </figcaption>
  </figure>`
  )
  .join("\n");

writeFileSync(
  "design/spike-qr/index.html",
  `<!doctype html><meta charset="utf-8"><title>Spike QR — dados no centro</title>
<style>
 body{font:15px/1.6 system-ui,sans-serif;margin:24px auto;max-width:1100px;color:#111;padding:0 16px}
 h1{font-size:22px;margin-bottom:4px} p{max-width:66ch}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin-top:28px}
 figure{margin:0;border:1px solid #ddd;border-radius:14px;padding:14px;background:#fff}
 .qr{background:#fff} figcaption{font-size:13px;margin-top:10px}
 label{display:block;margin-top:4px} code{background:#f4f4f5;padding:2px 5px;border-radius:4px}
 .nota{background:#fffbe6;border-left:4px solid #FFC107;padding:12px 16px;border-radius:8px;margin:20px 0}
</style>
<h1>Spike do QR — dados no centro ainda são lidos?</h1>
<p>Este é o <code>swimlane-jornada-leg-01</code>, o <b>primeiro leg do programa inteiro</b>.
A pergunta: um código Pix com nome, data, valor e código do projeto no centro continua legível?</p>

<div class="nota">
<b>Como testar (leva uns 2 minutos):</b> tente ler cada código abaixo com <b>3 aplicativos
de bancos diferentes</b>, direto da tela. Marque o que leu. A barra é de 3 bancos, e não de
2 tentativas, por causa da objeção M2 do Pass 4: duas leituras no mesmo app provam o app,
não o código.
</div>

<p><b>O que a resposta decide:</b> o maior bloco central que os 3 bancos leem vira o limite
que a raia <code>comissao</code> respeita em <code>leg-04-cobranca</code>. Se nem o mais
conservador passar, R-14 e R-15 do tech-spec mudam de forma — e é melhor saber agora do que
depois de a cobrança estar construída.</p>

<p>Todos usam correção de erro <b>nível H</b> (~30% de recuperação). O componente que já
existe no app usa <b>M</b> (~15%), que não suporta oclusão central: trocar esse nível já é
um achado deste spike, independente do resultado da leitura.</p>

<div class="grid">
${figuras}
</div>
`
);
console.log("\nabra: design/spike-qr/index.html");
