/**
 * Dois eixos de data, de propósito separados:
 * - `Periodo` olha para trás (fechamento de mês em Financeiro/Relatórios).
 * - `Quando` olha para frente — é a pergunta que o ajudante faz de verdade:
 *   "tem serviço pra amanhã?". Buscar vaga por "este mês" não ajuda ninguém.
 */
export type Periodo = "mes" | "3meses" | "ano" | "tudo";

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "mes", label: "Este mês" },
  { value: "3meses", label: "3 meses" },
  { value: "ano", label: "Este ano" },
  { value: "tudo", label: "Tudo" },
];

export function isPeriodo(v: string | undefined): v is Periodo {
  return v === "mes" || v === "3meses" || v === "ano" || v === "tudo";
}

/**
 * O dia do serviço já chegou? Decide quando "Avaliar" e "Concluir" aparecem —
 * antes disso a nota sairia de um trabalho que ainda não aconteceu.
 * Sem data (vagas antigas do seed), libera: não há o que esperar.
 * Usa data local, nunca toISOString(): em BRT à noite o UTC já virou o dia seguinte.
 */
export function jaPassou(dataServico: string | null, hoje = new Date()): boolean {
  if (!dataServico) return true;
  return dataServico <= hoje.toLocaleDateString("sv-SE");
}

export type Quando = "hoje" | "amanha" | "semana";

export const QUANDOS: { value: Quando; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "semana", label: "Esta semana" },
];

export function isQuando(v: string | undefined): v is Quando {
  return v === "hoje" || v === "amanha" || v === "semana";
}

/**
 * Intervalo inclusivo [desde, ate] para a busca de vagas. "Esta semana" são os
 * próximos 7 dias a partir de hoje, não a semana do calendário: quem procura
 * diária na sexta quer saber do sábado, não que a semana acabou.
 */
export function rangeDoQuando(
  quando: Quando,
  hoje = new Date(),
): { desde: string; ate: string } {
  const dia = (offset: number) =>
    ymd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offset));
  if (quando === "hoje") return { desde: dia(0), ate: dia(0) };
  if (quando === "amanha") return { desde: dia(1), ate: dia(1) };
  return { desde: dia(0), ate: dia(7) };
}

/** Data local em YYYY-MM-DD (sem shift de fuso do toISOString). */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Intervalo inclusivo [desde, ate] para o período, com base na data de hoje.
 * "tudo" retorna null/null (sem filtro).
 */
export function rangeDoPeriodo(
  periodo: Periodo,
  hoje = new Date(),
): { desde: string | null; ate: string | null } {
  const y = hoje.getFullYear();
  const m = hoje.getMonth(); // 0-11
  if (periodo === "mes") {
    return { desde: ymd(new Date(y, m, 1)), ate: ymd(new Date(y, m + 1, 0)) };
  }
  if (periodo === "3meses") {
    return { desde: ymd(new Date(y, m - 2, 1)), ate: ymd(new Date(y, m + 1, 0)) };
  }
  if (periodo === "ano") {
    return { desde: ymd(new Date(y, 0, 1)), ate: ymd(new Date(y, 11, 31)) };
  }
  return { desde: null, ate: null };
}
