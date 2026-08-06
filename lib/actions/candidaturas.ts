"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { requireWorkspaceRole } from "@/lib/auth/workspace";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDmExterna } from "@/lib/actions/conversas";
import type { ActionResult } from "./auth";

export async function candidatarAction(vagaId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  // Client de sessão: a policy cand_insert_self (0010) exige vaga aberta e
  // impede que o gestor se candidate à própria vaga.
  const sb = await createServerClient();
  const { error } = await sb
    .from("candidaturas")
    .insert({ vaga_id: vagaId, ajudante_id: user.id })
    .select("id")
    .single();
  if (error) {
    return {
      ok: false,
      erro:
        error.code === "23505"
          ? "Você já se candidatou a esta vaga."
          : "Esta vaga não está mais aberta para candidaturas.",
    };
  }

  const db = createAdminClient();
  const { data: vaga } = await db
    .from("vagas")
    .select("criado_por, titulo")
    .eq("id", vagaId)
    .single();
  if (vaga) {
    await db.from("notificacoes").insert({
      user_id: vaga.criado_por,
      tipo: "nova_candidatura",
      titulo: "Nova candidatura",
      mensagem: `Você recebeu uma candidatura para "${vaga.titulo}".`,
      link: `/minhas-vagas/${vagaId}/candidatos`,
    });
  }
  revalidatePath("/vagas");
  revalidatePath("/minhas-diarias");
  return { ok: true };
}

/**
 * O ajudante retira a própria candidatura. Usa o client de sessão: a policy
 * cand_update_self (0003) já restringe a linha a `ajudante_id = auth.uid()`,
 * então não há motivo para escalar para service role.
 * Só vale enquanto está `aguardando` — depois de aceito, desmarcar é combinado
 * no chat, não um botão que deixa o profissional sem ajudante na véspera.
 */
export async function cancelarCandidaturaAction(candidaturaId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { data, error } = await sb
    .from("candidaturas")
    .update({ status: "cancelado" })
    .eq("id", candidaturaId)
    .eq("status", "aguardando")
    .select("id, vaga_id")
    .maybeSingle();
  if (error) return { ok: false, erro: "Não foi possível retirar a candidatura." };
  if (!data) {
    return {
      ok: false,
      erro: "Esta candidatura já foi respondida. Fale com o profissional pelo chat.",
    };
  }
  revalidatePath("/vagas");
  revalidatePath("/minhas-diarias");
  revalidatePath(`/vagas/${data.vaga_id}`);
  return { ok: true };
}

export async function responderCandidaturaAction(
  candidaturaId: string,
  decisao: "aceito" | "recusado",
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: c } = await db
    .from("candidaturas")
    .select("id, vaga_id, ajudante_id, vagas(workspace_id, titulo)")
    .eq("id", candidaturaId)
    .single();
  if (!c) return { ok: false, erro: "Candidatura não encontrada." };
  const vaga = c.vagas as unknown as { workspace_id: string; titulo: string };
  await requireWorkspaceRole(vaga.workspace_id, ["owner", "membro"]);

  await db.from("candidaturas").update({ status: decisao }).eq("id", candidaturaId);
  let chatLink = `/vagas/${c.vaga_id}`;
  if (decisao === "aceito") {
    await db.from("vagas").update({ status: "em_andamento" }).eq("id", c.vaga_id);
    // Cria (ou reaproveita) a DM externa equipe↔ajudante — persiste entre diárias.
    const conversaId = await ensureDmExterna(vaga.workspace_id, c.ajudante_id);
    chatLink = `/chat/${conversaId}`;
  }
  await db.from("notificacoes").insert({
    user_id: c.ajudante_id,
    tipo: decisao === "aceito" ? "candidatura_aceita" : "candidatura_recusada",
    titulo: decisao === "aceito" ? "Você foi aceito!" : "Candidatura não aceita",
    mensagem:
      decisao === "aceito"
        ? `Abra o chat para combinar a diária de "${vaga.titulo}".`
        : `A vaga "${vaga.titulo}" seguiu com outro ajudante.`,
    link: chatLink,
  });
  revalidatePath(`/minhas-vagas/${c.vaga_id}/candidatos`);
  return { ok: true };
}
