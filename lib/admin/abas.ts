import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { hojeEmSaoPaulo } from "@/lib/datas";

/**
 * Leituras das três abas administrativas da praça (Serviços, Clientes,
 * Prestadores — pedido do Leonardo em 11/09/2026, D-047), pela chave de
 * serviço. Módulo SÓ de servidor (a outra diretiva de topo, a que marca
 * server action, faria de uma função exportada aqui um endpoint público) —
 * cada consulta recebe a lista
 * de ids já autorizada por quem chama (a página, depois de `pracaAtivaDoAdmin`
 * + `listarPrestadoresDaPraca`/`listarClientesDaPraca`) e recorta por ela com
 * `.in(...)`. Sem lista, sem consulta — evita o `.in(coluna, [])` que o
 * supabase-js trata como erro, não como "nenhuma linha".
 */

type DB = ReturnType<typeof createAdminClient>;

/** Uma linha de `servicos`, no recorte que a aba /praca/servicos precisa para montar a lista e o "quando". */
export interface LinhaServicoDaPraca {
  id: string;
  descricao: string;
  preco_valor: number;
  status: string;
  tipo: string;
  prestador_id: string;
  cliente_id: string;
  slot_id: string;
  hora_combinada_inicio: string | null;
  hora_combinada_fim: string | null;
  periodo_preferido: string;
  created_at: string;
}

/**
 * Serviços dos prestadores da praça, mais recentes primeiro, com filtro
 * opcional por status e por um prestador específico (ambos vindos da
 * querystring da tela). `limite` corta o volume — a praça pode ter centenas
 * de serviços acumulados, e a tela não precisa deles todos de uma vez.
 */
export async function listarServicosDaPraca(
  db: DB,
  prestadorIds: string[],
  opts: { status?: string; prestadorId?: string; limite?: number } = {},
): Promise<LinhaServicoDaPraca[]> {
  if (prestadorIds.length === 0) return [];
  let query = db
    .from("servicos")
    .select(
      "id, descricao, preco_valor, status, tipo, prestador_id, cliente_id, slot_id, hora_combinada_inicio, hora_combinada_fim, periodo_preferido, created_at",
    )
    .in("prestador_id", prestadorIds)
    .order("created_at", { ascending: false })
    .limit(opts.limite ?? 300);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.prestadorId) query = query.eq("prestador_id", opts.prestadorId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Um horário (`agenda_slots`), no recorte mínimo para `quandoDoServico`. */
export interface LinhaSlotDaPraca {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
}

/** Horários dos ids dados — a data/janela de cada serviço listado em /praca/servicos. */
export async function slotsPorIds(db: DB, slotIds: string[]): Promise<LinhaSlotDaPraca[]> {
  if (slotIds.length === 0) return [];
  const { data, error } = await db.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds);
  if (error) throw error;
  return data ?? [];
}

/** Contagem e faturamento dos serviços REALIZADOS no mês corrente (fuso SP). */
export interface NumerosDoMesDaPraca {
  realizados: number;
  faturamento: number;
}

/**
 * Serviços realizados e faturamento (soma de `preco_valor`) dos prestadores
 * dados, no mês corrente em São Paulo — os dois primeiros números do topo de
 * /praca/servicos. Mesmo padrão de `app/(app)/inicio/page.tsx` ("Faturado no
 * mês" do prestador): acha primeiro os horários do mês (poucas linhas, índice
 * em `agenda_slots.data`) e só depois os serviços realizados desses horários.
 */
export async function numerosDoMesDaPraca(db: DB, prestadorIds: string[]): Promise<NumerosDoMesDaPraca> {
  if (prestadorIds.length === 0) return { realizados: 0, faturamento: 0 };
  const hoje = hojeEmSaoPaulo();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const { data: slots, error: erroSlots } = await db
    .from("agenda_slots")
    .select("id")
    .in("prestador_id", prestadorIds)
    .gte("data", inicioMes)
    .lte("data", hoje);
  if (erroSlots) throw erroSlots;
  const idsSlots = (slots ?? []).map((s) => s.id);
  if (idsSlots.length === 0) return { realizados: 0, faturamento: 0 };
  const { data: realizados, error } = await db
    .from("servicos")
    .select("preco_valor")
    .in("slot_id", idsSlots)
    .eq("status", "realizado");
  if (error) throw error;
  const linhas = realizados ?? [];
  // Soma em centavos: somar reais em ponto flutuante pode errar o último centavo.
  const centavos = linhas.reduce((acc, s) => acc + Math.round(Number(s.preco_valor) * 100), 0);
  return { realizados: linhas.length, faturamento: centavos / 100 };
}

/** Uma linha de `servicos`, no recorte mínimo para contar e achar o mais recente por cliente em /praca/clientes. */
export interface LinhaServicoDoCliente {
  cliente_id: string;
  prestador_id: string;
  slot_id: string;
  status: string;
  created_at: string;
}

/**
 * Serviços dos clientes dados COM prestadores da praça (recorte pelas duas
 * pontas: `.in("cliente_id", ...)` e `.in("prestador_id", ...)`) — base de
 * "quantos serviços teve" e "último serviço" em /praca/clientes. Um serviço
 * de um desses clientes com um prestador de OUTRA praça não entra.
 */
export async function servicosDosClientesNaPraca(
  db: DB,
  clienteIds: string[],
  prestadorIds: string[],
): Promise<LinhaServicoDoCliente[]> {
  if (clienteIds.length === 0 || prestadorIds.length === 0) return [];
  const { data, error } = await db
    .from("servicos")
    .select("cliente_id, prestador_id, slot_id, status, created_at")
    .in("cliente_id", clienteIds)
    .in("prestador_id", prestadorIds);
  if (error) throw error;
  return data ?? [];
}

/** Quantos serviços REALIZADOS cada prestador dado já teve — "serviços realizados" em /praca/prestadores. */
export async function contarRealizadosPorPrestador(db: DB, prestadorIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (prestadorIds.length === 0) return out;
  const { data, error } = await db.from("servicos").select("prestador_id").in("prestador_id", prestadorIds).eq("status", "realizado");
  if (error) throw error;
  for (const s of data ?? []) out.set(s.prestador_id, (out.get(s.prestador_id) ?? 0) + 1);
  return out;
}
