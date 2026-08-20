"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { requireModule, requireCapability } from "@/lib/auth/modules";
import { requireWorkspaceRole, getActiveWorkspace } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { VagaSchema } from "@/lib/validation";
import { geocodeAddress } from "./geocode";
import { redirect } from "next/navigation";
import { campo, valoresPreservados, type EstadoForm } from "./form";
import type { ActionResult } from "./auth";

/**
 * Publica uma vaga (form sem JS). Valida com Zod, checa módulo/capacidade e
 * papel na empresa ativa, grava a vaga e — havendo pino — a coordenada exata
 * (vaga_local) mais a aproximada arredondada; sem pino, geocoda só o aproximado.
 * Ao final redireciona para a vaga recém-criada.
 */
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

  const localLat = Number(campo(fd, "local_lat")) || null;
  const localLng = Number(campo(fd, "local_lng")) || null;
  if (localLat && localLng) {
    const arred = (n: number) => Math.round(n * 100) / 100; // ~1,1 km
    await db.from("vaga_local").insert({ vaga_id: data.id, lat: localLat, lng: localLng });
    await db
      .from("vagas")
      .update({ local_aprox_lat: arred(localLat), local_aprox_lng: arred(localLng) })
      .eq("id", data.id);
  } else {
    // Sem pino: geocoda bairro/cidade só para a localização APROXIMADA (sem exato).
    const hits = await geocodeAddress(`${d.bairro ?? ""} ${d.cidade}, Brasil`.trim());
    if (hits[0]) {
      await db
        .from("vagas")
        .update({ local_aprox_lat: hits[0].lat, local_aprox_lng: hits[0].lng })
        .eq("id", data.id);
    }
  }

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

  const localLat = Number(campo(fd, "local_lat")) || null;
  const localLng = Number(campo(fd, "local_lng")) || null;
  if (localLat && localLng) {
    const arred = (n: number) => Math.round(n * 100) / 100;
    await db.from("vaga_local").upsert({ vaga_id: vagaId, lat: localLat, lng: localLng });
    await db
      .from("vagas")
      .update({ local_aprox_lat: arred(localLat), local_aprox_lng: arred(localLng) })
      .eq("id", vagaId);
  }

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

/**
 * Muda o status da vaga (gestor da empresa). Efeitos colaterais por transição:
 * `cancelada` notifica os candidatos em jogo; `finalizada` avisa o ajudante
 * aceito para avaliar. Revalida as listas afetadas.
 */
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
