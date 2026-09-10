import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Confere um cabeçalho `Authorization: Bearer <segredo>` em tempo constante —
 * usada pela rota do agendador (R-52) pra não vazar, pelo tempo de resposta,
 * quantos caracteres do segredo o pedido acertou.
 *
 * `timingSafeEqual` lança se os dois buffers tiverem tamanhos diferentes, e
 * um `if (tamanho diferente) return false` antes dela vazaria o tamanho pelo
 * atalho. Por isso comparamos o hash de cada lado (tamanho fixo, sempre 32
 * bytes) em vez do valor bruto: `timingSafeEqual` é chamada sempre, nunca por
 * atalho. Sem `segredo` configurado (`undefined` ou vazio), nunca passa.
 */
export function segredoConfere(
  cabecalho: string | null | undefined,
  segredo: string | undefined,
): boolean {
  if (!segredo) return false;
  const recebido = createHash("sha256").update(cabecalho ?? "").digest();
  const esperado = createHash("sha256").update(`Bearer ${segredo}`).digest();
  return timingSafeEqual(recebido, esperado);
}
