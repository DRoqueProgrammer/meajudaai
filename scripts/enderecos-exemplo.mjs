// Endereço e ponto no mapa das contas de EXEMPLO (Leonardo, 11/09/2026: "mapa
// aparece, mas endereço não"). A Marina tinha só o ponto, sem o endereço
// escrito; as outras contas de exemplo nem tinham local — e o cadastro real já
// exige os dois. Rua e bairro de verdade, SEM número de casa (para o ponto não
// apontar a porta de ninguém), marcados "endereço de exemplo". O gatilho
// `profile_local_aproximado` (migration 0033) preenche o ponto aproximado.
// Só contas com profiles.exemplo = true. Idempotente (upsert por user_id).
//
// Uso: node scripts/enderecos-exemplo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// [nome, endereço, lat, lng] — a Marina mantém o ponto que já tinha (Ingá).
const LOCAIS = [
  ["Marina Costa", "Rua Tiradentes, Ingá — Niterói/RJ (endereço de exemplo)", -22.9035, -43.1197],
  ["Ana Beatriz Lima", "Rua Moreira César, Icaraí — Niterói/RJ (endereço de exemplo)", -22.9048, -43.1086],
  ["Ricardo Souza", "Rua Mário Viana, Santa Rosa — Niterói/RJ (endereço de exemplo)", -22.9003, -43.1003],
  ["Lúcia Andrade", "Estrada Leopoldo Fróes, São Francisco — Niterói/RJ (endereço de exemplo)", -22.9179, -43.0934],
  ["Carlos Mendes", "Alameda São Boaventura, Fonseca — Niterói/RJ (endereço de exemplo)", -22.8838, -43.0947],
  ["Roberto Almeida", "Rua da Conceição, Centro — Niterói/RJ (endereço de exemplo)", -22.8948, -43.1245],
  ["Marcelo Lopes", "Av. Ernani do Amaral Peixoto, Centro — Niterói/RJ (endereço de exemplo)", -22.8963, -43.1206],
  ["Patrícia Souza", "Rua Dr. Alfredo Backer, Alcântara — São Gonçalo/RJ (endereço de exemplo)", -22.8193, -42.9998],
  ["Fernanda Ribeiro", "Rua Álvares de Castro, Centro — Maricá/RJ (endereço de exemplo)", -22.9194, -42.8186],
];

let feitos = 0;
for (const [nome, endereco, lat, lng] of LOCAIS) {
  const { data: p } = await sb.from("profiles").select("user_id").eq("nome", nome).eq("exemplo", true).maybeSingle();
  if (!p) {
    console.log(`(sem conta de exemplo "${nome}" — pulado)`);
    continue;
  }
  const { error } = await sb.from("profile_local").upsert({ user_id: p.user_id, endereco, lat, lng }, { onConflict: "user_id" });
  if (error) throw error;
  feitos++;
}
console.log(`Endereços de exemplo gravados: ${feitos}.`);
