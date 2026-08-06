"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { DenunciaSchema } from "@/lib/validation";
import type { ActionResult } from "./auth";

const DENUNCIA_STATUS = ["aberta", "em_analise", "resolvida", "descartada"] as const;
export type DenunciaStatus = (typeof DENUNCIA_STATUS)[number];

/**
 * Cria uma denúncia. Usa o client de sessão de propósito: a policy
 * denuncias_insert_self (0007) já força `denunciante_id = auth.uid()`, então
 * ninguém consegue denunciar em nome de outra pessoa nem forjar o autor.
 *
 * O denunciante é ANÔNIMO para o denunciado — `denunciante_id` fica gravado,
 * mas só a moderação (sysadmin) o vê. Nenhuma tela do lado do denunciado pode
 * expor esse campo: se o ajudante achar que o nome dele aparece, ninguém
 * denuncia "não pagou a diária" uma segunda vez.
 */
export async function criarDenunciaAction(input: unknown): Promise<ActionResult> {
  const parsed = DenunciaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Selecione um motivo." };
  }
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  const d = parsed.data;

  if (d.alvo_tipo === "usuario" && d.alvo_id === user.id) {
    return { ok: false, erro: "Você não pode denunciar a si mesmo." };
  }

  const sb = await createServerClient();
  const { error } = await sb.from("denuncias").insert({
    denunciante_id: user.id,
    alvo_tipo: d.alvo_tipo,
    alvo_id: d.alvo_id,
    motivo: d.motivo,
    detalhe: d.detalhe?.trim() || null,
  });
  if (error) return { ok: false, erro: "Não foi possível enviar a denúncia. Tente de novo." };

  revalidatePath("/admin/denuncias");
  return { ok: true };
}

/**
 * Modera uma denúncia — apenas administradores (não-demo).
 * Contas demo caem no tryWriter (read-only). Ver lib/auth/guard.
 */
export async function moderarDenunciaAction(
  id: string,
  status: DenunciaStatus,
  resolucao?: string,
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") {
    return { ok: false, erro: "Apenas a administração da plataforma pode moderar denúncias." };
  }
  if (!DENUNCIA_STATUS.includes(status)) {
    return { ok: false, erro: "Status inválido." };
  }

  const db = createAdminClient();
  const encerrada = status === "resolvida" || status === "descartada";
  const { error } = await db
    .from("denuncias")
    .update({
      status,
      resolucao: resolucao?.trim() || null,
      resolvido_por: encerrada ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, erro: "Não foi possível atualizar a denúncia." };
  revalidatePath("/admin/denuncias");
  return { ok: true };
}
