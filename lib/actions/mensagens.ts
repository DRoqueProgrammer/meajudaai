"use server";

import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { MensagemSchema } from "@/lib/validation";
import { campo, type EstadoForm } from "./form";

/**
 * Envia uma mensagem numa conversa (form sem JS). Insere pelo client de sessão
 * — a RLS msg_insert_membro exige que o remetente seja membro da conversa — e
 * notifica os destinatários (todos menos o autor). Revalida para o caso sem Realtime.
 */
export async function enviarMensagemAction(
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const conteudo = campo(fd, "mensagem");
  const parsed = MensagemSchema.safeParse({
    conversaId: campo(fd, "conversaId"),
    conteudo,
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Mensagem inválida", valores: { mensagem: conteudo } };
  }
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: { mensagem: conteudo } };
  const user = w.user;
  const d = parsed.data;
  // Client de sessão: a policy msg_insert_membro exige que o remetente seja
  // membro da conversa — o que, na DM externa, já embute a capacidade
  // chat_ajudantes (ver is_conversa_membro na migration 0013).
  const sb = await createServerClient();
  const { error } = await sb.from("mensagens").insert({
    conversa_id: d.conversaId,
    remetente_id: user.id,
    conteudo: d.conteudo,
  });
  if (error) {
    return {
      erro: "Não foi possível enviar a mensagem nesta conversa.",
      valores: { mensagem: conteudo },
    };
  }

  const db = createAdminClient();
  const destinatarios = await destinatariosDe(d.conversaId, user.id);
  if (destinatarios.length) {
    await db.from("notificacoes").insert(
      destinatarios.map((uid) => ({
        user_id: uid,
        tipo: "mensagem_recebida",
        titulo: "Nova mensagem",
        mensagem: d.conteudo.slice(0, 80),
        link: `/chat/${d.conversaId}`,
      })),
    );
  }
  // Sem JavaScript o realtime não existe; revalidar faz a mensagem aparecer
  // no recarregamento que o POST nativo provoca.
  revalidatePath(`/chat/${d.conversaId}`);
  return { ok: true };
}

/** Quem deve ser notificado de uma mensagem, exceto o remetente. */
async function destinatariosDe(conversaId: string, remetenteId: string): Promise<string[]> {
  const db = createAdminClient();
  const { data: conv } = await db
    .from("conversas")
    .select("tipo, ajudante_id, workspace_id")
    .eq("id", conversaId)
    .single();
  if (!conv) return [];

  if (conv.tipo === "dm_externa") {
    if (remetenteId === conv.ajudante_id) {
      const { data: ws } = await db
        .from("workspaces")
        .select("owner_id")
        .eq("id", conv.workspace_id)
        .single();
      return ws ? [ws.owner_id] : [];
    }
    return conv.ajudante_id ? [conv.ajudante_id] : [];
  }

  if (conv.tipo === "dm_interna") {
    const { data: membros } = await db
      .from("conversa_membros")
      .select("user_id")
      .eq("conversa_id", conversaId);
    return (membros ?? []).map((m) => m.user_id).filter((id) => id !== remetenteId);
  }

  // canal_equipe: todos os membros da equipe.
  const { data: membros } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", conv.workspace_id);
  return (membros ?? []).map((m) => m.user_id).filter((id) => id !== remetenteId);
}
