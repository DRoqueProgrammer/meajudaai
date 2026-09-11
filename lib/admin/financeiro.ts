import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { intervaloDoMes, resumoDoRecibo, type ResumoDoRecibo } from "@/lib/comissao/regras";

/**
 * Leituras do Financeiro da praça e dos recibos (migrations 0057/0058,
 * D-044/D-047), pela chave de serviço. TODA função recebe a praça (ou o
 * prestador) já autorizada por quem chama — a página confere o papel e o
 * alcance antes (`pracaAtivaDoAdmin`, `atorAlcanca`) — e recorta por ela aqui,
 * nunca só na tela.
 *
 * O mês de uma comissão é o mês da DATA DO SERVIÇO (`agenda_slots.data`), não
 * o dia em que ele foi marcado realizado.
 */

type DB = ReturnType<typeof createAdminClient>;

export interface ComissaoDetalhada {
  id: string;
  servicoId: string;
  prestadorId: string;
  workspaceId: string;
  tipo: string | null;
  base: number;
  percentual: number;
  valor: number;
  /** em_aberto · informada · paga. */
  status: string;
  pagamentoId: string | null;
  criadaEm: string;
  /** Quando o Administrador deu o OK desta comissão (coluna `paga_em`, migration 0059) — data do livro-caixa (Entradas). */
  pagaEm: string | null;
  /** Data do serviço (AAAA-MM-DD), do horário da agenda. */
  dataServico: string | null;
  clienteId: string | null;
  descricao: string | null;
}

type LinhaComissao = {
  id: string;
  servico_id: string;
  prestador_id: string;
  workspace_id: string;
  tipo_servico: string | null;
  base: number;
  percentual: number;
  valor: number;
  status: string;
  pagamento_id: string | null;
  created_at: string;
  paga_em: string | null;
  servicos: { cliente_id: string; descricao: string; agenda_slots: { data: string } | null } | null;
};

const SELECT_COMISSAO =
  "id, servico_id, prestador_id, workspace_id, tipo_servico, base, percentual, valor, status, pagamento_id, created_at, paga_em, servicos(cliente_id, descricao, agenda_slots(data))";

function detalhar(l: LinhaComissao): ComissaoDetalhada {
  return {
    id: l.id,
    servicoId: l.servico_id,
    prestadorId: l.prestador_id,
    workspaceId: l.workspace_id,
    tipo: l.tipo_servico,
    base: Number(l.base),
    percentual: Number(l.percentual),
    valor: Number(l.valor),
    status: l.status,
    pagamentoId: l.pagamento_id,
    criadaEm: l.created_at,
    pagaEm: l.paga_em,
    dataServico: l.servicos?.agenda_slots?.data ?? null,
    clienteId: l.servicos?.cliente_id ?? null,
    descricao: l.servicos?.descricao ?? null,
  };
}

/** Comissões de uma praça (opcional: de um prestador só), com a data do serviço — mais recentes primeiro. */
export async function comissoesDaPraca(db: DB, workspaceId: string, prestadorId?: string): Promise<ComissaoDetalhada[]> {
  let q = db.from("comissoes").select(SELECT_COMISSAO).eq("workspace_id", workspaceId);
  if (prestadorId) q = q.eq("prestador_id", prestadorId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaComissao[]).map(detalhar);
}

/** Só as do mês (pela data do serviço), da mais antiga para a mais recente — a ordem do recibo. */
export function doMes(comissoes: readonly ComissaoDetalhada[], mes: string): ComissaoDetalhada[] {
  const { inicio, fim } = intervaloDoMes(mes);
  return comissoes
    .filter((c) => c.dataServico != null && c.dataServico >= inicio && c.dataServico <= fim)
    .sort((a, b) => (a.dataServico! < b.dataServico! ? -1 : a.dataServico! > b.dataServico! ? 1 : a.criadaEm.localeCompare(b.criadaEm)));
}

export interface SaldoDoPrestador {
  prestadorId: string;
  /** Soma em aberto (ainda não informada). */
  emAberto: number;
  /** Soma informada pelo prestador, aguardando o Administrador confirmar. */
  informada: number;
  /** Soma já confirmada (paga). */
  pago: number;
  /** created_at da comissão em aberto mais antiga — base do destaque de atraso. */
  maisAntigoEmAberto: string | null;
}

/** Saldo por prestador a partir das comissões da praça (em centavos, sem erro de ponto flutuante). */
export function saldosPorPrestador(comissoes: readonly ComissaoDetalhada[]): SaldoDoPrestador[] {
  const mapa = new Map<string, { aberto: number; informada: number; pago: number; antigo: string | null }>();
  for (const c of comissoes) {
    const s = mapa.get(c.prestadorId) ?? { aberto: 0, informada: 0, pago: 0, antigo: null };
    const cent = Math.round(c.valor * 100);
    if (c.status === "em_aberto") {
      s.aberto += cent;
      if (!s.antigo || c.criadaEm < s.antigo) s.antigo = c.criadaEm;
    } else if (c.status === "informada") s.informada += cent;
    else if (c.status === "paga") s.pago += cent;
    mapa.set(c.prestadorId, s);
  }
  return [...mapa.entries()].map(([prestadorId, s]) => ({
    prestadorId,
    emAberto: s.aberto / 100,
    informada: s.informada / 100,
    pago: s.pago / 100,
    maisAntigoEmAberto: s.antigo,
  }));
}

export interface PagamentoDaPraca {
  id: string;
  prestadorId: string;
  valor: number;
  status: string;
  informadoEm: string;
  decididoEm: string | null;
  observacao: string | null;
}

/** Pagamentos de comissão da praça (todos os status), mais recentes primeiro. */
export async function pagamentosDaPraca(db: DB, workspaceId: string): Promise<PagamentoDaPraca[]> {
  const { data, error } = await db
    .from("pagamentos_comissao")
    .select("id, prestador_id, valor, status, informado_em, decidido_em, observacao")
    .eq("workspace_id", workspaceId)
    .order("informado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    prestadorId: p.prestador_id,
    valor: Number(p.valor),
    status: p.status,
    informadoEm: p.informado_em,
    decididoEm: p.decidido_em,
    observacao: p.observacao,
  }));
}

export interface AliquotaDaPraca {
  id: string;
  /** null = vale para todos os prestadores da praça. */
  prestadorId: string | null;
  /** null = vale para todos os tipos. */
  tipo: string | null;
  percentual: number;
  atualizadoEm: string;
}

/** As alíquotas cadastradas na praça (geral, por tipo, por prestador, prestador + tipo). */
export async function aliquotasDaPraca(db: DB, workspaceId: string): Promise<AliquotaDaPraca[]> {
  const { data, error } = await db
    .from("aliquotas_comissao")
    .select("id, prestador_id, tipo_servico, percentual, atualizado_em")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    prestadorId: a.prestador_id,
    tipo: a.tipo_servico,
    percentual: Number(a.percentual),
    atualizadoEm: a.atualizado_em,
  }));
}

export interface NotaAvulsa {
  id: string;
  numero: number;
  workspaceId: string;
  prestadorId: string | null;
  pagadorNome: string;
  descricao: string;
  valor: number;
  recebidoEm: string;
  forma: string;
  emitidoPor: string | null;
  criadaEm: string;
}

type LinhaNota = {
  id: string;
  numero: number;
  workspace_id: string;
  prestador_id: string | null;
  pagador_nome: string;
  descricao: string;
  valor: number;
  recebido_em: string;
  forma: string;
  emitido_por: string | null;
  created_at: string;
};

function nota(n: LinhaNota): NotaAvulsa {
  return {
    id: n.id,
    numero: Number(n.numero),
    workspaceId: n.workspace_id,
    prestadorId: n.prestador_id,
    pagadorNome: n.pagador_nome,
    descricao: n.descricao,
    valor: Number(n.valor),
    recebidoEm: n.recebido_em,
    forma: n.forma,
    emitidoPor: n.emitido_por,
    criadaEm: n.created_at,
  };
}

/** Notas avulsas da praça, mais recentes primeiro. */
export async function notasAvulsasDaPraca(db: DB, workspaceId: string): Promise<NotaAvulsa[]> {
  const { data, error } = await db
    .from("notas_avulsas")
    .select("id, numero, workspace_id, prestador_id, pagador_nome, descricao, valor, recebido_em, forma, emitido_por, created_at")
    .eq("workspace_id", workspaceId)
    .order("numero", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((n) => nota(n as LinhaNota));
}

/** Uma nota avulsa pelo id (quem chama confere se pode ver: a praça dela ou o prestador pagador). */
export async function notaAvulsaPorId(db: DB, id: string): Promise<NotaAvulsa | null> {
  const { data } = await db
    .from("notas_avulsas")
    .select("id, numero, workspace_id, prestador_id, pagador_nome, descricao, valor, recebido_em, forma, emitido_por, created_at")
    .eq("id", id)
    .maybeSingle();
  return data ? nota(data as LinhaNota) : null;
}

export interface EmissorDoRecibo {
  pracaId: string;
  pracaNome: string;
  cidade: string | null;
  estado: string | null;
  /** Quem assina: o Administrador responsável pela praça (ou quem emitiu a nota avulsa). */
  assinanteId: string;
  assinanteNome: string;
  /** PNG em data URL, se ele desenhou a assinatura (migration 0058); senão o recibo usa o nome em cursiva. */
  assinaturaImagem: string | null;
}

/** Cabeçalho e assinatura de um recibo da praça. `assinanteId` omitido = o dono da praça. */
export async function emissorDoRecibo(db: DB, workspaceId: string, assinanteId?: string | null): Promise<EmissorDoRecibo | null> {
  const { data: w } = await db.from("workspaces").select("id, nome, cidade, estado, owner_id").eq("id", workspaceId).maybeSingle();
  if (!w) return null;
  const quem = assinanteId ?? w.owner_id;
  const [{ data: perfil }, { data: assinatura }] = await Promise.all([
    db.from("profiles").select("nome").eq("user_id", quem).maybeSingle(),
    db.from("assinaturas").select("imagem").eq("user_id", quem).maybeSingle(),
  ]);
  return {
    pracaId: w.id,
    pracaNome: w.nome,
    cidade: w.cidade,
    estado: w.estado,
    assinanteId: quem,
    assinanteNome: perfil?.nome ?? "Administração da praça",
    assinaturaImagem: assinatura?.imagem ?? null,
  };
}

export interface ReciboMensal {
  prestadorId: string;
  prestadorNome: string;
  mes: string;
  emissor: EmissorDoRecibo;
  linhas: ComissaoDetalhada[];
  /** Nome de cada cliente das linhas. */
  clientes: Record<string, string>;
  resumo: ResumoDoRecibo;
}

/**
 * Recibo mensal da comissão de um prestador numa praça: todos os serviços
 * realizados no mês, em ordem de data, com a taxa de cada um, os totais, a
 * taxa média e o que já foi confirmado (Pix recebido). Quem chama já conferiu
 * que pode ver (o próprio prestador ou a administração que alcança a praça).
 */
export async function reciboMensal(db: DB, workspaceId: string, prestadorId: string, mes: string): Promise<ReciboMensal | null> {
  const [emissor, { data: prestador }, todas] = await Promise.all([
    emissorDoRecibo(db, workspaceId),
    db.from("profiles").select("nome, tipo_base").eq("user_id", prestadorId).maybeSingle(),
    comissoesDaPraca(db, workspaceId, prestadorId),
  ]);
  // Só recibo de PRESTADOR: um id de cliente, Administrador ou SysAdmin não
  // vira "recibo" com o nome da pessoa (defesa em profundidade, além da página).
  if (!emissor || !prestador || prestador.tipo_base !== "prestador_servico") return null;
  const linhas = doMes(todas, mes);
  const idsClientes = [...new Set(linhas.map((l) => l.clienteId).filter((x): x is string => Boolean(x)))];
  const { data: clientes } = idsClientes.length
    ? await db.from("profiles").select("user_id, nome").in("user_id", idsClientes)
    : { data: [] };
  return {
    prestadorId,
    prestadorNome: prestador.nome,
    mes,
    emissor,
    linhas,
    clientes: Object.fromEntries((clientes ?? []).map((c) => [c.user_id, c.nome])),
    resumo: resumoDoRecibo(linhas),
  };
}
