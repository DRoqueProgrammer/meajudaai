"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  requireWorkspaceRole,
  getActiveWorkspace,
  getMyWorkspaces,
  ACTIVE_WS_COOKIE,
} from "@/lib/auth/workspace";
import { tryWriter } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";
import { campo, valoresPreservados, type EstadoForm } from "./form";

/** Troca a empresa ativa (seletor do admin com várias empresas). */
export async function setActiveWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  const list = await getMyWorkspaces();
  if (!list.some((w) => w.workspace_id === workspaceId)) {
    return { ok: false, erro: "Equipe inválida." };
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WS_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cria uma nova praça e o autor passa a ser owner dela (ativa em seguida).
 * ADR 0013, D-016: a porta 3 (o próprio Administrador cria praça pelo
 * seletor) fecha — só o sysadmin cria praça agora, por /admin/pracas
 * (criarPracaAction, lib/actions/pracas.ts, é o caminho novo e preferido).
 *
 * R-42 (ADR 0012, D-015): mesma decisão de criarPracaAction e criarAdminAction
 * — cria dado real, então nem um sysadmin de exemplo (o que qualquer
 * visitante abre pela landing) pode.
 */
export async function criarEmpresaAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const nome = campo(fd, "nome");
  const cidade = campo(fd, "cidade");
  const estado = campo(fd, "estado");

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.role !== "sysadmin") {
    return { erro: "Apenas o sysadmin cria praças — use /admin/pracas.", valores: preserva };
  }
  if (Boolean(user.exemplo)) return { erro: "Conta de exemplo não pode criar praças.", valores: preserva };
  const db = createAdminClient();
  const { data: ws, error } = await db
    .from("workspaces")
    .insert({ owner_id: user.id, nome: nome || "Nova equipe", cidade, estado })
    .select("id")
    .single();
  if (error || !ws) return { erro: "Não foi possível criar a equipe.", valores: preserva };
  await db.from("workspace_members").insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WS_COOKIE, ws.id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Exclui uma praça. Bloqueia enquanto houver vaga aberta ou diária
 * em andamento — tem candidato contando com elas; primeiro cancela ou finaliza.
 * Vagas já finalizadas/canceladas somem junto (histórico da equipe); as
 * avaliações sobrevivem (a FK de avaliacoes.vaga_id é SET NULL).
 * ADR 0013, D-016: deixa de valer para quem não é sysadmin — checado antes
 * de qualquer consulta, junto com a porta 3 que criarEmpresaAction também fecha.
 *
 * R-42 (ADR 0012, D-015): apaga dado real, então nem um sysadmin de exemplo
 * pode — mesma decisão de criarPracaAction e criarAdminAction, só que do lado
 * de apagar em vez de criar.
 */
export async function excluirEquipeAction(workspaceId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") return { ok: false, erro: "Apenas o sysadmin exclui praças." };
  if (Boolean(user.exemplo)) return { ok: false, erro: "Conta de exemplo não pode excluir praças." };

  const db = createAdminClient();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return { ok: false, erro: "Equipe não encontrada." };

  const { count } = await db
    .from("vagas")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["aberta", "em_andamento"]);
  if (count && count > 0) {
    return {
      ok: false,
      erro: "Cancele ou finalize as vagas abertas e em andamento antes de excluir a equipe.",
    };
  }

  const { error } = await db.from("workspaces").delete().eq("id", workspaceId);
  if (error) return { ok: false, erro: "Não foi possível excluir a equipe." };

  // Era a equipe ativa? Limpa o cookie para o layout reescolher (ou nenhuma).
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WS_COOKIE)?.value === workspaceId) {
    cookieStore.delete(ACTIVE_WS_COOKIE);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * O dono adiciona à equipe alguém que já tem conta, pelo e-mail. Diferente do
 * convite por link (lib/actions/convite.ts): aqui o vínculo é imediato, sem
 * token nem aprovação. Notifica o novo membro.
 */
export async function convidarMembroAction(
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const email = campo(fd, "convidar-email");
  const preserva = { "convidar-email": email };

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const ws = await getActiveWorkspace();
  if (!ws) return { erro: "Você não tem uma equipe.", valores: preserva };
  await requireWorkspaceRole(ws.workspace_id, ["owner"]);

  const db = createAdminClient();
  const { data: pii } = await db
    .from("profiles_pii")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
  if (!pii) {
    return {
      erro: "Nenhum usuário com este e-mail. Peça para se cadastrar primeiro.",
      valores: preserva,
    };
  }

  const { error } = await db
    .from("workspace_members")
    .insert({ workspace_id: ws.workspace_id, user_id: pii.user_id, role: "membro" });
  if (error) return { erro: "Este usuário já faz parte da equipe.", valores: preserva };

  await db.from("notificacoes").insert({
    user_id: pii.user_id,
    tipo: "convite_equipe",
    titulo: "Você entrou em uma equipe",
    mensagem: `Você agora faz parte de "${ws.nome}".`,
    link: "/equipe",
  });
  revalidatePath("/equipe");
  return { ok: true };
}
