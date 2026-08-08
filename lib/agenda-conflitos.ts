/**
 * Regra de conflito da agenda (função pura, testável). Sem `hora_fim` na vaga,
 * o conflito é por dia: um dia entra em conflito se tem 2+ diárias aceitas OU
 * se tem uma diária caindo num dia que o ajudante marcou como indisponível.
 */
export function diasEmConflito(
  diarias: { data: string | null }[],
  blocos: string[],
): Set<string> {
  const porDia = new Map<string, number>();
  for (const d of diarias) {
    if (!d.data) continue;
    porDia.set(d.data, (porDia.get(d.data) ?? 0) + 1);
  }
  const bloco = new Set(blocos);
  const conflito = new Set<string>();
  for (const [dia, n] of porDia) {
    if (n >= 2) conflito.add(dia);
    if (bloco.has(dia)) conflito.add(dia);
  }
  return conflito;
}
