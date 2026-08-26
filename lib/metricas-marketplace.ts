/**
 * Métricas de saúde do marketplace, calculadas a partir de linhas cruas de
 * `vagas` e `candidaturas`. São funções PURAS (sem I/O) para o parecer poder
 * cobrar rigor quantitativo com teste unitário — a página só liga o banco.
 *
 * O "tempo de match" é aproximado pela candidatura ACEITA mais antiga de cada
 * vaga: o schema não guarda o instante do aceite, só o da candidatura. É um
 * piso honesto (a pessoa se candidatou antes de ser aceita), rotulado como tal
 * na tela. O dia em que existir `aceito_em`, troca-se a fonte sem mexer na UI.
 */

export interface VagaRow {
  id: string;
  status: string; // aberta | em_andamento | finalizada | cancelada
  categoria: string;
  cidade: string;
  created_at: string; // ISO
}

export interface CandRow {
  vaga_id: string;
  status: string; // aguardando | aceito | recusado | cancelado
  created_at: string; // ISO
}

export interface ResumoMarketplace {
  totalVagas: number;
  preenchidas: number;
  canceladas: number;
  taxaPreenchimento: number; // 0..1
  taxaCancelamento: number; // 0..1
  tempoMedioMatchHoras: number | null; // null quando ninguém foi aceito ainda
}

export interface GrupoMetrica {
  chave: string;
  total: number;
  preenchidas: number;
  taxaPreenchimento: number; // 0..1
}

/** Mapa vaga_id → candidatura aceita mais antiga (proxy do instante do match). */
function aceitaMaisAntigaPorVaga(cands: CandRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cands) {
    if (c.status !== "aceito") continue;
    const atual = m.get(c.vaga_id);
    if (!atual || c.created_at < atual) m.set(c.vaga_id, c.created_at);
  }
  return m;
}

/** KPIs agregados de todo o marketplace. */
export function resumoMarketplace(vagas: VagaRow[], cands: CandRow[]): ResumoMarketplace {
  const aceitas = aceitaMaisAntigaPorVaga(cands);
  let preenchidas = 0;
  let canceladas = 0;
  let somaHoras = 0;
  let comMatch = 0;

  for (const v of vagas) {
    if (v.status === "cancelada") canceladas += 1;
    const aceitaEm = aceitas.get(v.id);
    if (aceitaEm) {
      preenchidas += 1;
      const horas = (Date.parse(aceitaEm) - Date.parse(v.created_at)) / 3_600_000;
      // Ignora relógios trocados (aceite "antes" da criação) para não puxar a média.
      if (Number.isFinite(horas) && horas >= 0) {
        somaHoras += horas;
        comMatch += 1;
      }
    }
  }

  const total = vagas.length;
  return {
    totalVagas: total,
    preenchidas,
    canceladas,
    taxaPreenchimento: total ? preenchidas / total : 0,
    taxaCancelamento: total ? canceladas / total : 0,
    tempoMedioMatchHoras: comMatch ? somaHoras / comMatch : null,
  };
}

/** Taxa de preenchimento quebrada por cidade ou categoria, ordenada por volume. */
export function porGrupo(
  vagas: VagaRow[],
  cands: CandRow[],
  campo: "cidade" | "categoria",
): GrupoMetrica[] {
  const aceitas = aceitaMaisAntigaPorVaga(cands);
  const grupos = new Map<string, { total: number; preenchidas: number }>();

  for (const v of vagas) {
    const chave = v[campo] || "—";
    const g = grupos.get(chave) ?? { total: 0, preenchidas: 0 };
    g.total += 1;
    if (aceitas.has(v.id)) g.preenchidas += 1;
    grupos.set(chave, g);
  }

  return [...grupos.entries()]
    .map(([chave, g]) => ({
      chave,
      total: g.total,
      preenchidas: g.preenchidas,
      taxaPreenchimento: g.total ? g.preenchidas / g.total : 0,
    }))
    .sort((a, b) => b.total - a.total || a.chave.localeCompare(b.chave));
}

/** Duração legível a partir de horas decimais: `< 1h → "Xmin"`, `< 24h → "Xh"`, senão `"Yd Zh"`. */
export function formatDuracaoHoras(horas: number | null): string {
  if (horas == null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)}min`;
  if (horas < 24) return `${Math.round(horas)}h`;
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas % 24);
  return resto ? `${dias}d ${resto}h` : `${dias}d`;
}

/** Fração 0..1 como percentual inteiro em PT-BR (`0.427 → "43%"`). */
export function pct(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}
