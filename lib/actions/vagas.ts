"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { requireModule, requireCapability } from "@/lib/auth/modules";
import { requireWorkspaceRole, getActiveWorkspace } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { VagaSchema } from "@/lib/validation";
import { redirect } from "next/navigation";
import { campo, valoresPreservados, type EstadoForm } from "./form";
import type { ActionResult } from "./auth";

export async function publicarVagaAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const parsed = VagaSchema.safeParse({
    titulo: campo(fd, "titulo"),
    categoria: campo(fd, "categoria"),
    descricao: campo(fd, "descricao"),
    cidade: campo(fd, "cidade"),
    bairro: campo(fd, "bairro"),
    data_servico: campo(fd, "data_servico"),
    hora_inicio: campo(fd, "hora_inicio"),
    valor_diaria: campo(fd, "valor_diaria") || "0",
    quantidade_vagas: campo(fd, "quantidade_vagas") || "1",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos", valores: preserva };
  }
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  await requireModule("vagas");
  const ws = await getActiveWorkspace();
  if (!ws) {
    return { erro: "Você precisa ter um perfil de profissional para publicar.", valores: preserva };
  }
  await requireWorkspaceRole(ws.workspace_id, ["owner", "membro"]);
  try {
    await requireCapability("publicar_vagas", ws.workspace_id);
  } catch {
    return {
      erro: "Você não tem permissão para publicar vagas nesta equipe. Peça a liberação ao responsável.",
      valores: preserva,
    };
  }

  const d = parsed.data;
  const db = createAdminClient();
  const { data, error } = await db
    .from("vagas")
    .insert({
      workspace_id: ws.workspace_id,
      criado_por: user.id,
      titulo: d.titulo,
      categoria: d.categoria,
      descricao: d.descricao ?? null,
      cidade: d.cidade,
      bairro: d.bairro ?? null,
      cep: d.cep ?? null,
      data_servico: d.data_servico || null,
      hora_inicio: d.hora_inicio || null,
      valor_diaria: d.valor_diaria,
      quantidade_vagas: d.quantidade_vagas,
    })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível publicar a vaga.", valores: preserva };
  revalidatePath("/minhas-vagas");
  revalidatePath("/vagas");

  // Vai para a vaga recém-criada, não para a lista: o profissional acabou de
  // comprometer dinheiro e um dia de obra, e precisa ver o que foi para o ar
  // exatamente como o ajudante vai ver. O redirect sai do cliente para o
  // servidor — assim o fluxo fecha mesmo sem JavaScript.
  redirect(`/vagas/${data.id}?publicada=1`);
}

/**
 * Edita uma vaga ainda aberta, reusando a mesma validação da publicação. Se a
 * data ou o valor mudam, os candidatos em jogo são avisados: aceitaram um
 * combinado, e mudar em silêncio quebra a confiança que o app vende.
 */
export async function editarVagaAction(
  vagaId: string,
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const parsed = VagaSchema.safeParse({
    titulo: campo(fd, "titulo"),
    categoria: campo(fd, "categoria"),
    descricao: campo(fd, "descricao"),
    cidade: campo(fd, "cidade"),
    bairro: campo(fd, "bairro"),
    data_servico: campo(fd, "data_servico"),
    hora_inicio: campo(fd, "hora_inicio"),
    valor_diaria: campo(fd, "valor_diaria") || "0",
    quantidade_vagas: campo(fd, "quantidade_vagas") || "1",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos", valores: preserva };
  }
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  await requireModule("vagas");

  const db = createAdminClient();
  const { data: vaga } = await db
    .from("vagas")
    .select("workspace_id, status, data_servico, valor_diaria")
    .eq("id", vagaId)
    .single();
  if (!vaga) return { erro: "Vaga não encontrada.", valores: preserva };
  if (vaga.status !== "aberta") {
    return { erro: "Só dá para editar uma diária que ainda está aberta.", valores: preserva };
  }
  await requireWorkspaceRole(vaga.workspace_id, ["owner", "membro"]);
  try {
    await requireCapability("publicar_vagas", vaga.workspace_id);
  } catch {
    return { erro: "Você não tem permissão para gerir vagas nesta equipe.", valores: preserva };
  }

  const d = parsed.data;
  const { error } = await db
    .from("vagas")
    .update({
      titulo: d.titulo,
      categoria: d.categoria,
      descricao: d.descricao ?? null,
      cidade: d.cidade,
      bairro: d.bairro ?? null,
      data_servico: d.data_servico || null,
      hora_inicio: d.hora_inicio || null,
      valor_diaria: d.valor_diaria,
      quantidade_vagas: d.quantidade_vagas,
    })
    .eq("id", vagaId);
  if (error) return { erro: "Não foi possível salvar as alterações.", valores: preserva };

  // Só avisa quando muda o que a pessoa aceitou: data ou valor. Corrigir um
  // título ou a descrição não muda o combinado — não vira notificação.
  const dataMudou = (d.data_servico || null) !== vaga.data_servico;
  const valorMudou = Number(d.valor_diaria) !== Number(vaga.valor_diaria);
  if (dataMudou || valorMudou) {
    const { data: cands } = await db
      .from("candidaturas")
      .select("ajudante_id")
      .eq("vaga_id", vagaId)
      .in("status", ["aguardando", "aceito"]);
    if (cands?.length) {
      const oQueMudou = dataMudou && valorMudou ? "a data e o valor" : valorMudou ? "o valor" : "a data";
      await db.from("notificacoes").insert(
        cands.map((c) => ({
          user_id: c.ajudante_id,
          tipo: "vaga_alterada",
          titulo: "Diária atualizada",
          mensagem: `O profissional mudou ${oQueMudou} da diária "${d.titulo}". Confira antes de seguir.`,
          link: `/vagas/${vagaId}`,
        })),
      );
    }
  }

  revalidatePath("/minhas-vagas");
  revalidatePath("/vagas");
  revalidatePath(`/vagas/${vagaId}`);
  revalidatePath(`/minhas-vagas/${vagaId}/candidatos`);
  redirect(`/minhas-vagas/${vagaId}/candidatos`);
}

export async function mudarStatusVagaAction(
  vagaId: string,
  status: "aberta" | "em_andamento" | "finalizada" | "cancelada",
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const db = createAdminClient();
  const { data: vaga } = await db
    .from("vagas")
    .select("workspace_id, titulo")
    .eq("id", vagaId)
    .single();
  if (!vaga) return { ok: false, erro: "Vaga não encontrada." };
  await requireWorkspaceRole(vaga.workspace_id, ["owner", "membro"]);
  await db.from("vagas").update({ status }).eq("id", vagaId);

  // Quem se candidatou contava com essa diária: cancelar sem avisar deixa a
  // pessoa esperando por um serviço que não existe mais.
  if (status === "cancelada") {
    const { data: cands } = await db
      .from("candidaturas")
      .select("ajudante_id")
      .eq("vaga_id", vagaId)
      .in("status", ["aguardando", "aceito"]);
    if (cands?.length) {
      await db.from("notificacoes").insert(
        cands.map((c) => ({
          user_id: c.ajudante_id,
          tipo: "vaga_cancelada",
          titulo: "Diária cancelada",
          mensagem: `O profissional cancelou a diária "${vaga.titulo}".`,
          link: "/minhas-diarias",
        })),
      );
    }
  }

  // Concluir libera a avaliação dos dois lados — o ajudante precisa saber que
  // chegou a vez dele, senão a reputação nunca se forma.
  if (status === "finalizada") {
    const { data: aceito } = await db
      .from("candidaturas")
      .select("ajudante_id")
      .eq("vaga_id", vagaId)
      .eq("status", "aceito")
      .maybeSingle();
    if (aceito) {
      await db.from("notificacoes").insert({
        user_id: aceito.ajudante_id,
        tipo: "diaria_concluida",
        titulo: "Diária concluída",
        mensagem: `"${vaga.titulo}" foi finalizada. Avalie como foi trabalhar nessa obra.`,
        link: `/avaliar/${vagaId}`,
      });
    }
  }

  revalidatePath("/minhas-vagas");
  revalidatePath("/vagas");
  revalidatePath("/minhas-diarias");
  return { ok: true };
}
