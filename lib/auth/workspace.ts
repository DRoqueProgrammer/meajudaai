import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "./roles";
import { escolherPracaAtiva } from "./praca-ativa";

export const ACTIVE_WS_COOKIE = "ws_ativo";

export interface WorkspaceRef {
  workspace_id: string;
  role: string;
  nome: string;
  /** Praça padrão do Administrador entre as vinculadas pelo SysAdmin (R-47, D-016). */
  padrao: boolean;
}

/** Todas as praças de que o usuário logado participa (id, papel, nome e se é a padrão dele). */
export async function getMyWorkspaces(): Promise<WorkspaceRef[]> {
  const user = await requireUser();
  const db = createAdminClient();
  const { data } = await db
    .from("workspace_members")
    .select("workspace_id, role, padrao, workspaces(nome)")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => ({
    workspace_id: r.workspace_id,
    role: r.role,
    nome: (r.workspaces as unknown as { nome: string } | null)?.nome ?? "",
    padrao: r.padrao,
  }));
}

/**
 * Praça ativa do usuário — a do cookie do seletor (ws_ativo) se for uma das
 * que ele participa; senão a padrão vinculada pelo SysAdmin; senão a
 * primeira da lista (regra pura em escolherPracaAtiva, R-48/R-49, D-016).
 */
export async function getActiveWorkspace(): Promise<WorkspaceRef | null> {
  const list = await getMyWorkspaces();
  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_WS_COOKIE)?.value;
  return escolherPracaAtiva(list, wanted);
}

/** Guard: lança se o usuário não tiver um dos papéis exigidos na empresa. Sysadmin passa sempre. */
export async function requireWorkspaceRole(
  workspaceId: string,
  roles: string[],
): Promise<void> {
  const user = await requireUser();
  if (user.role === "sysadmin") return;
  const db = createAdminClient();
  const { data } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data || !roles.includes(data.role)) {
    throw new Error("Forbidden — sem permissão neste workspace");
  }
}

/**
 * `true` se o usuário tem vínculo (linha em `workspace_members`) com a
 * empresa — usada para recusar liberação de módulo pra quem não é membro
 * dela (R-45, ADR 0014): a liberação só vale, e só é concedida, dentro da
 * empresa a que a pessoa pertence.
 */
export async function ehMembroDaEmpresa(
  db: SupabaseClient<Database>,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const { data } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}
