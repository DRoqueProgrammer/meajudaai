"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/** SysAdmin comenta um serviço — privado por padrão, público se marcado (ROADMAP.md §6.4). */
export async function comentarServicoAction(input: {
  servicoId: string;
  texto: string;
  publico: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "sysadmin") return { ok: false, erro: "Só o SysAdmin pode comentar." };
  if (!input.texto.trim()) return { ok: false, erro: "Escreva um comentário." };

  const sb = await createServerClient();
  const { error } = await sb.from("servico_comentarios_admin").insert({
    servico_id: input.servicoId,
    autor_id: user.id,
    texto: input.texto.trim(),
    publico: input.publico,
  });
  if (error) return { ok: false, erro: "Não foi possível salvar o comentário." };
  revalidatePath("/admin/servicos");
  revalidatePath("/clientes");
  revalidatePath("/meus-servicos");
  return { ok: true };
}
