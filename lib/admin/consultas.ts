import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AppRole } from "@/lib/auth/roles";
import type { MarcaDeExemplo } from "@/lib/auth/exemplo";
import { pracasDoMundoDeExemplo } from "@/lib/admin/alcance";
import { hojeEmSaoPaulo, somarDias } from "@/lib/datas";

/**
 * Leituras das telas administrativas (`/admin/logs`, `/admin/servicos`,
 * `/admin/usuarios`), com o escopo do mundo de exemplo imposto AQUI — nunca só
 * na tela (anti-padrão registrado no ADR 0012). R-42 (cvg/docs/tech-spec/
 * fatia-1-seguranca.md): um ator de exemplo só enxerga o mundo de exemplo
 * (`profiles.exemplo = true`, migration 0040); um ator real enxerga todo mundo,
 * exatamente como antes desta tarefa.
 *
 * Recebem o cliente do banco já pronto (a chave de serviço, como as telas já
 * usavam) porque quem chama decide a credencial; a função só decide o recorte.
 */

type DB = SupabaseClient<Database>;

type LinhaLoginLog = Pick<
  Database["public"]["Tables"]["login_logs"]["Row"],
  "id" | "user_id" | "ip" | "user_agent" | "cidade" | "pais" | "created_at"
>;

type LinhaServico = Pick<
  Database["public"]["Tables"]["servicos"]["Row"],
  "id" | "descricao" | "preco_valor" | "status" | "prestador_id" | "cliente_id" | "created_at"
>;

type LinhaUsuario = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "nome" | "tipo_base" | "genero">;

type LinhaPedidoExclusao = Pick<
  Database["public"]["Tables"]["pedidos_exclusao"]["Row"],
  "id" | "user_id" | "status" | "solicitado_em" | "pode_processar_em" | "cancelado_em" | "concluido_em"
>;

type LinhaPrestadorDaPraca = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "nome" | "foto_url" | "categoria"
>;

type LinhaAnuncioDaPraca = Pick<
  Database["public"]["Tables"]["anuncios"]["Row"],
  "id" | "prestador_id" | "tipo" | "titulo" | "status" | "created_at" | "descricao" | "categoria" | "whatsapp" | "cidade" | "estado"
>;

type LinhaLimiteAjustado = Pick<Database["public"]["Tables"]["anuncio_limites"]["Row"], "prestador_id" | "limite">;

type LinhaSuspeitaPrestador = Pick<
  Database["public"]["Tables"]["suspeitas_prestador"]["Row"],
  "id" | "prestador_id" | "autor_id" | "motivo" | "descricao" | "created_at"
>;

type LinhaSuspensao = Pick<Database["public"]["Tables"]["suspensoes"]["Row"], "id" | "user_id" | "motivo_publico" | "suspenso_em">;

type LinhaSinalizacao = Pick<
  Database["public"]["Tables"]["sinalizacoes"]["Row"],
  "id" | "autor_id" | "alvo_id" | "servico_id" | "direcao" | "motivo" | "justificativa" | "status" | "created_at"
>;

type LinhaClienteDaPraca = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "nome" | "foto_url">;

/**
 * Ids de `profiles` no recorte do ator: se ele é de exemplo, só quem tem
 * `exemplo = true`; se é real, todo mundo (sem filtro de papel aqui — quem
 * chama decide `papeis`). Ponto único do critério "mundo de exemplo" para as
 * consultas baseadas em `user_id` (logs e usuários).
 */
async function idsDoEscopo(db: DB, ator: MarcaDeExemplo, papeis?: AppRole[]): Promise<string[]> {
  let query = db.from("profiles").select("user_id");
  if (papeis && papeis.length > 0) query = query.in("tipo_base", papeis);
  if (ator.exemplo) query = query.eq("exemplo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => p.user_id);
}

/**
 * Logs de acesso (`login_logs`) das pessoas com um dos `papeis` pedidos — ou de
 * todos os papéis, se `papeis` for omitido. Usada pelas duas abas de
 * `/admin/logs`: a aba "SysAdmin" passa `["cliente", "prestador_servico",
 * "funcionario"]`, a aba "Administração" passa `["admin"]`.
 */
export async function listarAcessos(db: DB, ator: MarcaDeExemplo, papeis?: AppRole[]): Promise<LinhaLoginLog[]> {
  const ids = await idsDoEscopo(db, ator, papeis);
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("login_logs")
    .select("id, user_id, ip, user_agent, cidade, pais, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/**
 * Últimos 100 serviços da plataforma. Um ator de exemplo só enxerga serviços
 * em que cliente E prestador são os dois do mundo de exemplo — um serviço com
 * qualquer parte real fica de fora, mesmo que a outra parte seja de exemplo.
 */
export async function listarServicosDaPlataforma(db: DB, ator: MarcaDeExemplo): Promise<LinhaServico[]> {
  let query = db
    .from("servicos")
    .select("id, descricao, preco_valor, status, prestador_id, cliente_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (ator.exemplo) {
    const idsExemplo = await idsDoEscopo(db, ator);
    if (idsExemplo.length === 0) return [];
    query = query.in("cliente_id", idsExemplo).in("prestador_id", idsExemplo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Todos os usuários (`profiles`), no recorte do ator — usada por `/admin/usuarios`. */
export async function listarUsuarios(db: DB, ator: MarcaDeExemplo): Promise<LinhaUsuario[]> {
  let query = db.from("profiles").select("user_id, nome, tipo_base, genero");
  if (ator.exemplo) query = query.eq("exemplo", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Pedidos de exclusão do titular (`/admin/pedidos-de-exclusao`, D-023). Um
 * ator de exemplo só enxerga pedidos de gente do mundo de exemplo (R-42) —
 * nunca o pedido de uma pessoa real, mesmo sendo só metadado (datas/status).
 */
export async function listarPedidosDeExclusao(db: DB, ator: MarcaDeExemplo): Promise<LinhaPedidoExclusao[]> {
  let query = db
    .from("pedidos_exclusao")
    .select("id, user_id, status, solicitado_em, pode_processar_em, cancelado_em, concluido_em")
    .order("solicitado_em", { ascending: false })
    .limit(200);

  if (ator.exemplo) {
    const idsExemplo = await idsDoEscopo(db, ator);
    if (idsExemplo.length === 0) return [];
    query = query.in("user_id", idsExemplo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Prestadores de Serviço da cidade/UF de uma praça, do mundo `exemplo` dado
 * (D-026, painel do Administrador, lote A4) — base da seção "Prestadores da
 * praça" em `/inicio`. `exemplo` aqui é o mundo da PRAÇA (não do ator): a
 * página só chama esta função depois de confirmar que a praça pertence ao
 * ator, então o mundo dela já é o que vale (espelha `adminAlcancaPrestador`,
 * que compara `praca.exemplo` com o do prestador, nunca o do ator direto).
 */
export async function listarPrestadoresDaPraca(
  db: DB,
  cidade: string | null,
  estado: string | null,
  exemplo: boolean,
): Promise<LinhaPrestadorDaPraca[]> {
  if (!cidade || !estado) return [];
  const { data, error } = await db
    .from("profiles")
    .select("user_id, nome, foto_url, categoria")
    .eq("tipo_base", "prestador_servico")
    .eq("cidade", cidade)
    .eq("estado", estado)
    .eq("exemplo", exemplo)
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

/** Anúncios (qualquer status) dos prestadores dados — seção "Anúncios da praça" em `/inicio`. */
export async function listarAnunciosDosPrestadores(db: DB, prestadorIds: string[]): Promise<LinhaAnuncioDaPraca[]> {
  if (prestadorIds.length === 0) return [];
  const { data, error } = await db
    .from("anuncios")
    .select("id, prestador_id, tipo, titulo, status, created_at, descricao, categoria, whatsapp, cidade, estado")
    .in("prestador_id", prestadorIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Ajustes individuais (`anuncio_limites`) dos prestadores dados — quem tem o selo "ajuste próprio" em `/inicio`. */
export async function listarLimitesDosPrestadores(db: DB, prestadorIds: string[]): Promise<LinhaLimiteAjustado[]> {
  if (prestadorIds.length === 0) return [];
  const { data, error } = await db.from("anuncio_limites").select("prestador_id, limite").in("prestador_id", prestadorIds);
  if (error) throw error;
  return data ?? [];
}

/** Um cadastro recente, sem contato — nome, papel e data, para a lista curta do painel do SysAdmin. */
export interface LinhaUltimoCadastro {
  nome: string;
  papel: string;
  genero: string | null;
  criadoEm: string;
}

/** Um serviço recente, sem as partes — descrição, status e data, para a lista curta do painel do SysAdmin. */
export interface LinhaUltimoServicoPlataforma {
  descricao: string;
  status: string;
  criadoEm: string;
}

/** Números e listas curtas do "Painel da plataforma" (SysAdmin). */
export interface ResumoDaPlataforma {
  /** `profiles.tipo_base` → contagem. A soma bate com o total de `profiles` do recorte do ator. */
  usuariosPorPapel: Record<string, number>;
  /** `servicos.status` → contagem, no recorte do ator. */
  servicosPorStatus: Record<string, number>;
  /** Soma de `preco_valor` dos serviços realizados cujo horário (`agenda_slots.data`) caiu nos últimos 30 dias, hoje em São Paulo. */
  faturamento30d: number;
  anunciosAtivos: { servico: number; vaga_ajudante: number };
  pedidosDeExclusaoPendentes: number;
  denunciasAbertas: number;
  pracas: number;
  ultimosCadastros: LinhaUltimoCadastro[];
  ultimosServicos: LinhaUltimoServicoPlataforma[];
}

/** `profiles.tipo_base` → contagem, no recorte do ator — a base de `usuariosPorPapel`. */
async function contarUsuariosPorPapel(db: DB, ator: MarcaDeExemplo): Promise<Record<string, number>> {
  let query = db.from("profiles").select("tipo_base");
  if (ator.exemplo) query = query.eq("exemplo", true);
  const { data, error } = await query;
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const p of data ?? []) out[p.tipo_base] = (out[p.tipo_base] ?? 0) + 1;
  return out;
}

/** Últimos `limite` cadastros (`profiles`), no recorte do ator — sem telefone/e-mail, só o que a lista curta mostra. */
async function ultimosCadastrosDaPlataforma(db: DB, ator: MarcaDeExemplo, limite = 5): Promise<LinhaUltimoCadastro[]> {
  let query = db
    .from("profiles")
    .select("nome, tipo_base, genero, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (ator.exemplo) query = query.eq("exemplo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({ nome: p.nome, papel: p.tipo_base, genero: p.genero, criadoEm: p.created_at }));
}

/**
 * `servicos.status` → contagem, no recorte do ator. `idsExemplo` já vem
 * calculado por quem chama (`resumoDaPlataforma`) — `null` para um ator real
 * (sem recorte), a lista de ids do mundo de exemplo para um ator de exemplo.
 * Um serviço só conta se cliente E prestador são os dois do mundo de
 * exemplo, como `listarServicosDaPlataforma` já decide.
 */
async function contarServicosPorStatus(db: DB, idsExemplo: string[] | null): Promise<Record<string, number>> {
  let query = db.from("servicos").select("status");
  if (idsExemplo) query = query.in("cliente_id", idsExemplo).in("prestador_id", idsExemplo);
  const { data, error } = await query;
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const s of data ?? []) out[s.status] = (out[s.status] ?? 0) + 1;
  return out;
}

/**
 * Faturamento (soma de `preco_valor`) dos serviços realizados cujo horário
 * caiu nos últimos `dias` dias, hoje em São Paulo (lib/datas.ts — o servidor
 * roda em UTC). Acha primeiro os horários da janela (poucas linhas, índice em
 * `agenda_slots.data`) e só depois os serviços realizados desses horários —
 * mesmo padrão do "Faturado no mês" em `app/(app)/inicio/page.tsx`.
 */
async function faturamentoUltimosDias(db: DB, idsExemplo: string[] | null, dias: number): Promise<number> {
  const hoje = hojeEmSaoPaulo();
  const inicio = somarDias(hoje, -(dias - 1));
  const { data: slots, error: slotsErr } = await db.from("agenda_slots").select("id").gte("data", inicio).lte("data", hoje);
  if (slotsErr) throw slotsErr;
  const idsSlots = (slots ?? []).map((s) => s.id);
  if (idsSlots.length === 0) return 0;

  let query = db.from("servicos").select("preco_valor").in("slot_id", idsSlots).eq("status", "realizado");
  if (idsExemplo) query = query.in("cliente_id", idsExemplo).in("prestador_id", idsExemplo);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reduce((acc, s) => acc + s.preco_valor, 0);
}

/** Anúncios ATIVOS, por tipo, no recorte do ator (via `prestador_id`). */
async function contarAnunciosAtivos(db: DB, idsExemplo: string[] | null): Promise<{ servico: number; vaga_ajudante: number }> {
  let query = db.from("anuncios").select("tipo").eq("status", "ativo");
  if (idsExemplo) query = query.in("prestador_id", idsExemplo);
  const { data, error } = await query;
  if (error) throw error;
  let servico = 0;
  let vagaAjudante = 0;
  for (const a of data ?? []) {
    if (a.tipo === "servico") servico++;
    else if (a.tipo === "vaga_ajudante") vagaAjudante++;
  }
  return { servico, vaga_ajudante: vagaAjudante };
}

/** Pedidos de exclusão com status `pendente`, no recorte do ator (via `user_id` do titular). */
async function contarPedidosPendentes(db: DB, idsExemplo: string[] | null): Promise<number> {
  let query = db.from("pedidos_exclusao").select("id", { count: "exact", head: true }).eq("status", "pendente");
  if (idsExemplo) query = query.in("user_id", idsExemplo);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Denúncias abertas ou em análise, no recorte do ator (via `denunciante_id`). */
async function contarDenunciasAbertas(db: DB, idsExemplo: string[] | null): Promise<number> {
  let query = db.from("denuncias").select("id", { count: "exact", head: true }).in("status", ["aberta", "em_analise"]);
  if (idsExemplo) query = query.in("denunciante_id", idsExemplo);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Praças (`workspaces`), no recorte do ator — reaproveita `pracasDoMundoDeExemplo` (lib/admin/alcance.ts). */
async function contarPracas(db: DB, ator: MarcaDeExemplo): Promise<number> {
  if (ator.exemplo) {
    const pracasExemplo = await pracasDoMundoDeExemplo(db);
    return pracasExemplo.size;
  }
  const { count, error } = await db.from("workspaces").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Últimos `limite` serviços da plataforma, sem as partes — só descrição/status/data —, no recorte do ator. */
async function ultimosServicosDaPlataforma(
  db: DB,
  idsExemplo: string[] | null,
  limite = 5,
): Promise<LinhaUltimoServicoPlataforma[]> {
  let query = db.from("servicos").select("descricao, status, created_at").order("created_at", { ascending: false }).limit(limite);
  if (idsExemplo) query = query.in("cliente_id", idsExemplo).in("prestador_id", idsExemplo);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((s) => ({ descricao: s.descricao, status: s.status, criadoEm: s.created_at }));
}

/**
 * Resumo da plataforma inteira — os números do "Painel da plataforma"
 * (SysAdmin, Fatia 5). O SysAdmin não participa de diária nem de praça
 * específica: ele modera a plataforma toda, então este resumo nunca recorta
 * por praça — só pelo mundo de exemplo (R-42, ADR 0012, D-015), como as
 * outras consultas deste arquivo. `pracas` e `usuariosPorPapel` têm o próprio
 * critério de recorte (respectivamente `pracasDoMundoDeExemplo` e
 * `profiles.exemplo`); as demais contagens passam pelos ids de gente do
 * mundo de exemplo, calculados uma vez só aqui e reaproveitados — evita
 * repetir a mesma consulta a `profiles` a cada número.
 */
export async function resumoDaPlataforma(db: DB, ator: MarcaDeExemplo): Promise<ResumoDaPlataforma> {
  const idsExemplo = ator.exemplo ? await idsDoEscopo(db, ator) : null;

  const [usuariosPorPapel, ultimosCadastros] = await Promise.all([
    contarUsuariosPorPapel(db, ator),
    ultimosCadastrosDaPlataforma(db, ator),
  ]);

  // Mundo de exemplo ainda sem ninguém: toda contagem que depende de ids fica
  // zerada sem consultar mais nada — um `.in(coluna, [])` do supabase-js não
  // devolve "nenhuma linha", devolve erro.
  if (ator.exemplo && idsExemplo!.length === 0) {
    return {
      usuariosPorPapel,
      servicosPorStatus: {},
      faturamento30d: 0,
      anunciosAtivos: { servico: 0, vaga_ajudante: 0 },
      pedidosDeExclusaoPendentes: 0,
      denunciasAbertas: 0,
      pracas: 0,
      ultimosCadastros,
      ultimosServicos: [],
    };
  }

  const [servicosPorStatus, faturamento30d, anunciosAtivos, pedidosDeExclusaoPendentes, denunciasAbertas, pracas, ultimosServicos] =
    await Promise.all([
      contarServicosPorStatus(db, idsExemplo),
      faturamentoUltimosDias(db, idsExemplo, 30),
      contarAnunciosAtivos(db, idsExemplo),
      contarPedidosPendentes(db, idsExemplo),
      contarDenunciasAbertas(db, idsExemplo),
      contarPracas(db, ator),
      ultimosServicosDaPlataforma(db, idsExemplo),
    ]);

  return {
    usuariosPorPapel,
    servicosPorStatus,
    faturamento30d,
    anunciosAtivos,
    pedidosDeExclusaoPendentes,
    denunciasAbertas,
    pracas,
    ultimosCadastros,
    ultimosServicos,
  };
}

/**
 * Suspeitas privadas (`suspeitas_prestador`, migration 0052) dos prestadores
 * dados — mais recentes primeiro. Só a administração vê ("Suspeitas (N)" em
 * cada prestador do painel da praça, lote F5, pedido do Leonardo em
 * 10/09/2026).
 */
export async function listarSuspeitasDosPrestadores(db: DB, prestadorIds: string[]): Promise<LinhaSuspeitaPrestador[]> {
  if (prestadorIds.length === 0) return [];
  const { data, error } = await db
    .from("suspeitas_prestador")
    .select("id, prestador_id, autor_id, motivo, descricao, created_at")
    .in("prestador_id", prestadorIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Suspensões ABERTAS (`suspensoes`, migrations 0052/0054) das pessoas dadas — no máximo uma por pessoa. */
export async function listarSuspensoesAtivas(db: DB, userIds: string[]): Promise<LinhaSuspensao[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await db
    .from("suspensoes")
    .select("id, user_id, motivo_publico, suspenso_em")
    .in("user_id", userIds)
    .is("encerrada_em", null);
  if (error) throw error;
  return data ?? [];
}

/**
 * Sinalizações ("Flag Pilantra", migration 0055) das pessoas-ALVO dadas, nos
 * status pedidos — mais recente primeiro. Serve tanto para as bandeiras
 * aprovadas (`status: ["aprovada"]`, o painel da praça já é chave de serviço
 * e não pode chamar `flags_da_pessoa`, que depende de `auth.uid()`) quanto
 * para achar "clientes com sinalização" (`status: ["pendente", "aprovada"]`).
 */
export async function listarSinalizacoesDosAlvos(db: DB, alvoIds: string[], status: string[]): Promise<LinhaSinalizacao[]> {
  if (alvoIds.length === 0 || status.length === 0) return [];
  const { data, error } = await db
    .from("sinalizacoes")
    .select("id, autor_id, alvo_id, servico_id, direcao, motivo, justificativa, status, created_at")
    .in("alvo_id", alvoIds)
    .in("status", status)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Sinalizações PENDENTES que tocam a praça dada — pelo menos uma das partes
 * (quem sinalizou ou quem foi sinalizado) mora na cidade/UF da praça, no
 * mesmo mundo (real ou de exemplo). Espelha o alcance de `atorAlcanca`
 * (lib/admin/alcance.ts: `decidirSinalizacaoAction` confere o mesmo, numa
 * sinalização por vez) sem precisar do client da sessão — o filtro roda em
 * memória porque o PostgREST não filtra, numa chamada só, por uma coluna que
 * pode estar em QUALQUER UMA de duas colunas de FK (autor OU alvo).
 */
export async function listarSinalizacoesPendentesDaPraca(
  db: DB,
  cidade: string | null,
  estado: string | null,
  exemplo: boolean,
): Promise<LinhaSinalizacao[]> {
  if (!cidade || !estado) return [];
  const { data, error } = await db
    .from("sinalizacoes")
    .select("id, autor_id, alvo_id, servico_id, direcao, motivo, justificativa, status, created_at")
    .eq("status", "pendente")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const linhas = data ?? [];
  if (linhas.length === 0) return [];

  const ids = [...new Set(linhas.flatMap((s) => [s.autor_id, s.alvo_id]))];
  const { data: perfis, error: erroPerfis } = await db
    .from("profiles")
    .select("user_id, cidade, estado, exemplo")
    .in("user_id", ids);
  if (erroPerfis) throw erroPerfis;
  const perfilDe = new Map((perfis ?? []).map((p) => [p.user_id, p]));
  const naPraca = (id: string) => {
    const p = perfilDe.get(id);
    return !!p && p.cidade === cidade && p.estado === estado && p.exemplo === exemplo;
  };
  return linhas.filter((s) => naPraca(s.autor_id) || naPraca(s.alvo_id));
}

/** Clientes da cidade/UF de uma praça, do mundo dado — base de "Clientes com sinalizações" (espelha `listarPrestadoresDaPraca`). */
export async function listarClientesDaPraca(
  db: DB,
  cidade: string | null,
  estado: string | null,
  exemplo: boolean,
): Promise<LinhaClienteDaPraca[]> {
  if (!cidade || !estado) return [];
  const { data, error } = await db
    .from("profiles")
    .select("user_id, nome, foto_url")
    .eq("tipo_base", "cliente")
    .eq("cidade", cidade)
    .eq("estado", estado)
    .eq("exemplo", exemplo)
    .order("nome");
  if (error) throw error;
  return data ?? [];
}
