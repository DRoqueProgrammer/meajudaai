import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth/roles";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import { adminAlcancaPrestador, type PracaParaAlcance } from "@/lib/anuncios/regras";

/**
 * Até onde a administração alcança — praças do ator e quem ele pode ajustar,
 * moderar, sinalizar ou suspender. Módulo SÓ de servidor (não "use server"):
 * uma função exportada de um arquivo "use server" vira action que o navegador
 * pode chamar, e estes helpers recebem o client do banco como argumento.
 */

type DB = ReturnType<typeof createAdminClient>;

/**
 * Ids de `workspaces` do mundo de exemplo (R-42, ADR 0012, D-015): a praça
 * cujo dono é de exemplo, ou que tem algum membro de exemplo.
 */
export async function pracasDoMundoDeExemplo(db: DB): Promise<Set<string>> {
  const { data: pessoasExemplo } = await db.from("profiles").select("user_id").eq("exemplo", true);
  const idsExemplo = new Set((pessoasExemplo ?? []).map((p) => p.user_id));
  if (idsExemplo.size === 0) return new Set();

  const [{ data: donos }, { data: membros }] = await Promise.all([
    db.from("workspaces").select("id, owner_id"),
    db.from("workspace_members").select("workspace_id, user_id"),
  ]);

  const out = new Set<string>();
  for (const w of donos ?? []) if (idsExemplo.has(w.owner_id)) out.add(w.id);
  for (const m of membros ?? []) if (idsExemplo.has(m.user_id)) out.add(m.workspace_id);
  return out;
}

/**
 * Praças do ator, no recorte que as regras de alcance precisam (id, cidade, UF
 * e se é do mundo de exemplo): do Administrador, as que ele integra
 * (`workspace_members`); do SysAdmin, todas. Outro papel não alcança nenhuma.
 */
export async function pracasDoAtor(db: DB, ator: CurrentUser): Promise<PracaParaAlcance[]> {
  if (ator.role !== "admin" && ator.role !== "sysadmin") return [];

  let query = db.from("workspaces").select("id, cidade, estado");
  if (ator.role === "admin") {
    const { data: membros } = await db.from("workspace_members").select("workspace_id").eq("user_id", ator.id);
    const ids = (membros ?? []).map((m) => m.workspace_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const { data: pracas, error } = await query;
  if (error || !pracas) return [];

  const pracasExemplo = await pracasDoMundoDeExemplo(db);
  return pracas.map((p) => ({ id: p.id, cidade: p.cidade, estado: p.estado, exemplo: pracasExemplo.has(p.id) }));
}

/** Pessoa-alvo de uma ação administrativa: papel, cidade/UF e a marca de exemplo. */
export interface PessoaAlvo {
  tipo_base: string;
  cidade: string | null;
  estado: string | null;
  exemplo: boolean;
}

/**
 * `true` se o ator alcança a pessoa, do papel pedido: o SysAdmin alcança
 * qualquer pessoa do mundo dele (`podeAgirSobre`); o Administrador, quem mora
 * na cidade de uma das praças dele, do mesmo mundo — a mesma regra do limite
 * de anúncios (`adminAlcancaPrestador`, espelho do banco), aplicada também a
 * cliente.
 */
export function atorAlcanca(
  ator: Pick<CurrentUser, "role" | "exemplo">,
  pracas: readonly PracaParaAlcance[],
  alvo: PessoaAlvo,
  papel: "prestador_servico" | "cliente",
): boolean {
  if (alvo.tipo_base !== papel) return false;
  if (!podeAgirSobre({ exemplo: Boolean(ator.exemplo) }, alvo)) return false;
  if (ator.role === "sysadmin") return true;
  if (ator.role !== "admin") return false;
  // Mesma regra de cidade/UF/mundo do anúncio, com o papel já conferido acima.
  return adminAlcancaPrestador({ exemplo: Boolean(ator.exemplo) }, pracas, { ...alvo, tipo_base: "prestador_servico" });
}
