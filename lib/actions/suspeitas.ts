"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import type { CurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log";
import { atorAlcanca, pracasDoAtor } from "@/lib/admin/alcance";
import type { ActionResult } from "./auth";

/**
 * Suspeitas, sinalizações e suspensão (migrations 0052–0054; pedidos do
 * Leonardo em 10/09/2026 — "Flag de Pilantragem").
 *
 * - Sobre PRESTADOR: o Administrador da praça (ou o SysAdmin) registra
 *   suspeitas que só a administração vê (`adicionarSuspeitaAction`) e pode
 *   suspender a conta (`suspenderPrestadorAction`).
 * - Entre as partes de um serviço, nas duas direções (0055): quem teve o
 *   serviço sinaliza a outra parte no próprio serviço, com justificativa
 *   (`sinalizarAction`, pela SESSÃO — a policy confere o vínculo); o
 *   Administrador aprova ou recusa (`decidirSinalizacaoAction`); aprovada, vira
 *   bandeira no perfil do alvo, que só o outro lado e a administração veem. O
 *   Administrador também pode suspender o cliente (`suspenderClienteAction`).
 * - `encerrarSuspensaoAction` reabre a conta.
 *
 * Toda escrita administrativa confere papel, praça e alcance ANTES
 * (`lib/admin/alcance.ts`) e só então usa a chave de serviço — as tabelas não
 * têm policy de escrita para a sessão. Conta de exemplo (que qualquer visitante
 * abre) registra e decide sinais do mundo de exemplo, mas NÃO suspende: a
 * suspensão tira a pessoa da vitrine pública e do fluxo de demonstração de todo
 * mundo.
 */

type DB = ReturnType<typeof createAdminClient>;

const MOTIVOS_SUSPEITA = ["comissao_nao_paga", "contato_por_fora", "outro"] as const;
const MOTIVOS_SINALIZACAO = ["nao_pagou", "contato_por_fora", "nao_compareceu", "problema_no_servico", "outro"] as const;

function ehAdministracao(ator: CurrentUser): boolean {
  return ator.role === "admin" || ator.role === "sysadmin";
}

async function perfilAlvo(db: DB, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("tipo_base, cidade, estado, exemplo, status")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Texto livre opcional, aparado e com teto — ou null. */
function textoOpcional(v: string | null | undefined, max = 600): string | null {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
}

/** Administrador (ou SysAdmin) registra uma suspeita sobre um prestador que ele alcança. Só a administração vê. */
export async function adicionarSuspeitaAction(input: {
  prestadorId: string;
  motivo: string;
  descricao?: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração registra suspeitas." };
  if (!(MOTIVOS_SUSPEITA as readonly string[]).includes(input.motivo)) return { ok: false, erro: "Escolha o motivo." };

  const db = createAdminClient();
  const alvo = await perfilAlvo(db, input.prestadorId);
  if (!alvo) return { ok: false, erro: "Prestador não encontrado." };
  const pracas = await pracasDoAtor(db, user);
  if (!atorAlcanca(user, pracas, alvo, "prestador_servico")) {
    return { ok: false, erro: "Você não administra a praça deste prestador." };
  }

  const { error } = await db.from("suspeitas_prestador").insert({
    prestador_id: input.prestadorId,
    autor_id: user.id,
    motivo: input.motivo,
    descricao: textoOpcional(input.descricao),
  });
  if (error) {
    logAction("adicionar_suspeita", { userId: user.id, prestadorId: input.prestadorId, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível registrar a suspeita." };
  }
  logAction("adicionar_suspeita", { userId: user.id, prestadorId: input.prestadorId, motivo: input.motivo, result: "ok" });
  revalidatePath("/inicio");
  return { ok: true };
}

/** Apaga uma suspeita registrada por engano (a administração que alcança o prestador). */
export async function removerSuspeitaAction(suspeitaId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração mexe nas suspeitas." };

  const db = createAdminClient();
  const { data: suspeita } = await db.from("suspeitas_prestador").select("prestador_id").eq("id", suspeitaId).maybeSingle();
  if (!suspeita) return { ok: false, erro: "Suspeita não encontrada." };
  const alvo = await perfilAlvo(db, suspeita.prestador_id);
  const pracas = await pracasDoAtor(db, user);
  if (!alvo || !atorAlcanca(user, pracas, alvo, "prestador_servico")) {
    return { ok: false, erro: "Você não administra a praça deste prestador." };
  }
  const { error } = await db.from("suspeitas_prestador").delete().eq("id", suspeitaId);
  if (error) return { ok: false, erro: "Não foi possível apagar a suspeita." };
  logAction("remover_suspeita", { userId: user.id, suspeitaId, result: "ok" });
  revalidatePath("/inicio");
  return { ok: true };
}

/** Suspende a conta (prestador ou cliente): abre a suspensão com o motivo que a pessoa vai ler e marca o perfil. */
async function suspender(userId: string, papel: "prestador_servico" | "cliente", motivoPublico: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração suspende contas." };
  if (user.exemplo) {
    return { ok: false, erro: "Na conta de demonstração, suspender fica desligado — afetaria a demonstração de todo mundo." };
  }
  const motivo = motivoPublico.trim();
  if (motivo.length < 10) return { ok: false, erro: "Escreva o motivo que a pessoa vai ler (pelo menos 10 caracteres)." };
  if (motivo.length > 600) return { ok: false, erro: "O motivo passa de 600 caracteres." };

  const db = createAdminClient();
  const alvo = await perfilAlvo(db, userId);
  if (!alvo) return { ok: false, erro: "Pessoa não encontrada." };
  const pracas = await pracasDoAtor(db, user);
  if (!atorAlcanca(user, pracas, alvo, papel)) return { ok: false, erro: "Você não administra a praça desta pessoa." };
  if (alvo.status === "suspenso") return { ok: false, erro: "Esta conta já está suspensa." };
  if (alvo.status !== "ativo") return { ok: false, erro: "Só uma conta ativa pode ser suspensa." };

  const { error: erroSusp } = await db.from("suspensoes").insert({ user_id: userId, motivo_publico: motivo, suspenso_por: user.id });
  if (erroSusp) {
    logAction("suspender_conta", { userId: user.id, alvo: userId, result: "erro", code: erroSusp.code });
    return { ok: false, erro: "Não foi possível suspender agora." };
  }
  const { error: erroPerfil } = await db.from("profiles").update({ status: "suspenso" }).eq("user_id", userId);
  if (erroPerfil) {
    // Desfaz a suspensão aberta: nunca uma suspensão sem o perfil marcado.
    await db.from("suspensoes").delete().eq("user_id", userId).is("encerrada_em", null);
    return { ok: false, erro: "Não foi possível suspender agora." };
  }
  logAction("suspender_conta", { userId: user.id, alvo: userId, papel, result: "ok" });
  revalidatePath("/inicio");
  revalidatePath("/");
  return { ok: true };
}

/** Administrador (ou SysAdmin) suspende um prestador que ele alcança. */
export async function suspenderPrestadorAction(prestadorId: string, motivoPublico: string): Promise<ActionResult> {
  return suspender(prestadorId, "prestador_servico", motivoPublico);
}

/** Administrador (ou SysAdmin) suspende um cliente que ele alcança. */
export async function suspenderClienteAction(clienteId: string, motivoPublico: string): Promise<ActionResult> {
  return suspender(clienteId, "cliente", motivoPublico);
}

/** Encerra a suspensão aberta e devolve a conta a 'ativo'. */
export async function encerrarSuspensaoAction(userId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração encerra suspensões." };
  if (user.exemplo) return { ok: false, erro: "Na conta de demonstração, suspensões ficam desligadas." };

  const db = createAdminClient();
  const alvo = await perfilAlvo(db, userId);
  if (!alvo) return { ok: false, erro: "Pessoa não encontrada." };
  const papel = alvo.tipo_base === "cliente" ? "cliente" : "prestador_servico";
  const pracas = await pracasDoAtor(db, user);
  if (!atorAlcanca(user, pracas, alvo, papel)) return { ok: false, erro: "Você não administra a praça desta pessoa." };

  const { error } = await db
    .from("suspensoes")
    .update({ encerrada_em: new Date().toISOString(), encerrada_por: user.id })
    .eq("user_id", userId)
    .is("encerrada_em", null);
  if (error) return { ok: false, erro: "Não foi possível encerrar a suspensão." };
  if (alvo.status === "suspenso") {
    const { error: erroPerfil } = await db.from("profiles").update({ status: "ativo" }).eq("user_id", userId);
    if (erroPerfil) return { ok: false, erro: "A suspensão foi encerrada, mas o perfil não voltou a ativo. Tente de novo." };
  }
  logAction("encerrar_suspensao", { userId: user.id, alvo: userId, result: "ok" });
  revalidatePath("/inicio");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Uma das partes de um serviço sinaliza a OUTRA ("Flag Pilantra", migration
 * 0055) — a bandeira é dada no serviço em si, com justificativa obrigatória, e
 * vai para o Administrador aprovar. A direção sai do papel de quem sinaliza
 * naquele serviço: o prestador sinaliza o cliente; o cliente, o prestador.
 * Pela SESSÃO: a policy de insert confere que a pessoa é parte do serviço, o
 * alvo é a outra parte e que nasce pendente. Uma por pessoa por serviço.
 */
export async function sinalizarAction(input: {
  servicoId: string;
  motivo: string;
  justificativa: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "prestador_servico" && user.role !== "cliente") {
    return { ok: false, erro: "Só as partes de um serviço sinalizam." };
  }
  if (!(MOTIVOS_SINALIZACAO as readonly string[]).includes(input.motivo)) return { ok: false, erro: "Escolha o motivo." };
  const justificativa = input.justificativa.trim();
  if (justificativa.length < 10) return { ok: false, erro: "Conte o que aconteceu (pelo menos 10 caracteres)." };
  if (justificativa.length > 600) return { ok: false, erro: "A justificativa passa de 600 caracteres." };

  const sb = await createServerClient();
  // As partes leem o próprio serviço pela RLS; o alvo sai dele, nunca do formulário.
  const { data: servico } = await sb
    .from("servicos")
    .select("id, cliente_id, prestador_id, slot_id")
    .eq("id", input.servicoId)
    .maybeSingle();
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };
  const souPrestador = servico.prestador_id === user.id;
  const souCliente = servico.cliente_id === user.id;
  if (!souPrestador && !souCliente) return { ok: false, erro: "Serviço não encontrado." };

  const { error } = await sb.from("sinalizacoes").insert({
    autor_id: user.id,
    alvo_id: souPrestador ? servico.cliente_id : servico.prestador_id,
    servico_id: servico.id,
    direcao: souPrestador ? "prestador_para_cliente" : "cliente_para_prestador",
    motivo: input.motivo,
    justificativa,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Você já sinalizou este serviço." };
    logAction("sinalizar", { userId: user.id, servicoId: servico.id, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível enviar a sinalização. Tente de novo." };
  }
  logAction("sinalizar", { userId: user.id, servicoId: servico.id, motivo: input.motivo, result: "ok" });
  revalidatePath("/servicos");
  revalidatePath("/meus-servicos");
  revalidatePath(`/agenda/${servico.slot_id}`);
  revalidatePath("/inicio");
  return { ok: true };
}

/**
 * Administrador aprova ou recusa uma sinalização — de quem ele alcança (o alvo
 * ou quem sinalizou, na cidade de uma praça dele, do mesmo mundo; o SysAdmin,
 * qualquer um do mundo dele). Aprovada, vira bandeira no perfil do alvo.
 */
export async function decidirSinalizacaoAction(sinalizacaoId: string, aprovar: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração decide as sinalizações." };

  const db = createAdminClient();
  const { data: sin } = await db
    .from("sinalizacoes")
    .select("id, autor_id, alvo_id, direcao, status")
    .eq("id", sinalizacaoId)
    .maybeSingle();
  if (!sin) return { ok: false, erro: "Sinalização não encontrada." };
  if (sin.status !== "pendente") return { ok: false, erro: "Esta sinalização já foi decidida." };

  const [alvo, autor] = await Promise.all([perfilAlvo(db, sin.alvo_id), perfilAlvo(db, sin.autor_id)]);
  const pracas = await pracasDoAtor(db, user);
  const papelAlvo = sin.direcao === "prestador_para_cliente" ? "cliente" : "prestador_servico";
  const papelAutor = sin.direcao === "prestador_para_cliente" ? "prestador_servico" : "cliente";
  const alcanca =
    (alvo ? atorAlcanca(user, pracas, alvo, papelAlvo) : false) || (autor ? atorAlcanca(user, pracas, autor, papelAutor) : false);
  if (!alcanca) return { ok: false, erro: "Você não administra a praça desta sinalização." };

  const { error } = await db
    .from("sinalizacoes")
    .update({ status: aprovar ? "aprovada" : "recusada", decidido_por: user.id, decidido_em: new Date().toISOString() })
    .eq("id", sinalizacaoId)
    .eq("status", "pendente");
  if (error) return { ok: false, erro: "Não foi possível registrar a decisão." };
  logAction("decidir_sinalizacao", { userId: user.id, sinalizacaoId, aprovar, result: "ok" });
  revalidatePath("/inicio");
  revalidatePath(`/perfil/${sin.alvo_id}`);
  return { ok: true };
}
