/**
 * Datas no fuso do produto (America/Sao_Paulo) — Fatia 4, vistoria de 10/09/2026.
 *
 * O servidor na Vercel roda em UTC: `new Date().toLocaleDateString("sv-SE")`
 * lá devolve o dia de Greenwich, e das 21h às 24h de Brasília o "hoje" do app
 * virava amanhã (agenda, faturamento, horários do dia). Estas funções fixam o
 * fuso, no servidor e no navegador.
 */

export const FUSO = "America/Sao_Paulo";

const formatoData = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const formatoHora = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false });

/** Data (YYYY-MM-DD) de um instante, no fuso de São Paulo. */
export function dataEmSaoPaulo(instante: Date = new Date()): string {
  return formatoData.format(instante);
}

/** Hoje (YYYY-MM-DD) em São Paulo. */
export function hojeEmSaoPaulo(): string {
  return dataEmSaoPaulo(new Date());
}

/** Hora (HH:MM, 24h) de um instante, no fuso de São Paulo. */
export function horaEmSaoPaulo(instante: Date = new Date()): string {
  return formatoHora.format(instante);
}

/** Soma dias a uma data YYYY-MM-DD (aritmética de calendário, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

/** Dia da semana de uma data YYYY-MM-DD (0 = domingo … 6 = sábado), sem depender do fuso da máquina. */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}
