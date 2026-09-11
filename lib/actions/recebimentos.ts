"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { lerValorEmReais } from "@/lib/comissao/regras";
import type { ActionResult } from "./auth";

/**
 * Recebimentos do prestador (migration 0059, D-048): o ✓/✗ de "recebido" em
 * cada serviço realizado da grade do Financeiro dele, o ajuste de valor/forma/
 * data e o recebimento avulso. Tudo pela SESSÃO — a RLS de `recebimentos`
 * confere que o serviço é dele, está realizado e que o cliente é o do serviço
 * (`recebimento_valido`). O recibo que sai daqui é opcional e sem valor fiscal.
 */

const FORMAS = ["pix", "dinheiro", "cartao", "transferencia", "outro"] as const;

function revalidar() {
  revalidatePath("/meu-financeiro");
}

/** "AAAA-MM-DD" válido e não no futuro (tolerância de um dia pelo fuso). */
function dataValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d.getTime() <= Date.now() + 86_400_000;
}

/**
 * ✓ (recebido) ou ✗ (a receber) num serviço realizado do prestador. ✓ cria o
 * recebimento com o valor combinado, Pix e a data de hoje (ajustáveis depois);
 * ✗ apaga o recebimento — e com ele o recibo.
 */
export async function alternarRecebidoAction(servicoId: string, recebido: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador marca o que recebeu." };

  const sb = await createServerClient();
  if (!recebido) {
    const { error } = await sb.from("recebimentos").delete().eq("servico_id", servicoId).eq("prestador_id", user.id);
    if (error) return { ok: false, erro: "Não foi possível desmarcar." };
    logAction("recebimento_desmarcado", { userId: user.id, servicoId, result: "ok" });
    revalidar();
    return { ok: true };
  }

  const { data: servico } = await sb
    .from("servicos")
    .select("id, cliente_id, prestador_id, status, descricao, preco_valor, tipo")
    .eq("id", servicoId)
    .maybeSingle();
  if (!servico || servico.prestador_id !== user.id) return { ok: false, erro: "Serviço não encontrado." };
  if (servico.status !== "realizado") return { ok: false, erro: "Só serviço realizado entra como recebido." };

  const { data: cliente } = await sb.from("profiles").select("nome").eq("user_id", servico.cliente_id).maybeSingle();
  const { error } = await sb.from("recebimentos").insert({
    prestador_id: user.id,
    servico_id: servico.id,
    cliente_id: servico.cliente_id,
    pagador_nome: cliente?.nome ?? "Cliente",
    descricao: servico.descricao.trim().slice(0, 300) || "Serviço realizado",
    valor: Number(servico.preco_valor),
    forma: "pix",
    recebido_em: hojeEmSaoPaulo(),
  });
  if (error) {
    if (error.code === "23505") return { ok: true }; // já estava recebido
    logAction("recebimento_marcado", { userId: user.id, servicoId, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível marcar como recebido." };
  }
  logAction("recebimento_marcado", { userId: user.id, servicoId, result: "ok" });
  revalidar();
  return { ok: true };
}

/** Ajusta valor, forma e data de um recebimento do prestador (ex.: deu desconto, pagou em dinheiro). */
export async function editarRecebimentoAction(input: {
  id: string;
  valor: string | number;
  forma: string;
  recebidoEm: string;
}): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador ajusta os recebimentos." };
  const valor = lerValorEmReais(input.valor);
  if (valor == null) return { ok: false, erro: "Informe um valor válido (ex.: 150,00)." };
  if (!(FORMAS as readonly string[]).includes(input.forma)) return { ok: false, erro: "Escolha a forma de pagamento." };
  if (!dataValida(input.recebidoEm)) return { ok: false, erro: "Informe a data em que recebeu." };

  const sb = await createServerClient();
  const { data, error } = await sb
    .from("recebimentos")
    .update({ valor, forma: input.forma, recebido_em: input.recebidoEm })
    .eq("id", input.id)
    .eq("prestador_id", w.user.id)
    .select("id");
  if (error || !data?.length) return { ok: false, erro: "Não foi possível salvar." };
  revalidar();
  return { ok: true };
}

/**
 * Recebimento avulso (sem serviço): material, visita técnica, "R$ 6,99 de
 * parafusos". Pagador: um cliente que já teve serviço com ele, ou alguém de
 * fora (só o nome). Devolve o id para abrir o recibo.
 */
export async function criarRecebimentoAvulsoAction(input: {
  clienteId?: string | null;
  pagadorNome?: string | null;
  descricao: string;
  valor: string | number;
  forma: string;
  recebidoEm: string;
}): Promise<ActionResult & { id?: string }> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador lança recebimentos." };

  const descricao = (input.descricao ?? "").trim();
  if (descricao.length < 3) return { ok: false, erro: "Descreva a que se refere o recebimento." };
  if (descricao.length > 300) return { ok: false, erro: "A descrição passa de 300 caracteres." };
  const valor = lerValorEmReais(input.valor);
  if (valor == null) return { ok: false, erro: "Informe um valor válido (ex.: 6,99)." };
  if (!(FORMAS as readonly string[]).includes(input.forma)) return { ok: false, erro: "Escolha a forma de pagamento." };
  if (!dataValida(input.recebidoEm)) return { ok: false, erro: "Informe a data em que recebeu." };

  const sb = await createServerClient();
  let pagadorNome = (input.pagadorNome ?? "").trim();
  if (input.clienteId) {
    const { data: c } = await sb.from("profiles").select("nome").eq("user_id", input.clienteId).maybeSingle();
    if (!c) return { ok: false, erro: "Cliente não encontrado." };
    pagadorNome = c.nome;
  }
  if (pagadorNome.length < 2) return { ok: false, erro: "Informe quem pagou." };

  const { data, error } = await sb
    .from("recebimentos")
    .insert({
      prestador_id: user.id,
      cliente_id: input.clienteId || null,
      pagador_nome: pagadorNome.slice(0, 120),
      descricao,
      valor,
      forma: input.forma,
      recebido_em: input.recebidoEm,
    })
    .select("id")
    .single();
  if (error || !data) {
    logAction("recebimento_avulso", { userId: user.id, result: "erro", code: error?.code });
    return { ok: false, erro: "Não foi possível lançar o recebimento." };
  }
  logAction("recebimento_avulso", { userId: user.id, valor, result: "ok" });
  revalidar();
  return { ok: true, id: data.id };
}

/** Apaga um recebimento AVULSO (os de serviço saem pelo ✗ da grade). */
export async function apagarRecebimentoAvulsoAction(id: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { data, error } = await sb.from("recebimentos").delete().eq("id", id).eq("prestador_id", w.user.id).is("servico_id", null).select("id");
  if (error || !data?.length) return { ok: false, erro: "Não foi possível apagar." };
  revalidar();
  return { ok: true };
}

/** "Emito nota fiscal" no perfil do prestador (sim/não, visível ao cliente — D-048). */
export async function definirEmiteNotaFiscalAction(emite: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.role !== "prestador_servico") return { ok: false, erro: "Só o prestador informa se emite nota." };
  const sb = await createServerClient();
  const { error } = await sb.from("profiles").update({ emite_nota_fiscal: Boolean(emite) }).eq("user_id", w.user.id);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  revalidatePath(`/perfil/${w.user.id}`);
  revalidatePath("/perfil/editar");
  return { ok: true };
}
