export interface DemandaRow {
  categoria: string;
  cidade: string;
}

export interface DemandaAgregada {
  categoria: string;
  cidade: string;
  total: number;
}

/** Conta linhas por (categoria, cidade) e ordena da maior demanda para a menor. */
export function agregarDemanda(rows: DemandaRow[]): DemandaAgregada[] {
  const m = new Map<string, DemandaAgregada>();
  for (const r of rows) {
    const k = `${r.categoria} ${r.cidade}`;
    const cur = m.get(k);
    if (cur) cur.total += 1;
    else m.set(k, { categoria: r.categoria, cidade: r.cidade, total: 1 });
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
