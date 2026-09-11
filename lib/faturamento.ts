/**
 * Agrupamento puro do faturamento do prestador — separado do componente
 * (`components/dashboard/grafico-faturamento.tsx`) pra ser testável sem DOM
 * (ver gabarito `tests/faturamento/agrupar.test.ts`, escrito pelo controller
 * antes desta implementação). Decisão do Leonardo em 10/09/2026: o gráfico é
 * empilhado por tipo de serviço, com filtro de período (padrão 15 dias) e de
 * agrupamento (padrão semana), e um card no hover com o total por tipo — em
 * ordem alfabética — e por dia.
 *
 * Datas são strings `YYYY-MM-DD` o tempo todo — nunca um `Date` local — porque
 * o dia do serviço é o dia calendário em que ele aconteceu, não um instante
 * com fuso. Comparação lexicográfica de strings ISO já dá a ordem cronológica
 * certa; as poucas contas de calendário (dia seguinte, início da semana,
 * início/fim do mês) usam `Date.UTC` só como calculadora de dias, sem nunca
 * ler `getHours`/fuso local de volta.
 */

/** Um serviço realizado, já com o valor e o tipo — a unidade que o gráfico soma e empilha. */
export interface ServicoFaturado {
  /** Data do horário (`agenda_slots.data`), não a de criação do registro. */
  data: string;
  valor: number;
  /** `tipos_servico.slug` (migration 0047). */
  tipo: string;
  clienteId: string;
}

/** `15d`/`30d`/`60d`/`90d` = hoje e os N-1 dias anteriores. `ytd` = 1º de janeiro até hoje. `12m` = últimos 365 dias. */
export type PeriodoFaturamento = "15d" | "30d" | "60d" | "90d" | "ytd" | "12m";

export type AgrupamentoFaturamento = "dia" | "semana" | "mes";

export interface BarraFaturamento {
  /** Início da barra, já cortado pela janela do período. */
  inicio: string;
  /** Fim da barra, já cortado pela janela do período. */
  fim: string;
  /** Rótulo curto pro eixo (ex.: "10/09", "set"). */
  rotulo: string;
  total: number;
  /** Só os tipos com algum serviço nesta barra (soma > 0). Chave = `tipos_servico.slug`. */
  porTipo: Record<string, number>;
  /** Só os dias com faturamento > 0 nesta barra, em ordem de data. */
  porDia: { data: string; total: number }[];
}

export interface FaturamentoAgrupado {
  inicio: string;
  fim: string;
  total: number;
  numServicos: number;
  numClientes: number;
  barras: BarraFaturamento[];
}

const UM_DIA_MS = 86_400_000;
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function paraDiaNumero(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y!, (m ?? 1) - 1, d) / UM_DIA_MS);
}

function deDiaNumero(n: number): string {
  return new Date(n * UM_DIA_MS).toISOString().slice(0, 10);
}

function somarDias(iso: string, delta: number): string {
  return deDiaNumero(paraDiaNumero(iso) + delta);
}

/** Segunda-feira da semana que contém `iso` (semana começa na segunda, não no domingo). */
function segundaDaSemana(iso: string): string {
  const diaSemana = new Date(paraDiaNumero(iso) * UM_DIA_MS).getUTCDay(); // 0=dom..6=sáb
  const distanciaDaSegunda = (diaSemana + 6) % 7; // seg=0 .. dom=6
  return somarDias(iso, -distanciaDaSegunda);
}

function primeiroDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Primeiro dia do mês `delta` meses depois de `iso` (que já precisa ser dia 1). */
function somarMeses(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map(Number);
  const total = y! * 12 + (m! - 1) + delta;
  const ano = Math.floor(total / 12);
  const mes = total - ano * 12 + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

function ultimoDoMes(iso: string): string {
  return somarDias(somarMeses(primeiroDoMes(iso), 1), -1);
}

const maiorISO = (a: string, b: string) => (a > b ? a : b);
const menorISO = (a: string, b: string) => (a < b ? a : b);

/** `dd/mm` sem depender de `Date`/locale — a data já vem como string ISO. */
function rotuloDiaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Fronteiras de cada barra (já cortadas pela janela [inicio, fim]) com o rótulo curto de eixo. */
function gerarBarrasVazias(
  inicio: string,
  fim: string,
  agrupamento: AgrupamentoFaturamento,
): { inicio: string; fim: string; rotulo: string }[] {
  const barras: { inicio: string; fim: string; rotulo: string }[] = [];

  if (agrupamento === "dia") {
    for (let cursor = inicio; cursor <= fim; cursor = somarDias(cursor, 1)) {
      barras.push({ inicio: cursor, fim: cursor, rotulo: rotuloDiaMes(cursor) });
    }
    return barras;
  }

  if (agrupamento === "semana") {
    for (let semana = segundaDaSemana(inicio); semana <= fim; semana = somarDias(semana, 7)) {
      const fimDaSemana = somarDias(semana, 6);
      const bInicio = maiorISO(semana, inicio);
      const bFim = menorISO(fimDaSemana, fim);
      barras.push({ inicio: bInicio, fim: bFim, rotulo: rotuloDiaMes(bInicio) });
    }
    return barras;
  }

  // "mes"
  for (let mes = primeiroDoMes(inicio); mes <= fim; mes = somarMeses(mes, 1)) {
    const fimDoMes = ultimoDoMes(mes);
    const bInicio = maiorISO(mes, inicio);
    const bFim = menorISO(fimDoMes, fim);
    barras.push({ inicio: bInicio, fim: bFim, rotulo: MESES_ABREV[Number(mes.slice(5, 7)) - 1]! });
  }
  return barras;
}

function construirBarra(
  servicosDaJanela: ServicoFaturado[],
  inicio: string,
  fim: string,
  rotulo: string,
): BarraFaturamento {
  const doPeriodo = servicosDaJanela.filter((s) => s.data >= inicio && s.data <= fim);
  const total = doPeriodo.reduce((acc, s) => acc + s.valor, 0);

  const porTipo: Record<string, number> = {};
  for (const s of doPeriodo) porTipo[s.tipo] = (porTipo[s.tipo] ?? 0) + s.valor;

  const porDiaMapa = new Map<string, number>();
  for (const s of doPeriodo) porDiaMapa.set(s.data, (porDiaMapa.get(s.data) ?? 0) + s.valor);
  const porDia = [...porDiaMapa.entries()]
    .filter(([, valor]) => valor > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, total]) => ({ data, total }));

  return { inicio, fim, rotulo, total, porTipo, porDia };
}

/**
 * Agrupa o faturamento (serviços já filtrados como "realizado" pelo chamador)
 * numa janela de tempo, em barras por dia/semana/mês — a base do gráfico
 * empilhado. Regras (gabarito `tests/faturamento/agrupar.test.ts`):
 *
 * - Janela de N dias = `hoje` e os N-1 dias anteriores (inclusive nas duas
 *   pontas). "Este ano" começa em 1º de janeiro; "último ano" são os últimos
 *   365 dias.
 * - Toda barra da janela existe, mesmo com total zero — semana/mês nunca
 *   "somem" do eixo por falta de serviço.
 * - Semana começa na segunda; a primeira e a última barra do período são
 *   cortadas pela janela (uma semana ou mês que atravessa a borda do período
 *   aparece só com a fração que cai dentro dele).
 * - `porTipo` e `porDia` de cada barra só contam o que está dentro do corte
 *   daquela barra — não da semana/mês "cheio" antes do corte.
 */
export function agruparFaturamento(
  servicos: ServicoFaturado[],
  opts: { periodo: PeriodoFaturamento; agrupamento: AgrupamentoFaturamento; hoje: string },
): FaturamentoAgrupado {
  const { periodo, agrupamento, hoje } = opts;
  const fim = hoje;
  const inicio =
    periodo === "ytd" ? `${hoje.slice(0, 4)}-01-01` : somarDias(hoje, -((periodo === "12m" ? 365 : Number(periodo.slice(0, -1))) - 1));

  const daJanela = servicos.filter((s) => s.data >= inicio && s.data <= fim);
  const total = daJanela.reduce((acc, s) => acc + s.valor, 0);
  const numServicos = daJanela.length;
  const numClientes = new Set(daJanela.map((s) => s.clienteId)).size;

  const barras = gerarBarrasVazias(inicio, fim, agrupamento).map((b) => construirBarra(daJanela, b.inicio, b.fim, b.rotulo));

  return { inicio, fim, total, numServicos, numClientes, barras };
}
