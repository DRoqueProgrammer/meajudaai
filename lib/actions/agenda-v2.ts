"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatData } from "@/lib/format";
import { periodoValido } from "@/lib/periodo-da-visita";
import { hojeEmSaoPaulo, somarDias, diaDaSemana } from "@/lib/datas";
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
  // Teto de 90 dias por lote — evita gerar milhares de linhas por engano.
  // Aritmética de calendário em cima das strings (lib/datas.ts), sem depender
  // do fuso do servidor (UTC na Vercel).
  for (let i = 0, d = input.dataInicio; i < 90 && d <= input.dataFim; i++, d = somarDias(d, 1)) {
    if (dias.has(diaDaSemana(d))) datas.push(d);
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
 * Prestador fecha uma agenda aberta — uma faixa hora_inicio/hora_fim inteira
 * (o agrupamento que a tela mostra em "Agendas abertas", `resumoHorariosAbertos`).
 * Pedido do Leonardo em 10/09/2026: um X vermelho fecha a agenda, mas não se
 * ela tiver serviço agendado.
 *
 * Confere antes se algum horário FUTURO dessa faixa está pendente ou
 * confirmado — se sim, recusa e lista as datas em conflito. Só então marca
 * como 'fechado' os horários livres futuros dessa faixa; o gatilho do banco
 * (migration 0046) é a trava de verdade — esta checagem só existe para dar um
 * erro claro em vez do genérico que o gatilho devolveria.
 */
export async function fecharAgendaAbertaAction(input: {
  horaInicio: string;
  horaFim: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só prestadores de serviço têm agenda." };

  const sb = await createServerClient();
  const hoje = hojeEmSaoPaulo();
  const { data: slots, error: erroSlots } = await sb
    .from("agenda_slots")
    .select("id, data, status")
    .eq("prestador_id", w.user.id)
    .eq("hora_inicio", input.horaInicio)
    .eq("hora_fim", input.horaFim)
    .gte("data", hoje);
  if (erroSlots) return { ok: false, erro: "Não foi possível conferir essa agenda." };

  const ocupados = (slots ?? []).filter((s) => s.status === "pendente" || s.status === "confirmado");
  if (ocupados.length > 0) {
    const datas = ocupados.map((s) => formatData(s.data)).join(", ");
    return {
      ok: false,
      erro: `Esta agenda tem serviços agendados (${datas}). Cancele ou conclua esses serviços antes de fechar.`,
    };
  }

  const livres = (slots ?? []).filter((s) => s.status === "livre").map((s) => s.id);
  if (livres.length === 0) return { ok: false, erro: "Não há horários livres nessa faixa para fechar." };

  const { error } = await sb.from("agenda_slots").update({ status: "fechado" }).in("id", livres);
  if (error) return { ok: false, erro: "Não foi possível fechar a agenda." };
  revalidatePath("/agenda");
  return { ok: true };
}

/**
 * Cliente reserva um slot livre — descreve o que precisa e nasce um serviço
 * pendente com o preço vigente do prestador naquele instante (histórico não
 * muda se o prestador reconfigurar o preço depois). Quem marca o horário
 * (`agenda_slots`) como "pendente" é o próprio banco, por gatilho, no
 * nascimento do serviço (migration 0038, ADR 0011) — a sessão do cliente
 * nunca teve, e continua sem ter, permissão de update em `agenda_slots` (é só
 * do prestador dono), então esta action não depende mais disso: as checagens
 * abaixo (horário livre, preço configurado) são só para dar um erro claro ao
 * usuário antes de tentar; a regra que de fato vale para qualquer sessão é a
 * policy de INSERT de `servicos` no banco.
 */
export async function reservarSlotAction(input: {
  slotId: string;
  descricao: string;
  endereco: string;
  lat: number;
  lng: number;
  /** `tipos_servico.slug` (migration 0047) — cliente escolhe ao agendar. 'outros' se omitido. */
  tipo?: string;
  /** Quando o cliente prefere a visita dentro da janela (migration 0050) — 'qualquer' se omitido. */
  periodoPreferido?: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "cliente") return { ok: false, erro: "Só clientes podem reservar um horário." };
  if (!input.descricao.trim()) return { ok: false, erro: "Descreva o que você precisa." };
  if (!input.endereco.trim() || input.lat == null || input.lng == null) {
    return { ok: false, erro: "Marque o endereço onde o serviço vai acontecer." };
  }

  const sb = await createServerClient();
  const tipo = input.tipo?.trim() || "outros";
  const { data: tipoValido } = await sb.from("tipos_servico").select("slug").eq("slug", tipo).maybeSingle();
  if (!tipoValido) return { ok: false, erro: "Tipo de serviço inválido." };

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

  const { error: insServico } = await sb.from("servicos").insert({
    slot_id: slot.id,
    cliente_id: w.user.id,
    prestador_id: slot.prestador_id,
    descricao: input.descricao.trim(),
    preco_tipo: perfil.preco_tipo,
    preco_valor: perfil.preco_valor,
    endereco: input.endereco.trim(),
    lat: input.lat,
    lng: input.lng,
    tipo,
    periodo_preferido: periodoValido(input.periodoPreferido),
  });
  if (insServico) return { ok: false, erro: "Não foi possível registrar o serviço." };
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

/**
 * Prestador marca como realizado um serviço confirmado — ação sem volta (a
 * regra do banco, migration 0038, trava "realizado" como estado final: nem
 * este mesmo prestador consegue mudar de novo). O horário em `agenda_slots`
 * continua "confirmado" — não existe status "realizado" para horário.
 */
export async function marcarRealizadoAction(servicoId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { data: servico } = await sb
    .from("servicos")
    .select("id, prestador_id, status")
    .eq("id", servicoId)
    .maybeSingle();
  if (!servico || servico.prestador_id !== w.user.id) return { ok: false, erro: "Serviço não encontrado." };
  if (servico.status !== "confirmado") return { ok: false, erro: "Esse serviço não está confirmado." };

  const { error } = await sb.from("servicos").update({ status: "realizado" }).eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível marcar como realizado." };
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
  // O horário volta a livre pelo próprio banco (gatilho da migration 0048),
  // seja quem for que cancelou — antes, a sessão do cliente não conseguia.
  revalidatePath("/agenda");
  revalidatePath("/meus-servicos");
  revalidatePath("/clientes");
  revalidatePath("/inicio");
  return { ok: true };
}

/**
 * Prestador marca a hora combinada da visita (migration 0051): depois de
 * combinar com o cliente dentro da janela da agenda aberta (ex.: 09h–18h),
 * grava o início (ex.: 10:00) e, se quiser, o fim — que é opcional. Sessão do
 * prestador; o gatilho do banco confere quem mexe, o estado e a janela.
 * `inicio` vazio desmarca.
 */
export async function combinarHoraAction(input: {
  servicoId: string;
  inicio: string;
  fim?: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador marca a hora combinada." };
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  const inicio = input.inicio.trim();
  const fim = (input.fim ?? "").trim();
  if (inicio && !hora.test(inicio)) return { ok: false, erro: "Hora de início inválida." };
  if (fim && !hora.test(fim)) return { ok: false, erro: "Hora de fim inválida." };
  if (fim && !inicio) return { ok: false, erro: "Marque o início antes do fim." };
  if (fim && fim <= inicio) return { ok: false, erro: "O fim precisa ser depois do início." };

  const sb = await createServerClient();
  const { data, error } = await sb
    .from("servicos")
    .update({ hora_combinada_inicio: inicio || null, hora_combinada_fim: fim || null })
    .eq("id", input.servicoId)
    .eq("prestador_id", w.user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    // Mensagem do gatilho (janela) é clara o bastante para mostrar como está.
    return { ok: false, erro: error.message?.includes("agenda aberta") ? error.message : "Não foi possível salvar a hora combinada." };
  }
  if (!data) return { ok: false, erro: "Serviço não encontrado." };
  revalidatePath("/agenda");
  revalidatePath("/meus-servicos");
  revalidatePath("/inicio");
  return { ok: true };
}
