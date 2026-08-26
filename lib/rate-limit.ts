import "server-only";

/**
 * Rate limit em memória (janela fixa por chave), a primeira barreira barata
 * contra abuso nas server actions de escrita — um bot que candidata 10.000
 * vezes por segundo passava direto pelo Zod e pelo guard, deixando o Supabase
 * como única defesa.
 *
 * LIMITAÇÃO ASSUMIDA (protótipo): o `Map` é POR PROCESSO. Em serverless cada
 * instância tem o seu, então quem paraleliza entre instâncias dilui o limite.
 * É aceitável como piso — a versão definitiva (Postgres ou Upstash Redis, chave
 * compartilhada) está registrada como decisão em docs/adr. Ver ADR 0007.
 */
type Registro = { count: number; reset: number };
const baldes = new Map<string, Registro>();

// Teto de segurança: se o Map crescer demais (muitas chaves distintas), varre os
// expirados antes de inserir. Evita vazamento de memória num processo longo.
const MAX_CHAVES = 10_000;

function purgarExpirados(agora: number): void {
  for (const [chave, reg] of baldes) {
    if (agora > reg.reset) baldes.delete(chave);
  }
}

/**
 * Consome uma unidade da cota de `chave` (ex.: `"candidatar:<userId>"`).
 * Devolve `ok:false` quando estourou o `limite` dentro da `janelaMs`.
 */
export function rateLimit(
  chave: string,
  limite: number,
  janelaMs: number,
): { ok: boolean; restante: number; retryEmMs: number } {
  const agora = Date.now();
  if (baldes.size > MAX_CHAVES) purgarExpirados(agora);

  const reg = baldes.get(chave);
  if (!reg || agora > reg.reset) {
    baldes.set(chave, { count: 1, reset: agora + janelaMs });
    return { ok: true, restante: limite - 1, retryEmMs: 0 };
  }
  if (reg.count >= limite) {
    return { ok: false, restante: 0, retryEmMs: reg.reset - agora };
  }
  reg.count += 1;
  return { ok: true, restante: limite - reg.count, retryEmMs: 0 };
}
