/**
 * Período preferido da visita (migration 0050): a agenda aberta do prestador é
 * uma janela (ex.: 09:00–18:00), e o cliente diz quando prefere ser atendido
 * dentro dela. Os limites são os do dia a dia de obra: manhã até o meio-dia,
 * tarde até as 18h, noite depois disso.
 */

export type PeriodoPreferido = "manha" | "tarde" | "noite" | "qualquer";

export const PERIODOS: readonly { slug: Exclude<PeriodoPreferido, "qualquer">; nome: string; inicio: string; fim: string }[] = [
  { slug: "manha", nome: "Manhã", inicio: "00:00", fim: "12:00" },
  { slug: "tarde", nome: "Tarde", inicio: "12:00", fim: "18:00" },
  { slug: "noite", nome: "Noite", inicio: "18:00", fim: "24:00" },
];

/** Rótulo curto para mostrar ao prestador ("Prefere: manhã"); `qualquer` não tem rótulo. */
export function rotuloPeriodo(p: string | null | undefined): string | null {
  if (!p || p === "qualquer") return null;
  return PERIODOS.find((x) => x.slug === p)?.nome.toLowerCase() ?? null;
}

/** "HH:MM" ou "HH:MM:SS" → "HH:MM" (o banco devolve time com segundos). */
function hhmm(h: string): string {
  return h.slice(0, 5);
}

/** Períodos que a janela `inicio`–`fim` cobre de verdade (interseção com duração). */
export function periodosDaJanela(inicio: string, fim: string): Exclude<PeriodoPreferido, "qualquer">[] {
  const i = hhmm(inicio);
  const f = hhmm(fim);
  return PERIODOS.filter((p) => i < p.fim && f > p.inicio).map((p) => p.slug);
}

/** Valida o que veio do formulário; qualquer coisa fora da lista vira `qualquer`. */
export function periodoValido(v: unknown): PeriodoPreferido {
  return v === "manha" || v === "tarde" || v === "noite" ? v : "qualquer";
}
