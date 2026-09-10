"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { requireWorkspaceRole, ehMembroDaEmpresa } from "@/lib/auth/workspace";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppModule, isCapability } from "@/lib/modules";
import type { ActionResult } from "./auth";

/**
 * Admin da empresa liga/desliga um módulo para um funcionário. Recusa antes
 * de escrever se o alvo não é membro da empresa informada (R-45, ADR 0014) —
 * sem essa conferência, o dono de UMA empresa liberaria módulo pra gente que
 * nem participa dela. Contas demo (read-only) caem no tryWriter. Ver
 * lib/auth/modules.
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

  // R-42 (ADR 0012, D-015): o sysadmin passa por requireWorkspaceRole sem
  // vínculo nenhum — sem esta conferência, o SysAdmin de exemplo (aberto por
  // qualquer visitante) gerenciaria módulo de quem não é de exemplo. Campo
  // ausente em `user` ou no alvo conta como "não é de exemplo".
  const { data: alvo, error: alvoErr } = await db
    .from("profiles")
    .select("exemplo")
    .eq("user_id", funcionarioId)
    .maybeSingle();
  if (alvoErr || !alvo) return { ok: false, erro: "Funcionário não encontrado." };
  if (!podeAgirSobre({ exemplo: Boolean(user.exemplo) }, alvo)) {
    return { ok: false, erro: "Conta de exemplo não pode gerir módulos de quem não é de exemplo." };
  }

  // R-45 (ADR 0014): a liberação só vale, e só é concedida, pra quem é
  // membro desta empresa — nunca pra alguém de fora dela.
  if (!(await ehMembroDaEmpresa(db, funcionarioId, workspaceId))) {
    return { ok: false, erro: "O funcionário não é membro desta empresa." };
  }

  const { error } = await db
    .from("user_modules")
    .upsert({ user_id: funcionarioId, workspace_id: workspaceId, module, allowed });
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/equipe");
  return { ok: true };
}
