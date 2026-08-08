"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { getActiveWorkspace, requireWorkspaceRole } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { podeAceitar } from "@/lib/convite-status";
import type { ActionResult } from "./auth";

/** Sócio (owner) gera um link de convite com o papel escolhido. */
export async function criarConviteAction(
  role: "owner" | "membro",
): Promise<{ ok: boolean; link?: string; erro?: string }> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const ws = await getActiveWorkspace();
  if (!ws) return { ok: false, erro: "Você não tem uma equipe." };
  try {
    await requireWorkspaceRole(ws.workspace_id, ["owner"]);
  } catch {
    return { ok: false, erro: "Só o dono da equipe pode convidar." };
  }
  const db = createAdminClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await db
    .from("invite")
    .insert({ token, workspace_id: ws.workspace_id, role, created_by: w.user.id });
  if (error) return { ok: false, erro: "Não foi possível gerar o convite." };
  return { ok: true, link: `/convite/${token}` };
}

/** Usuário logado aceita um convite (fica pendente de aprovação). */
export async function aceitarConviteAction(token: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: inv } = await db
    .from("invite")
    .select("id, status, expires_at, created_by")
    .eq("token", token)
    .maybeSingle();
  if (!inv || !podeAceitar(inv, new Date())) return { ok: false, erro: "Convite inválido ou expirado." };
  await db
    .from("invite")
    .update({ status: "aceito", accepted_by: w.user.id, accepted_at: new Date().toISOString() })
    .eq("id", inv.id);
  await db.from("notificacoes").insert({
    user_id: inv.created_by,
    tipo: "convite_aceito",
    titulo: "Alguém aceitou seu convite",
    mensagem: "Aprove o novo membro em Equipe.",
    link: "/equipe",
  });
  return { ok: true };
}

/** Sócio aprova um convite aceito → o usuário entra em workspace_members. */
export async function aprovarConviteAction(inviteId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: inv } = await db
    .from("invite")
    .select("id, status, workspace_id, role, accepted_by")
    .eq("id", inviteId)
    .maybeSingle();
  if (!inv || inv.status !== "aceito" || !inv.accepted_by) return { ok: false, erro: "Convite inválido." };
  try {
    await requireWorkspaceRole(inv.workspace_id, ["owner"]);
  } catch {
    return { ok: false, erro: "Sem permissão." };
  }
  await db
    .from("workspace_members")
    .insert({ workspace_id: inv.workspace_id, user_id: inv.accepted_by, role: inv.role });
  await db.from("invite").update({ status: "aprovado" }).eq("id", inviteId);
  await db.from("notificacoes").insert({
    user_id: inv.accepted_by,
    tipo: "convite_aprovado",
    titulo: "Você entrou na equipe",
    mensagem: "Seu acesso foi aprovado.",
    link: "/equipe",
  });
  revalidatePath("/equipe");
  return { ok: true };
}

/** Sócio recusa um convite aceito. */
export async function recusarConviteAction(inviteId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: inv } = await db
    .from("invite")
    .select("id, status, workspace_id")
    .eq("id", inviteId)
    .maybeSingle();
  if (!inv || inv.status !== "aceito") return { ok: false, erro: "Convite inválido." };
  try {
    await requireWorkspaceRole(inv.workspace_id, ["owner"]);
  } catch {
    return { ok: false, erro: "Sem permissão." };
  }
  await db.from("invite").update({ status: "recusado" }).eq("id", inviteId);
  revalidatePath("/equipe");
  return { ok: true };
}
