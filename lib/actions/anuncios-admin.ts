"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import type { CurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";
import { adminAlcancaPrestador, limiteValido, LIMITE_MAXIMO, type PracaParaAlcance } from "@/lib/anuncios/regras";
import { pracasDoMundoDeExemplo } from "./pracas";
import type { ActionResult } from "./auth";

/**
 * Ação v2 do Administrador (decisão do Leonardo em 10/09/2026, painel do
 * Administrador — lote A4): quantos anúncios ATIVOS cada Prestador de
 * Serviço pode publicar. Um padrão por praça (`workspaces.limite_anuncios_padrao`)
 * e, por cima, um ajuste por prestador (`anuncio_limites`) — os dois só lidos
 * de verdade pelo banco em `public.limite_de_anuncios` (migration 0044); as
 * actions aqui só escrevem depois de conferir TUDO com a mesma regra
 * (`lib/anuncios/regras.ts:adminAlcancaPrestador`), pra nunca depender só do
 * banco recusar.
 *
 * Escrita sempre com `createAdminClient()`: `anuncio_limites` não tem policy
 * de escrita nenhuma, e `status = 'moderado'` em `anuncios` só é alcançável
 * pela chave de serviço (RLS da migration 0044) — é assim que "moderado" fica
 * imune à própria sessão do prestador. O ator vem sempre de `tryWriter()`.
 */

type DB = ReturnType<typeof createAdminClient>;

/**
 * Praças do ator, no recorte que `adminAlcancaPrestador` precisa (id, cidade,
 * UF e se é do mundo de exemplo): do Administrador, as que ele integra
 * (`workspace_members.user_id`); do SysAdmin, todas — espelha "papel admin
 * (as praças dele) ou sysadmin (todas as praças)" do lote. Um ator que não é
 * nem admin nem sysadmin não alcança nenhuma praça.
 */
async function pracasDoAtor(db: DB, ator: CurrentUser): Promise<PracaParaAlcance[]> {
  if (ator.role !== "admin" && ator.role !== "sysadmin") return [];

  let query = db.from("workspaces").select("id, cidade, estado");
  if (ator.role === "admin") {
    const { data: membros } = await db.from("workspace_members").select("workspace_id").eq("user_id", ator.id);
    const ids = (membros ?? []).map((m) => m.workspace_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const { data: pracas, error } = await query;
  if (error || !pracas) return [];

  const pracasExemplo = await pracasDoMundoDeExemplo(db);
  return pracas.map((p) => ({ id: p.id, cidade: p.cidade, estado: p.estado, exemplo: pracasExemplo.has(p.id) }));
}

/**
 * `{ ok: true }` se `pracaId` é uma das praças do `ator` (`pracasDoAtor`) E o
 * mundo bate (`podeAgirSobre`) — recusa ANTES de escrever, com uma mensagem
 * por causa (praça fora do alcance vs. mundo errado), em vez de deixar o
 * `update` silenciosamente não achar linha nenhuma.
 */
async function pracaAutorizada(db: DB, ator: CurrentUser, pracaId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const pracas = await pracasDoAtor(db, ator);
  const praca = pracas.find((p) => p.id === pracaId);
  if (!praca) return { ok: false, erro: "Praça não encontrada, ou você não administra esta praça." };
  if (!podeAgirSobre({ exemplo: Boolean(ator.exemplo) }, { exemplo: praca.exemplo })) {
    return { ok: false, erro: "Conta de exemplo só ajusta praças do mundo de exemplo." };
  }
  return { ok: true };
}

/** `{ ok: true }` se `ator` é Administrador ou SysAdmin — os dois únicos papéis que tocam estas actions. */
function papelAutorizado(ator: CurrentUser): { ok: true } | { ok: false; erro: string } {
  if (ator.role !== "admin" && ator.role !== "sysadmin") {
    return { ok: false, erro: "Apenas o Administrador da praça ou o SysAdmin ajusta o limite de anúncios." };
  }
  return { ok: true };
}

/** Mensagem padrão quando `limite` não é `null` nem um inteiro válido de 0 a `LIMITE_MAXIMO`. */
const ERRO_LIMITE_INVALIDO = `Informe um número inteiro entre 0 e ${LIMITE_MAXIMO}, ou deixe vazio para voltar ao padrão.`;

/**
 * Define o padrão de anúncios ativos da praça (`workspaces.limite_anuncios_padrao`) —
 * vale para todo prestador da cidade dela, do mesmo mundo. `limite = null`
 * apaga o ajuste (volta ao padrão da plataforma, `LIMITE_PADRAO_PLATAFORMA`).
 */
export async function definirLimitePadraoAction(pracaId: string, limite: number | null): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;

  const papel = papelAutorizado(user);
  if (!papel.ok) return papel;
  if (limite !== null && !limiteValido(limite)) return { ok: false, erro: ERRO_LIMITE_INVALIDO };

  const db = createAdminClient();
  const autorizado = await pracaAutorizada(db, user, pracaId);
  if (!autorizado.ok) return autorizado;

  const { error } = await db.from("workspaces").update({ limite_anuncios_padrao: limite }).eq("id", pracaId);
  if (error) {
    logAction("definir_limite_padrao_praca", { userId: user.id, pracaId, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível atualizar o padrão da praça. Tente de novo." };
  }

  logAction("definir_limite_padrao_praca", { userId: user.id, pracaId, limite, result: "ok" });
  revalidatePath("/inicio");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Ajusta quantos anúncios ativos UM prestador pode ter (`anuncio_limites`) —
 * vence o padrão da praça dele. `limite = null` apaga a linha do ajuste
 * (`delete`, não `update` para null: a tabela não aceita `limite` nulo,
 * migration 0044) e ele volta a valer o padrão da praça ou da plataforma.
 */
export async function definirLimitePrestadorAction(prestadorId: string, limite: number | null): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;

  const papel = papelAutorizado(user);
  if (!papel.ok) return papel;
  if (limite !== null && !limiteValido(limite)) return { ok: false, erro: ERRO_LIMITE_INVALIDO };

  const db = createAdminClient();
  const { data: alvo, error: alvoErr } = await db
    .from("profiles")
    .select("tipo_base, cidade, estado, exemplo")
    .eq("user_id", prestadorId)
    .maybeSingle();
  if (alvoErr || !alvo) return { ok: false, erro: "Prestador não encontrado." };

  const pracas = await pracasDoAtor(db, user);
  if (!adminAlcancaPrestador({ exemplo: Boolean(user.exemplo) }, pracas, alvo)) {
    return { ok: false, erro: "Você não administra a praça deste prestador." };
  }

  const { error } =
    limite === null
      ? await db.from("anuncio_limites").delete().eq("prestador_id", prestadorId)
      : await db.from("anuncio_limites").upsert({ prestador_id: prestadorId, limite, definido_por: user.id });
  if (error) {
    logAction("definir_limite_prestador", { userId: user.id, prestadorId, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível atualizar o limite do prestador. Tente de novo." };
  }

  logAction("definir_limite_prestador", { userId: user.id, prestadorId, limite, result: "ok" });
  revalidatePath("/inicio");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Modera um anúncio: `tirarDoAr = true` põe `status = 'moderado'` (some do
 * mural, e a sessão do prestador não consegue reverter — RLS da migration
 * 0044); `false` devolve `'pausado'`, de onde o próprio prestador reativa.
 * Confere `adminAlcancaPrestador` sobre o DONO do anúncio antes de escrever —
 * moderar não é uma ação sobre o anúncio isolado, é sobre o prestador dele.
 */
export async function moderarAnuncioAction(anuncioId: string, tirarDoAr: boolean): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;

  const papel = papelAutorizado(user);
  if (!papel.ok) return papel;
  // Revisão do controller: qualquer visitante abre a conta de exemplo pela
  // landing, e o anúncio está no mural PÚBLICO — deixar a conta de exemplo
  // tirar anúncio do ar esvaziaria a vitrine de todo mundo. Limite pode (não
  // tira nada do ar); moderação, não.
  if (user.exemplo) {
    return { ok: false, erro: "Na conta de demonstração, tirar anúncio do ar fica desligado — o mural é público." };
  }

  const db = createAdminClient();
  const { data: anuncio, error: anuncioErr } = await db
    .from("anuncios")
    .select("id, prestador_id, status")
    .eq("id", anuncioId)
    .maybeSingle();
  if (anuncioErr || !anuncio) return { ok: false, erro: "Anúncio não encontrado." };

  const { data: alvo, error: alvoErr } = await db
    .from("profiles")
    .select("tipo_base, cidade, estado, exemplo")
    .eq("user_id", anuncio.prestador_id)
    .maybeSingle();
  if (alvoErr || !alvo) return { ok: false, erro: "Prestador do anúncio não encontrado." };

  const pracas = await pracasDoAtor(db, user);
  if (!adminAlcancaPrestador({ exemplo: Boolean(user.exemplo) }, pracas, alvo)) {
    return { ok: false, erro: "Você não administra a praça deste prestador." };
  }

  if (tirarDoAr && anuncio.status === "moderado") return { ok: true }; // já está fora do ar
  if (!tirarDoAr && anuncio.status !== "moderado") {
    return { ok: false, erro: "Este anúncio não está moderado — não há o que devolver." };
  }

  const { error } = await db
    .from("anuncios")
    .update({ status: tirarDoAr ? "moderado" : "pausado" })
    .eq("id", anuncioId);
  if (error) {
    logAction("moderar_anuncio", { userId: user.id, anuncioId, tirarDoAr, result: "erro", code: error.code });
    return { ok: false, erro: "Não foi possível atualizar o anúncio. Tente de novo." };
  }

  logAction("moderar_anuncio", {
    userId: user.id,
    anuncioId,
    prestadorId: anuncio.prestador_id,
    tirarDoAr,
    result: "ok",
  });
  revalidatePath("/inicio");
  revalidatePath("/");
  return { ok: true };
}
