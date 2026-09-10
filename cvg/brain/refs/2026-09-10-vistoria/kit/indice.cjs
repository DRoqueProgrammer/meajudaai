// Gera evidencias/INDICE.md a partir do manifest.json: telas agrupadas por papel → página → viewport.
const fs = require("fs");
const path = require("path");
const RAIZ = path.resolve(__dirname, "..", "evidencias");
const m = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));
const NOMES = {
  anon: "Visitante (sem login)",
  cliente: "Cliente — Marina Costa",
  prestador_servico: "Prestador de Serviço — João Ferreira (eletricista)",
  admin: "Administrador — Marcelo Lopes",
  sysadmin: "SysAdmin — Ricardo Bastos",
  funcionario: "Funcionário — Beatriz Andrade",
};
const porPapel = {};
for (const r of m.registros) {
  (porPapel[r.papel] ??= []).push(r);
}
let out = `# Índice de telas capturadas\n\nPasta dos arquivos: \`shots/\` (mesma pasta deste índice). Viewports: mobile 390×844 @2x · tablet 768×1024 · desktop 1440×900.\nCada arquivo é uma tela (posição de rolagem). "NdeT" = tela N de T telas que a página ocupa (máx. 5 salvas).\n\nIDs dinâmicos resolvidos: \`${JSON.stringify(m.descobertas)}\`\n`;
for (const [papel, regs] of Object.entries(porPapel)) {
  out += `\n## ${NOMES[papel] ?? papel}\n`;
  const porRota = {};
  for (const r of regs) (porRota[`${r.rota}${r.tema === "escuro" ? " (tema escuro)" : ""}${r.arquivos?.[0]?.includes("primeira-visita") ? " (primeira visita, banner de cookies)" : ""}`] ??= []).push(r);
  for (const [rota, rs] of Object.entries(porRota)) {
    const destino = rs[0].urlFinal && rs[0].urlFinal !== rs[0].url ? ` → redirecionou para \`${rs[0].urlFinal}\`` : "";
    out += `\n**${rota}**${rs[0].url && rs[0].url !== rota ? ` (\`${rs[0].url}\`)` : ""}${destino}\n`;
    for (const r of rs) out += `- ${r.vp}: ${r.arquivos.map((a) => `\`${a}\``).join(", ")}\n`;
  }
}
fs.writeFileSync(path.join(RAIZ, "INDICE.md"), out);
console.log("INDICE.md ok", m.registros.length);
