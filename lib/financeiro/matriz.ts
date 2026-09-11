/**
 * A grade do Financeiro (D-048, molde da `ManagementGrid` do amazing-school):
 * linhas = pessoas (clientes, no Financeiro do prestador; prestadores, no do
 * Administrador), colunas = os 12 meses do ano, e em cada célula os itens
 * daquele mês — um por serviço. Pura (sem banco nem sessão): as duas telas
 * montam os itens e esta função organiza, soma em centavos e decide a cor.
 */

/** ok = recebido / OK dado; pendente = a receber; informado = o prestador disse que pagou (comissão). */
export type EstadoItem = "ok" | "pendente" | "informado";

export interface ItemMatriz {
  /** Id do que o ✓/✗ alterna: o serviço (prestador) ou a comissão (Administrador). */
  id: string;
  /** Data do serviço, AAAA-MM-DD — decide o mês da célula. */
  data: string;
  /** Linha principal do card (ex.: "Instalação elétrica"). */
  titulo: string;
  /** Linha de apoio (ex.: "Marina Costa · 8% de R$ 170,00"). */
  detalhe?: string | null;
  /** O dinheiro da célula: valor do serviço (prestador) ou comissão (Administrador). */
  valor: number;
  estado: EstadoItem;
  /** Link do recibo deste item, quando existe. */
  reciboHref?: string | null;
  /** Link da página do serviço (abre em nova aba a partir do card do mês). */
  servicoHref?: string | null;
}

export interface ItemDaPessoa extends ItemMatriz {
  pessoaId: string;
  pessoaNome: string;
  pessoaFotoUrl?: string | null;
}

export interface LinhaMatriz {
  pessoaId: string;
  nome: string;
  fotoUrl: string | null;
  /** Itens por mês: chave "01".."12". */
  meses: Record<string, ItemMatriz[]>;
}

/** vazia · ok (tudo recebido) · pendente · parcial (parte recebida) · informada (aguarda OK) · atrasada. */
export type EstadoCelula = "vazia" | "ok" | "pendente" | "parcial" | "informada" | "atrasada";

/** Situação escolhida no filtro. */
export type FiltroSituacao = "" | "ok" | "pendente" | "atrasada";

/** Dias sem receber a partir dos quais "a receber" vira "em atraso" (mesma régua da comissão, D-044). */
export const DIAS_EM_ATRASO = 7;

export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;
export const CHAVES_MESES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;

const centavos = (v: number) => Math.round(v * 100);

/** Organiza os itens em linhas (uma por pessoa, em ordem alfabética) só com os meses do `ano`. */
export function montarMatriz(itens: readonly ItemDaPessoa[], ano: number): LinhaMatriz[] {
  const prefixo = `${ano}-`;
  const linhas = new Map<string, LinhaMatriz>();
  for (const i of itens) {
    if (!i.data.startsWith(prefixo)) continue;
    const linha = linhas.get(i.pessoaId) ?? { pessoaId: i.pessoaId, nome: i.pessoaNome, fotoUrl: i.pessoaFotoUrl ?? null, meses: {} };
    const mes = i.data.slice(5, 7);
    const { pessoaId: _p, pessoaNome: _n, pessoaFotoUrl: _f, ...item } = i;
    (linha.meses[mes] ??= []).push(item);
    linhas.set(i.pessoaId, linha);
  }
  for (const l of linhas.values()) {
    for (const k of Object.keys(l.meses)) l.meses[k]!.sort((a, b) => a.data.localeCompare(b.data));
  }
  return [...linhas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** `true` se o item está a receber há `DIAS_EM_ATRASO` dias ou mais (contados da data do serviço). */
export function itemAtrasado(item: Pick<ItemMatriz, "estado" | "data">, hoje: string): boolean {
  if (item.estado === "ok") return false;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${item.data}T12:00:00Z`)) / 86_400_000;
  return item.estado === "pendente" && dias >= DIAS_EM_ATRASO;
}

/** A cor da célula: atraso vence tudo; depois informada, parcial, pendente, ok. */
export function estadoDaCelula(itens: readonly ItemMatriz[] | undefined, hoje: string): EstadoCelula {
  if (!itens || itens.length === 0) return "vazia";
  if (itens.some((i) => itemAtrasado(i, hoje))) return "atrasada";
  const ok = itens.filter((i) => i.estado === "ok").length;
  if (ok === itens.length) return "ok";
  if (itens.some((i) => i.estado === "informado")) return "informada";
  return ok > 0 ? "parcial" : "pendente";
}

export interface TotaisCelula {
  total: number;
  recebido: number;
  aReceber: number;
}

/** Totais de uma lista de itens, somados em centavos. */
export function totais(itens: readonly ItemMatriz[] | undefined): TotaisCelula {
  let t = 0;
  let ok = 0;
  for (const i of itens ?? []) {
    t += centavos(i.valor);
    if (i.estado === "ok") ok += centavos(i.valor);
  }
  return { total: t / 100, recebido: ok / 100, aReceber: (t - ok) / 100 };
}

/** Totais de uma linha inteira (o ano da pessoa). */
export function totaisDaLinha(linha: LinhaMatriz): TotaisCelula {
  return totais(Object.values(linha.meses).flat());
}

/** Totais de uma coluna (o mês, somando todas as pessoas). */
export function totaisDoMes(linhas: readonly LinhaMatriz[], mes: string): TotaisCelula {
  return totais(linhas.flatMap((l) => l.meses[mes] ?? []));
}

/**
 * Filtro da grade: por nome (sem acento, sem caixa) e por situação — a linha
 * fica se TEM algum item na situação pedida no ano; com situação, os itens
 * que não se encaixam somem das células (o total mostrado é o do filtro).
 */
export function filtrarMatriz(
  linhas: readonly LinhaMatriz[],
  filtro: { busca?: string; situacao?: FiltroSituacao },
  hoje: string,
): LinhaMatriz[] {
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const busca = norm((filtro.busca ?? "").trim());
  const passa = (i: ItemMatriz): boolean => {
    switch (filtro.situacao) {
      case "ok":
        return i.estado === "ok";
      case "pendente":
        return i.estado !== "ok";
      case "atrasada":
        return itemAtrasado(i, hoje);
      default:
        return true;
    }
  };
  const out: LinhaMatriz[] = [];
  for (const l of linhas) {
    if (busca && !norm(l.nome).includes(busca)) continue;
    if (!filtro.situacao) {
      out.push(l);
      continue;
    }
    const meses: Record<string, ItemMatriz[]> = {};
    for (const [k, itens] of Object.entries(l.meses)) {
      const f = itens.filter(passa);
      if (f.length) meses[k] = f;
    }
    if (Object.keys(meses).length) out.push({ ...l, meses });
  }
  return out;
}

/** Anos com algum item, do mais recente ao mais antigo, sempre incluindo o ano corrente. */
export function anosDisponiveis(datas: readonly string[], anoCorrente: number): number[] {
  const s = new Set<number>([anoCorrente]);
  for (const d of datas) {
    const a = Number(d.slice(0, 4));
    if (Number.isInteger(a) && a > 2000) s.add(a);
  }
  return [...s].sort((a, b) => b - a);
}

/** Lê o ano da URL (`?ano=`), caindo no corrente quando vem inválido. */
export function lerAno(valor: string | undefined, anoCorrente: number): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 2000 && n <= anoCorrente + 1 ? n : anoCorrente;
}

/** Lê a situação da URL, só os valores conhecidos. */
export function lerSituacao(valor: string | undefined): FiltroSituacao {
  return valor === "ok" || valor === "pendente" || valor === "atrasada" ? valor : "";
}
