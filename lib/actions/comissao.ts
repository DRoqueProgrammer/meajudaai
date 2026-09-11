"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import type { CurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";
import { atorAlcanca, pracaAlcancada, pracasDoAtor } from "@/lib/admin/alcance";
import { intervaloDoMes, lerPercentual, mesValido } from "@/lib/comissao/regras";
import type { ActionResult } from "./auth";

/**
 * Comissão da plataforma (migration 0057, D-044 — as 7 lacunas respondidas
 * pelo Leonardo em 11/09/2026).
 *
 * - `definirAliquotaAction`: o Administrador da praça (ou o SysAdmin) define ou
 *   apaga uma alíquota — geral, por tipo, por prestador ou prestador + tipo.
 * - `informarPagamentoAction`: o prestador clica "Enviei o Pix" — o saldo em
 *   aberto vira um pagamento "informado" e as comissões, "informada".
 * - `decidirPagamentoAction`: o Administrador confirma (comissões pagas) ou
 *   recusa (voltam a em aberto).
 * - `registrarRecebimentoAction`: o Administrador registra um recebimento que
 *   o prestador não informou (ex.: pagou em dinheiro) — quita o saldo em aberto.
 *
 * As tabelas não têm policy de escrita para a sessão: toda escrita confere
 * papel, praça e alcance aqui e só então usa a chave de serviço. A conta de
 * exemplo mexe só no mundo de exemplo (`pracaAlcancada`/`atorAlcanca`).
 */

type DB = ReturnType<typeof createAdminClient>;

function ehAdministracao(ator: CurrentUser): boolean {
  return ator.role === "admin" || ator.role === "sysadmin";
}

function revalidarFinanceiro() {
  revalidatePath("/praca/financeiro");
  revalidatePath("/praca/prestadores");
  revalidatePath("/comissao");
  revalidatePath("/inicio");
}

/** Soma em centavos (sem erro de ponto flutuante), devolvida em reais. */
function somar(valores: readonly (number | string)[]): number {
  return valores.reduce<number>((t, v) => t + Math.round(Number(v) * 100), 0) / 100;
}

/**
 * Define (ou, com `percentual` vazio/null, apaga) uma alíquota da praça.
 * `prestadorId` e `tipo` opcionais: nenhum = geral; só tipo = por tipo; só
 * prestador = do prestador; os dois = prestador + tipo. O prestador precisa
 * ser cobrado por ESTA praça (`praca_do_prestador`).
 */
export async function definirAliquotaAction(input: {
  workspaceId: string;
  prestadorId?: string | null;
  tipo?: string | null;
  percentual: string | number | null;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração define a comissão." };

  const db = createAdminClient();
  const pracas = await pracasDoAtor(db, user);
  if (!pracaAlcancada(user, pracas, input.workspaceId)) return { ok: false, erro: "Você não administra esta praça." };

  const prestadorId = input.prestadorId || null;
  const tipo = input.tipo || null;
  if (prestadorId) {
    const { data: alvo } = await db.from("profiles").select("tipo_base, cidade, estado, exemplo").eq("user_id", prestadorId).maybeSingle();
    if (!alvo || !atorAlcanca(user, pracas, alvo, "prestador_servico")) return { ok: false, erro: "Você não administra este prestador." };
    const { data: praca } = await db.rpc("praca_do_prestador", { p_prestador: prestadorId });
    if (praca !== input.workspaceId) return { ok: false, erro: "Este prestador é cobrado por outra praça." };
  }
  if (tipo) {
    const { data: t } = await db.from("tipos_servico").select("slug").eq("slug", tipo).maybeSingle();
    if (!t) return { ok: false, erro: "Tipo de serviço desconhecido." };
  }

  // Linha existente para a mesma combinação (o índice único trata null como valor).
  let q = db.from("aliquotas_comissao").select("id").eq("workspace_id", input.workspaceId);
  q = prestadorId ? q.eq("prestador_id", prestadorId) : q.is("prestador_id", null);
  q = tipo ? q.eq("tipo_servico", tipo) : q.is("tipo_servico", null);
  const { data: existente } = await q.maybeSingle();

  const vazio = input.percentual == null || String(input.percentual).trim() === "";
  if (vazio) {
    if (existente) {
      const { error } = await db.from("aliquotas_comissao").delete().eq("id", existente.id);
      if (error) return { ok: false, erro: "Não foi possível apagar a alíquota." };
    }
    logAction("aliquota_apagada", { userId: user.id, workspaceId: input.workspaceId, prestadorId, tipo, result: "ok" });
    revalidarFinanceiro();
    return { ok: true };
  }

  const percentual = lerPercentual(input.percentual);
  if (percentual == null) return { ok: false, erro: "Alíquota inválida — use um número de 0 a 50 (ex.: 8 ou 7,5)." };

  const linha = { percentual, definido_por: user.id, atualizado_em: new Date().toISOString() };
  const { error } = existente
    ? await db.from("aliquotas_comissao").update(linha).eq("id", existente.id)
    : await db.from("aliquotas_comissao").insert({ workspace_id: input.workspaceId, prestador_id: prestadorId, tipo_servico: tipo, ...linha });
  if (error) {
    logAction("aliquota_definida", { userId: user.id, workspaceId: input.workspaceId, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível salvar a alíquota." };
  }
  logAction("aliquota_definida", { userId: user.id, workspaceId: input.workspaceId, prestadorId, tipo, percentual, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * "Enviei o Pix": o prestador informa que pagou o saldo em aberto. Cria UM
 * pagamento "informado" por praça com saldo (normalmente uma só) e marca as
 * comissões como "informada". Um informado por vez (índice do banco).
 */
export async function informarPagamentoAction(): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador informa o pagamento da comissão." };

  const db = createAdminClient();
  const { data: pendente } = await db.from("pagamentos_comissao").select("id").eq("prestador_id", user.id).eq("status", "informado").maybeSingle();
  if (pendente) return { ok: false, erro: "Você já informou um pagamento — aguarde a administração confirmar." };

  const { data: abertas, error: erroLeitura } = await db
    .from("comissoes")
    .select("id, workspace_id, valor")
    .eq("prestador_id", user.id)
    .eq("status", "em_aberto");
  if (erroLeitura) return { ok: false, erro: "Não foi possível ler o seu saldo agora." };
  if (!abertas || abertas.length === 0) return { ok: false, erro: "Você não tem comissão em aberto." };

  // Uma praça por vez: a de maior saldo (quem mudou de cidade paga a outra depois).
  const porPraca = new Map<string, { ids: string[]; valores: number[] }>();
  for (const c of abertas) {
    const g = porPraca.get(c.workspace_id) ?? { ids: [], valores: [] };
    g.ids.push(c.id);
    g.valores.push(Number(c.valor));
    porPraca.set(c.workspace_id, g);
  }
  const [workspaceId, grupo] = [...porPraca.entries()].sort((a, b) => somar(b[1].valores) - somar(a[1].valores))[0]!;
  const valor = somar(grupo.valores);
  if (valor <= 0) return { ok: false, erro: "Você não tem comissão em aberto." };

  const { data: pagamento, error } = await db
    .from("pagamentos_comissao")
    .insert({ prestador_id: user.id, workspace_id: workspaceId, valor, status: "informado" })
    .select("id")
    .single();
  if (error || !pagamento) {
    if (error?.code === "23505") return { ok: false, erro: "Você já informou um pagamento — aguarde a administração confirmar." };
    logAction("informar_pagamento_comissao", { userId: user.id, result: "erro", code: error?.code });
    return { ok: false, erro: "Não foi possível informar o pagamento. Tente de novo." };
  }
  const { error: erroMarca } = await db
    .from("comissoes")
    .update({ status: "informada", pagamento_id: pagamento.id })
    .in("id", grupo.ids)
    .eq("status", "em_aberto");
  if (erroMarca) {
    // Nunca um pagamento informado sem as comissões marcadas.
    await db.from("pagamentos_comissao").delete().eq("id", pagamento.id);
    return { ok: false, erro: "Não foi possível informar o pagamento. Tente de novo." };
  }
  logAction("informar_pagamento_comissao", { userId: user.id, workspaceId, valor, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}

/** Carrega o pagamento e confere se o ator administra a praça dele. */
async function pagamentoAlcancado(db: DB, user: CurrentUser, pagamentoId: string) {
  const { data: pagamento } = await db
    .from("pagamentos_comissao")
    .select("id, prestador_id, workspace_id, status, valor")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!pagamento) return null;
  const pracas = await pracasDoAtor(db, user);
  return pracaAlcancada(user, pracas, pagamento.workspace_id) ? pagamento : null;
}

/** Administrador confirma (Pix recebido → comissões pagas) ou recusa (não caiu → voltam a em aberto) um pagamento informado. */
export async function decidirPagamentoAction(pagamentoId: string, confirmar: boolean, observacao?: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração confirma pagamentos." };

  const db = createAdminClient();
  const pagamento = await pagamentoAlcancado(db, user, pagamentoId);
  if (!pagamento) return { ok: false, erro: "Pagamento não encontrado nesta praça." };
  if (pagamento.status !== "informado") return { ok: false, erro: "Este pagamento já foi decidido." };

  const obs = (observacao ?? "").trim().slice(0, 300) || null;
  const { data: decidido, error } = await db
    .from("pagamentos_comissao")
    .update({ status: confirmar ? "confirmado" : "recusado", decidido_por: user.id, decidido_em: new Date().toISOString(), observacao: obs })
    .eq("id", pagamentoId)
    .eq("status", "informado")
    .select("id");
  if (error || !decidido?.length) return { ok: false, erro: "Não foi possível registrar a decisão." };

  const { error: erroComissoes } = await db
    .from("comissoes")
    .update(
      confirmar
        ? { status: "paga", paga_em: new Date().toISOString(), confirmada_por: user.id }
        : { status: "em_aberto", pagamento_id: null, paga_em: null, confirmada_por: null },
    )
    .eq("pagamento_id", pagamentoId);
  if (erroComissoes) {
    await db.from("pagamentos_comissao").update({ status: "informado", decidido_por: null, decidido_em: null, observacao: null }).eq("id", pagamentoId);
    return { ok: false, erro: "Não foi possível registrar a decisão." };
  }
  logAction("decidir_pagamento_comissao", { userId: user.id, pagamentoId, confirmar, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * Administrador registra que recebeu o saldo em aberto de um prestador sem que
 * ele tenha informado (ex.: pagou em dinheiro). Com um pagamento informado
 * pendente, pede para confirmar aquele primeiro.
 */
export async function registrarRecebimentoAction(input: {
  workspaceId: string;
  prestadorId: string;
  observacao?: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração registra recebimentos." };

  const db = createAdminClient();
  const pracas = await pracasDoAtor(db, user);
  if (!pracaAlcancada(user, pracas, input.workspaceId)) return { ok: false, erro: "Você não administra esta praça." };

  const { data: pendente } = await db
    .from("pagamentos_comissao")
    .select("id")
    .eq("prestador_id", input.prestadorId)
    .eq("status", "informado")
    .maybeSingle();
  if (pendente) return { ok: false, erro: "Há um pagamento informado por este prestador — confirme ou recuse aquele primeiro." };

  const { data: abertas } = await db
    .from("comissoes")
    .select("id, valor")
    .eq("prestador_id", input.prestadorId)
    .eq("workspace_id", input.workspaceId)
    .eq("status", "em_aberto");
  if (!abertas || abertas.length === 0) return { ok: false, erro: "Este prestador não tem comissão em aberto nesta praça." };
  const valor = somar(abertas.map((c) => c.valor));

  const agora = new Date().toISOString();
  const { data: pagamento, error } = await db
    .from("pagamentos_comissao")
    .insert({
      prestador_id: input.prestadorId,
      workspace_id: input.workspaceId,
      valor,
      status: "confirmado",
      informado_em: agora,
      decidido_por: user.id,
      decidido_em: agora,
      observacao: (input.observacao ?? "").trim().slice(0, 300) || "Recebimento registrado pela administração.",
    })
    .select("id")
    .single();
  if (error || !pagamento) return { ok: false, erro: "Não foi possível registrar o recebimento." };
  const { error: erroMarca } = await db
    .from("comissoes")
    .update({ status: "paga", pagamento_id: pagamento.id, paga_em: agora, confirmada_por: user.id })
    .in("id", abertas.map((c) => c.id));
  if (erroMarca) {
    await db.from("pagamentos_comissao").delete().eq("id", pagamento.id);
    return { ok: false, erro: "Não foi possível registrar o recebimento." };
  }
  logAction("registrar_recebimento_comissao", { userId: user.id, prestadorId: input.prestadorId, valor, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * Depois de um OK/✗ por serviço, acerta os pagamentos que o prestador tinha
 * informado ("Enviei o Pix") — o OK por serviço é a fonte da verdade (D-048):
 * informado com todas as comissões pagas vira confirmado; informado sem
 * nenhuma comissão (todas voltaram) vira recusado; o valor acompanha o que
 * sobrou ligado a ele. Confirmado que perdeu todas as comissões sai do
 * histórico.
 */
async function reconciliarPagamentos(db: DB, pagamentoIds: readonly string[], userId: string) {
  for (const id of new Set(pagamentoIds)) {
    const [{ data: pg }, { data: ligadas }] = await Promise.all([
      db.from("pagamentos_comissao").select("id, status").eq("id", id).maybeSingle(),
      db.from("comissoes").select("status, valor").eq("pagamento_id", id),
    ]);
    if (!pg) continue;
    const lista = ligadas ?? [];
    const valor = somar(lista.map((c) => c.valor));
    if (lista.length === 0) {
      if (pg.status === "informado") {
        await db
          .from("pagamentos_comissao")
          .update({ status: "recusado", decidido_por: userId, decidido_em: new Date().toISOString(), observacao: "Conferido serviço a serviço: não recebido." })
          .eq("id", id);
      } else if (pg.status === "confirmado") {
        await db.from("pagamentos_comissao").delete().eq("id", id);
      }
      continue;
    }
    const tudoPago = lista.every((c) => c.status === "paga");
    const mudanca: { valor: number; status?: string; decidido_por?: string; decidido_em?: string } = { valor };
    if (pg.status === "informado" && tudoPago) {
      mudanca.status = "confirmado";
      mudanca.decidido_por = userId;
      mudanca.decidido_em = new Date().toISOString();
    }
    await db.from("pagamentos_comissao").update(mudanca).eq("id", id);
  }
}

/**
 * ✓ (OK, Pix recebido) ou ✗ (não recebido) na comissão de UM serviço — a
 * célula da grade do Financeiro do Administrador (D-048). ✗ numa comissão já
 * paga a reabre (em aberto).
 */
export async function alternarComissaoPagaAction(comissaoId: string, paga: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração confirma pagamentos." };

  const db = createAdminClient();
  const { data: c } = await db.from("comissoes").select("id, workspace_id, status, pagamento_id").eq("id", comissaoId).maybeSingle();
  if (!c) return { ok: false, erro: "Comissão não encontrada." };
  const pracas = await pracasDoAtor(db, user);
  if (!pracaAlcancada(user, pracas, c.workspace_id)) return { ok: false, erro: "Você não administra esta praça." };

  const { error } = await db
    .from("comissoes")
    .update(
      paga
        ? { status: "paga", paga_em: new Date().toISOString(), confirmada_por: user.id }
        : { status: "em_aberto", paga_em: null, confirmada_por: null, pagamento_id: null },
    )
    .eq("id", comissaoId);
  if (error) return { ok: false, erro: "Não foi possível registrar." };
  if (c.pagamento_id) await reconciliarPagamentos(db, [c.pagamento_id], user.id);
  logAction("comissao_ok", { userId: user.id, comissaoId, paga, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * "Marcar o mês como pago" (D-048): o prestador pagou todos os Pix daquele mês
 * — cada comissão de serviço do mês (pela data do serviço) recebe o OK.
 * Pensada para `.bind(null, workspaceId)` na página, com a assinatura
 * (prestadorId, mes) que a grade chama.
 */
export async function marcarMesPagoAction(workspaceId: string, prestadorId: string, mes: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (!ehAdministracao(user)) return { ok: false, erro: "Só a administração confirma pagamentos." };
  if (!mesValido(mes)) return { ok: false, erro: "Mês inválido." };

  const db = createAdminClient();
  const pracas = await pracasDoAtor(db, user);
  if (!pracaAlcancada(user, pracas, workspaceId)) return { ok: false, erro: "Você não administra esta praça." };

  const { data } = await db
    .from("comissoes")
    .select("id, status, pagamento_id, servicos(agenda_slots(data))")
    .eq("workspace_id", workspaceId)
    .eq("prestador_id", prestadorId)
    .neq("status", "paga");
  const { inicio, fim } = intervaloDoMes(mes);
  const doMes = ((data ?? []) as unknown as { id: string; pagamento_id: string | null; servicos: { agenda_slots: { data: string } | null } | null }[]).filter(
    (c) => {
      const d = c.servicos?.agenda_slots?.data;
      return d != null && d >= inicio && d <= fim;
    },
  );
  if (doMes.length === 0) return { ok: false, erro: "Nada em aberto neste mês." };

  const { error } = await db
    .from("comissoes")
    .update({ status: "paga", paga_em: new Date().toISOString(), confirmada_por: user.id })
    .in("id", doMes.map((c) => c.id));
  if (error) return { ok: false, erro: "Não foi possível marcar o mês como pago." };
  await reconciliarPagamentos(db, doMes.map((c) => c.pagamento_id).filter((x): x is string => Boolean(x)), user.id);
  logAction("mes_pago", { userId: user.id, workspaceId, prestadorId, mes, quantas: doMes.length, result: "ok" });
  revalidarFinanceiro();
  return { ok: true };
}
