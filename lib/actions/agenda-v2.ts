"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Prestador oferece um bloco recorrente de horários: escolhe um intervalo de
 * datas, quais dias da semana valem (ex.: segunda a sábado) e uma faixa de
 * hora — um slot "livre" é criado pra cada data que cair num dia marcado.
 */
export async function criarSlotsRecorrentesAction(input: {
  dataInicio: string;
  dataFim: string;
  diasSemana: number[]; // 0=domingo … 6=sábado
  horaInicio: string;
  horaFim: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só prestadores de serviço têm agenda." };
  if (input.horaFim <= input.horaInicio) return { ok: false, erro: "Horário final precisa ser depois do inicial." };
  if (input.diasSemana.length === 0) return { ok: false, erro: "Escolha pelo menos um dia da semana." };
  if (input.dataFim < input.dataInicio) return { ok: false, erro: "Data final precisa ser depois da inicial." };

  const dias = new Set(input.diasSemana);
  const datas: string[] = [];
  const cursor = new Date(`${input.dataInicio}T00:00:00`);
  const fim = new Date(`${input.dataFim}T00:00:00`);
  // Teto de 90 dias por lote — evita gerar milhares de linhas por engano.
  for (let i = 0; i < 90 && cursor <= fim; i++, cursor.setDate(cursor.getDate() + 1)) {
    if (dias.has(cursor.getDay())) datas.push(cursor.toLocaleDateString("sv-SE"));
  }
  if (datas.length === 0) return { ok: false, erro: "Nenhuma data no intervalo cai nos dias escolhidos." };

  const sb = await createServerClient();
  const { error } = await sb.from("agenda_slots").insert(
    datas.map((data) => ({
      prestador_id: w.user.id,
      data,
      hora_inicio: input.horaInicio,
      hora_fim: input.horaFim,
    })),
  );
  if (error) return { ok: false, erro: "Não foi possível criar os horários." };
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

/** Prestador propõe um novo valor pro serviço — fica pendente até o cliente aceitar ou recusar. */
export async function proporRenegociacaoAction(input: { servicoId: string; novoValor: number }): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (!(input.novoValor > 0)) return { ok: false, erro: "Informe um valor válido." };

  const sb = await createServerClient();
  const { data: servico } = await sb
    .from("servicos")
    .select("id, prestador_id, preco_valor")
    .eq("id", input.servicoId)
    .maybeSingle();
  if (!servico || servico.prestador_id !== w.user.id) return { ok: false, erro: "Serviço não encontrado." };

  const { error } = await sb.from("servicos").update({ preco_pendente: input.novoValor }).eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível propor o novo valor." };
  await sb.from("servico_logs").insert({
    servico_id: servico.id,
    autor_id: w.user.id,
    texto: `Propôs renegociar de R$${servico.preco_valor} para R$${input.novoValor} — aguardando aceite do cliente.`,
  });
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  return { ok: true };
}

/** Cliente aceita ou recusa a renegociação pendente. */
export async function responderRenegociacaoAction(input: { servicoId: string; aceitar: boolean }): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };

  const sb = await createServerClient();
  const { data: servico } = await sb
    .from("servicos")
    .select("id, cliente_id, prestador_id, preco_pendente")
    .eq("id", input.servicoId)
    .maybeSingle();
  if (!servico || servico.cliente_id !== w.user.id) return { ok: false, erro: "Serviço não encontrado." };
  if (servico.preco_pendente == null) return { ok: false, erro: "Não há renegociação pendente." };

  const { error } = await sb
    .from("servicos")
    .update(
      input.aceitar
        ? { preco_valor: servico.preco_pendente, preco_pendente: null }
        : { preco_pendente: null },
    )
    .eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível responder." };
  // Log fica em nome do prestador (é o dono das notas do servico_logs), mas
  // quem chamou esta action é o cliente — a RLS de insert exige autor_id =
  // auth.uid(), então esse registro do sistema precisa do client admin.
  await createAdminClient().from("servico_logs").insert({
    servico_id: servico.id,
    autor_id: servico.prestador_id,
    texto: input.aceitar
      ? `Cliente aceitou o novo valor: R$${servico.preco_pendente}.`
      : "Cliente recusou a renegociação — valor original mantido.",
  });
  revalidatePath("/meus-servicos");
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
