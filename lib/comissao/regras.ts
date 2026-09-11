/**
 * Regras puras da comissão da plataforma e dos recibos (migrations 0057/0058,
 * D-044/D-047) — sem banco nem sessão, para testar sem servidor. As telas do
 * Financeiro, do recibo mensal e da comissão do prestador usam estas contas.
 */

/** Dias sem pagar a partir dos quais o saldo em aberto aparece como atrasado (D-044: só destaca, nada automático). */
export const DIAS_PARA_ATRASO = 7;

/** Teto da alíquota (o banco confere o mesmo: 0 a 50%). */
export const ALIQUOTA_MAXIMA = 50;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** `true` se `mes` está no formato "AAAA-MM" (01 a 12). */
export function mesValido(mes: string | null | undefined): mes is string {
  return typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

/** "2026-09" → "setembro de 2026". */
export function mesPorExtenso(mes: string): string {
  if (!mesValido(mes)) return mes;
  return `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
}

/** Primeiro e último dia do mês ("2026-02" → 2026-02-01 a 2026-02-28), para filtrar datas "AAAA-MM-DD". */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

/** Mês anterior a "AAAA-MM" ("2026-01" → "2025-12"). */
export function mesAnterior(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, "0")}`;
}

/** Número do recibo mensal, estável para o mesmo prestador e mês: "CM-202609-AB12CD34". */
export function numeroDoReciboMensal(prestadorId: string, mes: string): string {
  return `CM-${mes.replace("-", "")}-${prestadorId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Número da nota avulsa com zeros à esquerda: 42 → "000042". */
export function numeroDaNotaAvulsa(numero: number): string {
  return String(numero).padStart(6, "0");
}

/**
 * Alíquota digitada pelo Administrador ("8", "7,5", "10.25") → número com 2
 * casas, ou `null` se inválida (vazio, negativa, acima de 50%).
 */
export function lerPercentual(valor: string | number | null | undefined): number | null {
  if (valor == null) return null;
  const texto = String(valor).trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(texto)) return null;
  const n = Number(texto);
  if (!Number.isFinite(n) || n < 0 || n > ALIQUOTA_MAXIMA) return null;
  return Math.round(n * 100) / 100;
}

/** Valor em reais digitado ("6,99", "1.250,50", "49.9") → número com 2 casas, ou `null` se inválido ou ≤ 0. */
export function lerValorEmReais(valor: string | number | null | undefined): number | null {
  if (valor == null) return null;
  let texto = String(valor).trim().replace(/^R\$\s*/, "");
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const n = Math.round(Number(texto) * 100) / 100;
  return n > 0 ? n : null;
}

/** Comissão de um serviço: base × percentual, arredondada em centavos (espelha o gatilho do banco). */
export function valorDaComissao(base: number, percentual: number): number {
  return Math.round(base * percentual) / 100;
}

export interface LinhaDoRecibo {
  /** Valor do serviço sobre o qual incidiu a comissão. */
  base: number;
  /** Alíquota congelada (%). */
  percentual: number;
  /** Comissão lançada. */
  valor: number;
  /** em_aberto · informada · paga. */
  status: string;
}

export interface ResumoDoRecibo {
  quantidade: number;
  /** Soma do valor dos serviços. */
  totalServicos: number;
  /** Soma das comissões. */
  totalComissao: number;
  /** Taxa média ponderada pelo valor: totalComissao / totalServicos, em %, 2 casas. */
  taxaMedia: number;
  /** Comissão já confirmada (Pix recebido pelo Administrador). */
  confirmado: number;
  /** O que falta receber (em aberto ou informada, aguardando confirmação). */
  pendente: number;
}

const centavos = (n: number) => Math.round(n * 100);

/** Totais do recibo mensal — soma em centavos para não acumular erro de ponto flutuante. */
export function resumoDoRecibo(linhas: readonly LinhaDoRecibo[]): ResumoDoRecibo {
  let servicos = 0;
  let comissao = 0;
  let confirmado = 0;
  for (const l of linhas) {
    servicos += centavos(l.base);
    comissao += centavos(l.valor);
    if (l.status === "paga") confirmado += centavos(l.valor);
  }
  return {
    quantidade: linhas.length,
    totalServicos: servicos / 100,
    totalComissao: comissao / 100,
    taxaMedia: servicos > 0 ? Math.round((comissao / servicos) * 10000) / 100 : 0,
    confirmado: confirmado / 100,
    pendente: (comissao - confirmado) / 100,
  };
}

/** Dias inteiros entre `desde` (ISO) e `hoje` (ISO ou Date), nunca negativo. */
export function diasDesde(desde: string, hoje: string | Date = new Date()): number {
  const a = new Date(desde).getTime();
  const b = (hoje instanceof Date ? hoje : new Date(hoje)).getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

/** `true` se o saldo em aberto mais antigo passou de `DIAS_PARA_ATRASO` dias. */
export function estaAtrasado(maisAntigoEmAberto: string | null, hoje: string | Date = new Date()): boolean {
  return maisAntigoEmAberto != null && diasDesde(maisAntigoEmAberto, hoje) >= DIAS_PARA_ATRASO;
}

// Valor por extenso (pt-BR), para o recibo ter valor de quitação. Portado de
// refs/careconnect/lib/valor-extenso.ts, com o "e" só onde o português pede
// ("mil duzentos e cinquenta", mas "mil e cem", "mil e cinquenta").
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ateMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CEM[c]!);
  if (r) partes.push(r < 20 ? UNI[r]! : r % 10 ? `${DEZ[Math.floor(r / 10)]} e ${UNI[r % 10]}` : DEZ[r / 10]!);
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const grupos = [
    { valor: 1_000_000_000, um: "um bilhão", muitos: "bilhões" },
    { valor: 1_000_000, um: "um milhão", muitos: "milhões" },
    { valor: 1_000, um: "mil", muitos: "mil" },
  ];
  const partes: string[] = [];
  let resto = n;
  for (const g of grupos) {
    const q = Math.floor(resto / g.valor);
    if (q > 0) {
      partes.push(q === 1 ? g.um : `${ateMil(q)} ${g.muitos}`);
      resto %= g.valor;
    }
  }
  if (resto > 0) {
    // "e" antes do último grupo quando ele é menor que cem ou uma centena redonda.
    const liga = partes.length > 0 && (resto < 100 || resto % 100 === 0) ? "e " : "";
    partes.push(`${liga}${ateMil(resto)}`);
  }
  return partes.join(" ");
}

/** 1250.5 → "mil duzentos e cinquenta reais e cinquenta centavos"; 1000000 → "um milhão de reais". */
export function valorPorExtenso(reais: number): string {
  const total = Math.round(Math.abs(reais) * 100);
  const inteiro = Math.floor(total / 100);
  const cent = total % 100;
  const partes: string[] = [];
  if (inteiro > 0) {
    const redondoEmMilhao = inteiro >= 1_000_000 && inteiro % 1_000_000 === 0;
    partes.push(`${inteiroPorExtenso(inteiro)}${redondoEmMilhao ? " de" : ""} ${inteiro === 1 ? "real" : "reais"}`);
  }
  if (cent > 0) partes.push(`${partes.length ? "e " : ""}${inteiroPorExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" ") : "zero real";
}
