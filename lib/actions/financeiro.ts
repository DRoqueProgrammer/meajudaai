"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log";
import { atorAlcanca, pracaAlcancada, pracasDoAtor } from "@/lib/admin/alcance";
import { lerValorEmReais } from "@/lib/comissao/regras";
import type { ActionResult } from "./auth";

/**
 * Financeiro da praça (migration 0058, D-047 — pedidos do Leonardo em
 * 11/09/2026): notas avulsas ("Criar nota avulsa") e a assinatura do
 * Administrador nos recibos.
 *
 * Nota avulsa: escrita pela chave de serviço depois de conferir papel e praça;
 * não mexe no saldo da comissão. Assinatura: pela SESSÃO (a policy só deixa o
 * próprio Administrador/SysAdmin real gravar a dele); a conta de exemplo não
 * grava — qualquer visitante a abre, e a assinatura sai nos recibos de todos.
 */

const FORMAS = ["pix", "dinheiro", "transferencia", "outro"] as const;

/** "AAAA-MM-DD" válido e não no futuro distante (até amanhã, pela diferença de fuso). */
function dataValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  return d.getTime() <= Date.now() + 2 * 86_400_000;
}

/**
 * Cria uma nota avulsa (recibo numerado) na praça. Pagador: um prestador da
 * praça (`prestadorId`, o nome sai do perfil) ou alguém de fora (`pagadorNome`).
 * Devolve o id para a tela abrir o recibo.
 */
export async function criarNotaAvulsaAction(input: {
  workspaceId: string;
  prestadorId?: string | null;
  pagadorNome?: string | null;
  descricao: string;
  valor: string | number;
  recebidoEm: string;
  forma: string;
}): Promise<ActionResult & { id?: string }> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "admin" && user.role !== "sysadmin") return { ok: false, erro: "Só a administração emite recibos." };

  const descricao = (input.descricao ?? "").trim();
  if (descricao.length < 3) return { ok: false, erro: "Descreva a que se refere o recebimento." };
  if (descricao.length > 300) return { ok: false, erro: "A descrição passa de 300 caracteres." };
  const valor = lerValorEmReais(input.valor);
  if (valor == null) return { ok: false, erro: "Informe um valor válido (ex.: 6,99)." };
  if (valor > 1_000_000) return { ok: false, erro: "Valor acima do permitido para um recibo avulso." };
  if (!dataValida(input.recebidoEm)) return { ok: false, erro: "Informe a data em que recebeu." };
  if (!(FORMAS as readonly string[]).includes(input.forma)) return { ok: false, erro: "Escolha a forma de pagamento." };

  const db = createAdminClient();
  const pracas = await pracasDoAtor(db, user);
  if (!pracaAlcancada(user, pracas, input.workspaceId)) return { ok: false, erro: "Você não administra esta praça." };

  let prestadorId: string | null = null;
  let pagadorNome = (input.pagadorNome ?? "").trim();
  if (input.prestadorId) {
    const { data: alvo } = await db
      .from("profiles")
      .select("nome, tipo_base, cidade, estado, exemplo")
      .eq("user_id", input.prestadorId)
      .maybeSingle();
    if (!alvo || !atorAlcanca(user, pracas, alvo, "prestador_servico")) return { ok: false, erro: "Você não administra este prestador." };
    prestadorId = input.prestadorId;
    pagadorNome = alvo.nome;
  }
  if (pagadorNome.length < 2) return { ok: false, erro: "Informe quem pagou." };
  if (pagadorNome.length > 120) return { ok: false, erro: "O nome de quem pagou passa de 120 caracteres." };

  const { data, error } = await db
    .from("notas_avulsas")
    .insert({
      workspace_id: input.workspaceId,
      prestador_id: prestadorId,
      pagador_nome: pagadorNome,
      descricao,
      valor,
      recebido_em: input.recebidoEm,
      forma: input.forma,
      emitido_por: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    logAction("criar_nota_avulsa", { userId: user.id, workspaceId: input.workspaceId, result: "erro", code: error?.code });
    return { ok: false, erro: "Não foi possível criar a nota avulsa." };
  }
  logAction("criar_nota_avulsa", { userId: user.id, workspaceId: input.workspaceId, valor, result: "ok" });
  revalidatePath("/praca/financeiro");
  return { ok: true, id: data.id };
}

const TAMANHO_MAXIMO_ASSINATURA = 300_000;

/** Grava (ou troca) a assinatura desenhada do Administrador — PNG em data URL. */
export async function salvarAssinaturaAction(imagem: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "admin" && user.role !== "sysadmin") return { ok: false, erro: "Só a administração assina recibos." };
  if (user.exemplo) {
    return { ok: false, erro: "Na conta de demonstração, a assinatura fica desligada — os recibos usam o nome em letra cursiva." };
  }
  if (typeof imagem !== "string" || !imagem.startsWith("data:image/png;base64,")) return { ok: false, erro: "Assinatura inválida." };
  if (imagem.length > TAMANHO_MAXIMO_ASSINATURA) return { ok: false, erro: "A assinatura ficou grande demais — desenhe de novo, mais simples." };

  const sb = await createServerClient();
  const { error } = await sb.from("assinaturas").upsert({ user_id: user.id, imagem, atualizado_em: new Date().toISOString() });
  if (error) {
    logAction("salvar_assinatura", { userId: user.id, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível salvar a assinatura." };
  }
  logAction("salvar_assinatura", { userId: user.id, result: "ok" });
  revalidatePath("/praca/financeiro");
  return { ok: true };
}

/** Apaga a assinatura desenhada — os recibos voltam ao nome em letra cursiva. */
export async function apagarAssinaturaAction(): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const sb = await createServerClient();
  const { error } = await sb.from("assinaturas").delete().eq("user_id", w.user.id);
  if (error) return { ok: false, erro: "Não foi possível apagar a assinatura." };
  logAction("apagar_assinatura", { userId: w.user.id, result: "ok" });
  revalidatePath("/praca/financeiro");
  return { ok: true };
}
