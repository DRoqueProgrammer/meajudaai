"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/**
 * Marca/desmarca um dia como indisponível para o ajudante. Client de sessão: a
 * RLS de `bloqueio_agenda` já garante `ajudante_id = auth.uid()`. Conta demo é
 * read-only (tryWriter) — o bloqueio é compartilhado entre visitantes da conta.
 */
export async function alternarBloqueioAction(data: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { data: existe } = await sb
    .from("bloqueio_agenda")
    .select("data")
    .eq("ajudante_id", w.user.id)
    .eq("data", data)
    .maybeSingle();

  if (existe) {
    await sb.from("bloqueio_agenda").delete().eq("ajudante_id", w.user.id).eq("data", data);
  } else {
    const { error } = await sb.from("bloqueio_agenda").insert({ ajudante_id: w.user.id, data });
    if (error) return { ok: false, erro: "Não foi possível salvar o bloqueio." };
  }
  revalidatePath("/agenda");
  return { ok: true };
}
