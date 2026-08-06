/**
 * Semeia as fotos de perfil das contas de demonstração.
 *
 * Os arquivos de origem são PNG 1254×1254 de ~2 MB cada — para um círculo de
 * 44px no rodapé isso é absurdo, e o público-alvo está em 4G de obra. O script
 * reduz para WebP 256px (2× o maior uso, que é o avatar 64px do editar perfil)
 * antes de subir, o que corta ~98% do peso.
 *
 * Idempotente: sobe sempre no mesmo caminho `<user_id>/perfil.webp` com upsert.
 *
 * Uso: node scripts/semear-fotos.mjs <pasta-com-as-fotos>
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const linha of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Perfil semeado → arquivo de origem. A escolha segue o papel e o ofício. */
const MAPA = [
  // A imagem "eletricista" da pasta é de uma mulher e não há eletricista
  // masculino; usa o encarregado de obras (homem, obra, capacete amarelo). O
  // nome do arquivo é só rótulo interno do seed — não aparece em lugar nenhum da UI.
  { nome: "João Eletricista", arquivo: "perfil-09-encarregado-obras-m.png" },
  { nome: "Carlos Silva", arquivo: "perfil-14-ajudante-experiente-m.png" },
  { nome: "Ana Assistente", arquivo: "perfil-02-administrativo-f.png" },
  { nome: "Rafael Nunes", arquivo: "perfil-12-atendimento-empresarial-m.png" },
];

const pasta = process.argv[2];
if (!pasta) {
  console.error("uso: node scripts/semear-fotos.mjs <pasta-com-as-fotos>");
  process.exit(1);
}
const disponiveis = new Set(readdirSync(pasta));

const { data: perfis, error: erroPerfis } = await sb
  .from("profiles")
  .select("user_id, nome")
  .in(
    "nome",
    MAPA.map((m) => m.nome),
  );
if (erroPerfis) {
  console.error("falha ao ler profiles:", erroPerfis.message);
  process.exit(1);
}
const idDe = new Map(perfis.map((p) => [p.nome, p.user_id]));

let ok = 0;
for (const { nome, arquivo } of MAPA) {
  const userId = idDe.get(nome);
  if (!userId) {
    console.warn(`- ${nome}: perfil não encontrado, pulando`);
    continue;
  }
  if (!disponiveis.has(arquivo)) {
    console.warn(`- ${nome}: arquivo ${arquivo} não existe na pasta, pulando`);
    continue;
  }

  const origem = readFileSync(join(pasta, arquivo));
  const webp = await sharp(origem)
    .resize(256, 256, { fit: "cover", position: "top" })
    .webp({ quality: 82 })
    .toBuffer();

  const caminho = `${userId}/perfil.webp`;
  const { error: erroUp } = await sb.storage
    .from("avatares")
    .upload(caminho, webp, { upsert: true, contentType: "image/webp" });
  if (erroUp) {
    console.error(`- ${nome}: falha no upload — ${erroUp.message}`);
    continue;
  }

  const { data: pub } = sb.storage.from("avatares").getPublicUrl(caminho);
  // `?v=` muda a chave de cache do CDN. Sem isso, reenviar no mesmo caminho
  // deixava a foto antiga no ar até o cache expirar — o re-seed "não fazia nada"
  // na tela mesmo tendo trocado o objeto.
  const fotoUrl = `${pub.publicUrl}?v=${Date.now()}`;
  const { error: erroPerfil } = await sb
    .from("profiles")
    .update({ foto_url: fotoUrl })
    .eq("user_id", userId);
  if (erroPerfil) {
    console.error(`- ${nome}: falha ao gravar foto_url — ${erroPerfil.message}`);
    continue;
  }

  const kb = (webp.length / 1024).toFixed(0);
  const antes = (origem.length / 1024 / 1024).toFixed(1);
  console.log(`+ ${nome.padEnd(18)} ${arquivo.padEnd(38)} ${antes} MB → ${kb} KB`);
  ok++;
}
console.log(`\n${ok} de ${MAPA.length} perfis com foto.`);
