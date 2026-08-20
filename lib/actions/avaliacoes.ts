"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AvaliacaoSchema } from "@/lib/validation";
import { redirect } from "next/navigation";
import { campo, valoresPreservados, type EstadoForm } from "./form";
import type { ActionResult } from "./auth";

/**
 * Registra uma avaliação (1–5 estrelas) de uma diária. Insere pelo client de
 * sessão — a RLS exige que os dois tenham trabalhado juntos e barra
 * auto-avaliação; o trigger recalcula a média do avaliado. Notifica e volta às diárias.
 */
export async function avaliarAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const parsed = AvaliacaoSchema.safeParse({
    vagaId: campo(fd, "vagaId"),
    avaliadoId: campo(fd, "avaliadoId"),
    nota: campo(fd, "nota"),
    comentario: campo(fd, "comentario"),
  });
  if (!parsed.success) {
    const erro = parsed.error.issues[0]?.path[0] === "nota"
      ? "Toque nas estrelas para dar sua nota."
      : (parsed.error.issues[0]?.message ?? "Dados inválidos");
    return { erro, valores: preserva };
  }
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  const d = parsed.data;

  // Client de sessão: a policy aval_insert_self (0010) exige que os dois tenham
  // participado da diária e barra a auto-avaliação.
  const sb = await createServerClient();
  const { error } = await sb.from("avaliacoes").insert({
    vaga_id: d.vagaId,
    avaliador_id: user.id,
    avaliado_id: d.avaliadoId,
    nota: d.nota,
    comentario: d.comentario ?? null,
  });
  if (error) {
    return {
      erro:
        error.code === "23505"
          ? "Você já avaliou esta pessoa nesta diária."
          : "Só é possível avaliar quem trabalhou com você nesta diária.",
      valores: preserva,
    };
  }

  const db = createAdminClient();
  await db.from("notificacoes").insert({
    user_id: d.avaliadoId,
    tipo: "avaliacao_recebida",
    titulo: "Você recebeu uma avaliação",
    mensagem: `Nota ${d.nota} de 5.`,
    link: `/perfil/${d.avaliadoId}`,
  });
  revalidatePath(`/perfil/${d.avaliadoId}`);
  redirect("/minhas-diarias");
}
