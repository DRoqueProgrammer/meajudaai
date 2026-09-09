"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/**
 * Prestador oferece um horário na própria agenda (nasce como slot "livre").
 * RLS garante `prestador_id = auth.uid()` na escrita.
 */
export async function criarSlotAction(input: {
  data: string;
  horaInicio: string;
  horaFim: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só prestadores de serviço têm agenda." };
  if (input.horaFim <= input.horaInicio) return { ok: false, erro: "Horário final precisa ser depois do inicial." };

  const sb = await createServerClient();
  const { error } = await sb.from("agenda_slots").insert({
    prestador_id: w.user.id,
    data: input.data,
    hora_inicio: input.horaInicio,
    hora_fim: input.horaFim,
  });
  if (error) return { ok: false, erro: "Não foi possível criar o horário." };
  revalidatePath("/agenda");
  return { ok: true };
}

/**
 * Cliente reserva um slot livre — descreve o que precisa, o slot fica
 * "pendente" e nasce um serviço com o preço vigente do prestador naquele
 * instante (histórico não muda se o prestador reconfigurar o preço depois).
 */
export async function reservarSlotAction(input: {
  slotId: string;
  descricao: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "cliente") return { ok: false, erro: "Só clientes podem reservar um horário." };
  if (!input.descricao.trim()) return { ok: false, erro: "Descreva o que você precisa." };

  const sb = await createServerClient();
  const { data: slot, error: slotErr } = await sb
    .from("agenda_slots")
    .select("id, prestador_id, status")
    .eq("id", input.slotId)
    .maybeSingle();
  if (slotErr || !slot) return { ok: false, erro: "Horário não encontrado." };
  if (slot.status !== "livre") return { ok: false, erro: "Esse horário já foi reservado por outra pessoa." };

  const { data: perfil } = await sb
    .from("profiles")
    .select("preco_tipo, preco_valor")
    .eq("user_id", slot.prestador_id)
    .maybeSingle();
  if (!perfil?.preco_tipo || perfil.preco_valor == null) {
    return { ok: false, erro: "Esse prestador ainda não configurou o preço do serviço." };
  }

  const { error: updSlot } = await sb
    .from("agenda_slots")
    .update({ status: "pendente" })
    .eq("id", slot.id)
    .eq("status", "livre");
  if (updSlot) return { ok: false, erro: "Não foi possível reservar — tente de novo." };

  const { error: insServico } = await sb.from("servicos").insert({
    slot_id: slot.id,
    cliente_id: w.user.id,
    prestador_id: slot.prestador_id,
    descricao: input.descricao.trim(),
    preco_tipo: perfil.preco_tipo,
    preco_valor: perfil.preco_valor,
  });
  if (insServico) {
    await sb.from("agenda_slots").update({ status: "livre" }).eq("id", slot.id);
    return { ok: false, erro: "Não foi possível registrar o serviço." };
  }
  revalidatePath("/agenda");
  return { ok: true };
}

/** Prestador aceita o serviço pendente — slot e serviço passam a "confirmado". */
export async function confirmarServicoAction(servicoId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { data: servico } = await sb
    .from("servicos")
    .select("id, slot_id, prestador_id, status")
    .eq("id", servicoId)
    .maybeSingle();
  if (!servico || servico.prestador_id !== w.user.id) return { ok: false, erro: "Serviço não encontrado." };
  if (servico.status !== "pendente") return { ok: false, erro: "Esse serviço não está mais pendente." };

  const { error } = await sb.from("servicos").update({ status: "confirmado" }).eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível confirmar." };
  await sb.from("agenda_slots").update({ status: "confirmado" }).eq("id", servico.slot_id);
  revalidatePath("/agenda");
  return { ok: true };
}

/** Prestador registra uma observação privada sobre um serviço (só ele mesmo lê depois). */
export async function escreverLogServicoAction(input: {
  servicoId: string;
  texto: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (!input.texto.trim()) return { ok: false, erro: "Escreva alguma coisa antes de salvar." };

  const sb = await createServerClient();
  const { error } = await sb.from("servico_logs").insert({
    servico_id: input.servicoId,
    autor_id: w.user.id,
    texto: input.texto.trim(),
  });
  if (error) return { ok: false, erro: "Não foi possível salvar a observação." };
  revalidatePath("/agenda");
  return { ok: true };
}

/**
 * Cancela um serviço — exige justificativa (fica registrada em
 * `cancelado_motivo`). Cliente ou prestador podem cancelar; o slot volta a
 * ficar livre para outra pessoa reservar.
 */
export async function cancelarServicoAction(input: {
  servicoId: string;
  motivo: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (!input.motivo.trim()) return { ok: false, erro: "Informe uma justificativa para o cancelamento." };

  const sb = await createServerClient();
  const { data: servico } = await sb
    .from("servicos")
    .select("id, slot_id, cliente_id, prestador_id, status")
    .eq("id", input.servicoId)
    .maybeSingle();
  if (!servico || (servico.cliente_id !== w.user.id && servico.prestador_id !== w.user.id)) {
    return { ok: false, erro: "Serviço não encontrado." };
  }
  if (servico.status === "cancelado" || servico.status === "realizado") {
    return { ok: false, erro: "Esse serviço já foi encerrado." };
  }

  const { error } = await sb
    .from("servicos")
    .update({ status: "cancelado", cancelado_motivo: input.motivo.trim(), cancelado_em: new Date().toISOString() })
    .eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível cancelar." };
  await sb.from("agenda_slots").update({ status: "livre" }).eq("id", servico.slot_id);
  revalidatePath("/agenda");
  return { ok: true };
}
