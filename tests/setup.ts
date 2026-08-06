import { readFileSync } from "node:fs";

/**
 * Carrega as CREDENCIAIS do .env.local para os testes de integração (RLS).
 *
 * `RUN_INTEGRATION` fica de fora de propósito. Ele morava no .env.local e era
 * copiado junto com o resto, então o "opt-in" não gateava nada: todo
 * `npm test` batia no Supabase real e criava usuários de verdade.
 *
 * A regra agora: o .env.local diz COMO conectar; quem decide SE conecta é a
 * invocação (`npm run test:integration`).
 */
const SO_DA_INVOCACAO = new Set(["RUN_INTEGRATION"]);

try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || !m[1]) continue;
    if (SO_DA_INVOCACAO.has(m[1])) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // sem .env.local — testes de integração serão pulados
}
