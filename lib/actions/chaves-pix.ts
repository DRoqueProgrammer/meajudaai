"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log";
import type { ActionResult } from "./auth";

/**
 * Chaves Pix do próprio usuário (migration 0056; pedido do Leonardo em
 * 10/09/2026): adicionar, editar, excluir e escolher a PADRÃO — a que a
 * cobrança dos serviços usa, com a opção de trocar na hora de cobrar. Sempre
 * pela SESSÃO: a RLS só deixa o dono ler e escrever; o gatilho do banco limita
 * a 5 e espelha a padrão em profiles_pii.chave_pix.
 *
 * Conta de exemplo NÃO mexe em chave: qualquer visitante abre essa conta, e uma
 * chave trocada ali mandaria o Pix de quem testa a demonstração para um
 * desconhecido.
 */

const AVISO_EXEMPLO = "Na conta de demonstração, as chaves Pix não podem ser alteradas.";

function validar(apelido: string, chave: string): string | null {
  if (!apelido.trim()) return "Dê um nome curto para a chave (ex.: Nubank).";
  if (apelido.trim().length > 40) return "O nome da chave passa de 40 caracteres.";
  const c = chave.trim();
  if (!c) return "Informe a chave Pix.";
  if (c.length > 77) return "Chave Pix longa demais.";
  return null;
}

function revalidar(userId: string) {
  revalidatePath(`/perfil/${userId}`);
  revalidatePath("/perfil/editar");
  revalidatePath("/inicio");
}

/** Cadastra uma chave; a primeira da pessoa já nasce padrão. */
export async function adicionarChavePixAction(input: { apelido: string; chave: string }): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.exemplo) return { ok: false, erro: AVISO_EXEMPLO };
  const erro = validar(input.apelido, input.chave);
  if (erro) return { ok: false, erro };

  const sb = await createServerClient();
  const { count } = await sb.from("chaves_pix").select("id", { count: "exact", head: true }).eq("user_id", w.user.id);
  const { error } = await sb
    .from("chaves_pix")
    .insert({ user_id: w.user.id, apelido: input.apelido.trim(), chave: input.chave.trim(), padrao: (count ?? 0) === 0 });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Essa chave já está cadastrada." };
    if (error.message?.includes("limite")) return { ok: false, erro: "Você já tem 5 chaves — exclua uma para cadastrar outra." };
    logAction("adicionar_chave_pix", { userId: w.user.id, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível salvar a chave." };
  }
  logAction("adicionar_chave_pix", { userId: w.user.id, result: "ok" });
  revalidar(w.user.id);
  return { ok: true };
}

/** Edita apelido e chave. */
export async function editarChavePixAction(input: { id: string; apelido: string; chave: string }): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.exemplo) return { ok: false, erro: AVISO_EXEMPLO };
  const erro = validar(input.apelido, input.chave);
  if (erro) return { ok: false, erro };

  const sb = await createServerClient();
  const { data, error } = await sb
    .from("chaves_pix")
    .update({ apelido: input.apelido.trim(), chave: input.chave.trim() })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Essa chave já está cadastrada." };
    return { ok: false, erro: "Não foi possível salvar a chave." };
  }
  if (!data) return { ok: false, erro: "Chave não encontrada." };
  logAction("editar_chave_pix", { userId: w.user.id, result: "ok" });
  revalidar(w.user.id);
  return { ok: true };
}

/** Exclui uma chave; se era a padrão, a mais antiga que sobrar vira a padrão. */
export async function excluirChavePixAction(id: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.exemplo) return { ok: false, erro: AVISO_EXEMPLO };

  const sb = await createServerClient();
  const { data: alvo } = await sb.from("chaves_pix").select("id, padrao").eq("id", id).maybeSingle();
  if (!alvo) return { ok: false, erro: "Chave não encontrada." };
  const { error } = await sb.from("chaves_pix").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir a chave." };
  if (alvo.padrao) {
    const { data: proxima } = await sb
      .from("chaves_pix")
      .select("id")
      .eq("user_id", w.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (proxima) await sb.from("chaves_pix").update({ padrao: true }).eq("id", proxima.id);
  }
  logAction("excluir_chave_pix", { userId: w.user.id, result: "ok" });
  revalidar(w.user.id);
  return { ok: true };
}

/** Faz desta a chave padrão (tira a marca da anterior antes — o banco só aceita uma). */
export async function definirChavePadraoAction(id: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.exemplo) return { ok: false, erro: AVISO_EXEMPLO };

  const sb = await createServerClient();
  const { data: alvo } = await sb.from("chaves_pix").select("id").eq("id", id).maybeSingle();
  if (!alvo) return { ok: false, erro: "Chave não encontrada." };
  const { error: e1 } = await sb.from("chaves_pix").update({ padrao: false }).eq("user_id", w.user.id).eq("padrao", true);
  if (e1) return { ok: false, erro: "Não foi possível trocar a chave padrão." };
  const { error: e2 } = await sb.from("chaves_pix").update({ padrao: true }).eq("id", id);
  if (e2) return { ok: false, erro: "Não foi possível trocar a chave padrão." };
  logAction("definir_chave_pix_padrao", { userId: w.user.id, result: "ok" });
  revalidar(w.user.id);
  return { ok: true };
}
