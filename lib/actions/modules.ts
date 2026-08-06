"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { requireWorkspaceRole } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppModule, isCapability } from "@/lib/modules";
import type { ActionResult } from "./auth";

/**
 * Admin da empresa liga/desliga um módulo para um funcionário.
 * Contas demo (read-only) caem no tryWriter. Ver lib/auth/modules.
 */
export async function setModuloFuncionarioAction(
  funcionarioId: string,
  workspaceId: string,
  module: string,
  allowed: boolean,
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "admin" && user.role !== "sysadmin") {
    return { ok: false, erro: "Apenas o admin da empresa pode gerir módulos." };
  }
  if (!isAppModule(module) && !isCapability(module)) {
    return { ok: false, erro: "Módulo ou permissão inválidos." };
  }
  try {
    await requireWorkspaceRole(workspaceId, ["owner"]);
  } catch {
    return { ok: false, erro: "Sem permissão nesta empresa." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("user_modules")
    .upsert({ user_id: funcionarioId, workspace_id: workspaceId, module, allowed });
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/equipe");
  return { ok: true };
}
