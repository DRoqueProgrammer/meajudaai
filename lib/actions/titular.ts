"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log";
import type { ActionResult } from "./auth";

/**
 * Direito do titular de pedir exclusão dos próprios dados (LGPD art. 18, VI;
 * decisão D-023): a pessoa pede, tem 7 dias de carência para desistir, e o
 * cron (`app/api/cron/titular/route.ts`) anonimiza (`lib/titular/anonimizar.ts`)
 * quem passou desse prazo — nunca deleta ninguém (ROADMAP.md §3). O ator é
 * SEMPRE quem está logado (`tryWriter`); nenhuma das duas actions recebe um
 * id de usuário do formulário — pedir ou desistir em nome de outra pessoa
 * nunca é uma opção aqui.
 */

/** Registra o pedido de exclusão do usuário logado. Idempotente: pedir de novo com um pedido pendente não duplica. */
export async function solicitarExclusaoAction(): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;

  // R-42, mundo de exemplo (D-015): a conta de exemplo é reaberta por
  // qualquer visitante que clique no botão da landing — se ela pudesse pedir
  // exclusão, seria vandalismo (o próximo visitante perderia a demonstração).
  if (user.exemplo) {
    return {
      ok: false,
      erro: "Esta é uma conta de demonstração, reaberta por qualquer visitante — ela não pode pedir exclusão de dados.",
    };
  }

  const sb = await createServerClient();

  // Pedido já em andamento: trata o clique como bem-sucedido em vez de
  // devolver erro — a pessoa só queria confirmar que está pedindo, e já está.
  const { data: pendente } = await sb
    .from("pedidos_exclusao")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pendente")
    .maybeSingle();
  if (pendente) return { ok: true };

  const { error } = await sb.from("pedidos_exclusao").insert({ user_id: user.id });
  if (error) {
    // 23505: dois cliques em paralelo perderam a corrida contra o índice
    // único de pedido pendente (migration 0042) — mesmo resultado prático.
    if (error.code === "23505") return { ok: true };
    logAction("solicitar_exclusao", { userId: user.id, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível registrar o pedido. Tente de novo." };
  }

  logAction("solicitar_exclusao", { userId: user.id, result: "ok" });
  revalidatePath("/perfil/editar");
  return { ok: true };
}

/** Desiste do pedido de exclusão pendente do usuário logado (dentro dos 7 dias de carência). */
export async function desistirDaExclusaoAction(): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  const sb = await createServerClient();

  const { data: pendente } = await sb
    .from("pedidos_exclusao")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pendente")
    .maybeSingle();
  if (!pendente) {
    return { ok: false, erro: "Você não tem um pedido de exclusão pendente." };
  }

  const { error } = await sb
    .from("pedidos_exclusao")
    .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
    .eq("id", pendente.id);
  if (error) {
    logAction("desistir_exclusao", { userId: user.id, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível desistir agora. Tente de novo." };
  }

  logAction("desistir_exclusao", { userId: user.id, result: "ok" });
  revalidatePath("/perfil/editar");
  return { ok: true };
}
