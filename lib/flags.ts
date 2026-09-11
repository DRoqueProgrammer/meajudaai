/**
 * Regra da bandeirinha de "Suspeita de Pilantragem" (migrations 0054/0055,
 * pedido do Leonardo em 10/09/2026): até 5 sinalizações aprovadas, uma
 * bandeirinha vermelha por sinalização; de 6 em diante, UMA bandeira só, com
 * o número ("6×", "12×"...). Pura — sem banco nem sessão — para dar pra
 * testar sem servidor; `components/flags-pessoa.tsx` é quem desenha.
 */

export interface Bandeirinhas {
  /** Quantos ícones de bandeira desenhar (0 a 5, nunca mais). */
  icones: number;
  /** Rótulo do contador ("6×", "12×"...) quando passa de 5; senão, `null`. */
  contador: string | null;
}

const LIMITE_ICONES = 5;

export function bandeirinhas(n: number): Bandeirinhas {
  if (n <= 0) return { icones: 0, contador: null };
  if (n <= LIMITE_ICONES) return { icones: n, contador: null };
  return { icones: 1, contador: `${n}×` };
}
