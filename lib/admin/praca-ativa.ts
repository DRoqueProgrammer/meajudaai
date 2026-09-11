import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { pracasDoMundoDeExemplo } from "@/lib/admin/alcance";

type DB = ReturnType<typeof createAdminClient>;

/** A praça que o Administrador está vendo agora, no recorte que as abas administrativas precisam. */
export interface PracaDoPainel {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  /** Mundo da praça (R-42): praça de exemplo só enxerga gente de exemplo, e vice-versa. */
  exemplo: boolean;
  /** Administrador responsável (`workspaces.owner_id`) — quem recebe a comissão e assina os recibos. */
  donoId: string;
  limitePadrao: number | null;
}

/**
 * Praça ATIVA do Administrador logado (cookie de praça ativa, entre as que ele
 * integra — `getActiveWorkspace`), ou `null` se ele não tem nenhuma. Ponto
 * único das abas Serviços, Clientes, Prestadores e Financeiro: toda leitura
 * pela chave de serviço dessas telas é recortada por ESTA praça.
 */
export async function pracaAtivaDoAdmin(db: DB): Promise<PracaDoPainel | null> {
  const ws = await getActiveWorkspace();
  if (!ws) return null;
  const { data } = await db
    .from("workspaces")
    .select("id, nome, cidade, estado, owner_id, limite_anuncios_padrao")
    .eq("id", ws.workspace_id)
    .maybeSingle();
  if (!data) return null;
  const exemplo = (await pracasDoMundoDeExemplo(db)).has(data.id);
  return {
    id: data.id,
    nome: data.nome,
    cidade: data.cidade,
    estado: data.estado,
    exemplo,
    donoId: data.owner_id,
    limitePadrao: data.limite_anuncios_padrao,
  };
}
