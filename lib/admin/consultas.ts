import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AppRole } from "@/lib/auth/roles";
import type { MarcaDeExemplo } from "@/lib/auth/exemplo";

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
  "id" | "prestador_id" | "tipo" | "titulo" | "status" | "created_at"
>;

type LinhaLimiteAjustado = Pick<Database["public"]["Tables"]["anuncio_limites"]["Row"], "prestador_id" | "limite">;

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
    .select("id, prestador_id, tipo, titulo, status, created_at")
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
