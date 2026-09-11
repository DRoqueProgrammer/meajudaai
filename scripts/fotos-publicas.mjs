// Nenhuma conta sem foto (decisão do Leonardo em 10/09/2026): quem está sem
// `foto_url` recebe um retrato público do randomuser.me pelo gênero cadastrado.
// Mesmo algoritmo de lib/foto-aleatoria.ts (copiado aqui porque o script roda
// em Node puro, sem o TypeScript do app) — a mesma conta ganha o mesmo rosto
// no cadastro, aqui e depois de remover a própria foto.
//
// Não mexe em quem já tem foto, nem em conta anonimizada (status 'removido').
// Uso: node scripts/fotos-publicas.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Hash FNV-1a de 32 bits — igual ao de lib/foto-aleatoria.ts. */
function hashDe(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** URL do retrato público da pessoa — igual a lib/foto-aleatoria.ts:fotoAleatoria. */
export function fotoAleatoria(userId, genero) {
  const h = hashDe(userId);
  const pasta = genero === "masculino" ? "men" : genero === "feminino" ? "women" : h % 2 === 0 ? "men" : "women";
  return `https://randomuser.me/api/portraits/${pasta}/${h % 100}.jpg`;
}

/** Preenche a foto de todo perfil sem foto (menos os anonimizados). Devolve quantos mudaram. */
export async function preencherFotos(db) {
  const { data, error } = await db.from("profiles").select("user_id, genero, status").is("foto_url", null);
  if (error) throw error;
  let n = 0;
  for (const p of data ?? []) {
    if (p.status === "removido") continue;
    const { error: e } = await db.from("profiles").update({ foto_url: fotoAleatoria(p.user_id, p.genero) }).eq("user_id", p.user_id);
    if (e) throw e;
    n++;
  }
  return n;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const n = await preencherFotos(db);
  console.log(`Fotos públicas preenchidas: ${n} perfil(is).`);
}
