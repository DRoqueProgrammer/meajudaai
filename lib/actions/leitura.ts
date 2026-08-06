"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marcar como lido é escrita de leitura: acontece só por abrir a tela, e vale
 * inclusive para conta demo (não altera dado de ninguém, só o próprio "já vi").
 * Por isso NÃO passa por `tryWriter`.
 */
export async function marcarNotificacoesVistasAction(): Promise<void> {
  const user = await requireUser();
  const db = createAdminClient();
  await db
    .from("notificacoes")
    .update({ visualizada: true })
    .eq("user_id", user.id)
    .eq("visualizada", false);
  revalidatePath("/", "layout");
}

/**
 * Marca a conversa como lida até agora (cursor em conversa_membros.lido_ate).
 * Usa client admin: a linha pode não existir ainda para membros implícitos
 * (canal da equipe / lado-equipe da DM externa), então o upsert cria o cursor.
 */
export async function marcarMensagensLidasAction(conversaId: string): Promise<void> {
  const user = await requireUser();
  const db = createAdminClient();
  await db
    .from("conversa_membros")
    .upsert({ conversa_id: conversaId, user_id: user.id, lido_ate: new Date().toISOString() });
  revalidatePath("/", "layout");
}
