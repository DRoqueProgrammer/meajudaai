"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/** Usuário sinaliza que procura uma categoria numa cidade (busca sem resultado). */
export async function registrarDemandaAction(categoria: string, cidade: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { error } = await sb.from("demanda_servico").upsert(
    { user_id: w.user.id, categoria, cidade },
    { onConflict: "user_id,categoria,cidade", ignoreDuplicates: true },
  );
  if (error) return { ok: false, erro: "Não foi possível registrar." };
  revalidatePath("/vagas");
  return { ok: true };
}

/** Sysadmin edita o texto e liga/desliga o banner da home. */
export async function salvarBannerAction(texto: string, ativo: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "sysadmin") return { ok: false, erro: "Sem permissão." };
  const sb = await createServerClient();
  const { error } = await sb
    .from("home_banner")
    .upsert({ id: 1, texto, ativo, updated_by: w.user.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath("/inicio");
  revalidatePath("/admin/demanda");
  return { ok: true };
}
