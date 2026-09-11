/**
 * Qual serviço "é" o de um horário. Desde a migration 0048, um horário pode ter
 * mais de um serviço: os cancelados (que não seguram mais o horário) e, no
 * máximo, um que o ocupa (pendente, confirmado ou realizado — índice único
 * parcial). A tela mostra o que ocupa; sem nenhum, o cancelado mais recente.
 */
export function servicoDoHorario<T extends { status: string; created_at?: string | null }>(servicos: readonly T[]): T | null {
  const ocupa = servicos.find((s) => s.status !== "cancelado");
  if (ocupa) return ocupa;
  let maisRecente: T | null = null;
  for (const s of servicos) {
    if (!maisRecente || (s.created_at ?? "") > (maisRecente.created_at ?? "")) maisRecente = s;
  }
  return maisRecente;
}

/** Agrupa serviços por horário e escolhe, para cada um, o de `servicoDoHorario`. */
export function servicosPorHorario<T extends { slot_id: string; status: string; created_at?: string | null }>(
  servicos: readonly T[],
): Map<string, T> {
  const grupos = new Map<string, T[]>();
  for (const s of servicos) {
    const lista = grupos.get(s.slot_id);
    if (lista) lista.push(s);
    else grupos.set(s.slot_id, [s]);
  }
  const saida = new Map<string, T>();
  for (const [slot, lista] of grupos) {
    const escolhido = servicoDoHorario(lista);
    if (escolhido) saida.set(slot, escolhido);
  }
  return saida;
}
