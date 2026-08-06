import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "./roles";

export const ACTIVE_WS_COOKIE = "ws_ativo";

export interface WorkspaceRef {
  workspace_id: string;
  role: string;
  nome: string;
}

export async function getMyWorkspaces(): Promise<WorkspaceRef[]> {
  const user = await requireUser();
  const db = createAdminClient();
  const { data } = await db
    .from("workspace_members")
    .select("workspace_id, role, workspaces(nome)")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => ({
    workspace_id: r.workspace_id,
    role: r.role,
    nome: (r.workspaces as unknown as { nome: string } | null)?.nome ?? "",
  }));
}

/**
 * Empresa ativa do usuário — a escolhida no seletor (cookie ws_ativo),
 * validada contra as empresas de que ele participa; senão a primeira.
 * Suporta admin de várias empresas.
 */
export async function getActiveWorkspace(): Promise<WorkspaceRef | null> {
  const list = await getMyWorkspaces();
  if (list.length === 0) return null;
  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_WS_COOKIE)?.value;
  return list.find((w) => w.workspace_id === wanted) ?? list[0]!;
}

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
