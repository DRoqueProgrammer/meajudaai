"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { AnuncioSchema } from "@/lib/validation";
import { soDigitos } from "@/lib/format";
import { logAction } from "@/lib/log";
import { campo, valoresPreservados, type EstadoForm } from "./form";
import type { ActionResult } from "./auth";

/**
 * Ações de "Meus anúncios" do Prestador de Serviço (migration 0044): publicar
 * até X anúncios ATIVOS — oferta do próprio serviço ou vaga para ajudante sem
 * conta ("Necessita-se ajudante!") — e mudar o status dos que já existem.
 *
 * As duas actions usam sempre o client da SESSÃO (`createServerClient`),
 * nunca a chave de serviço: quem garante dono, papel, limite de anúncios
 * ativos e o bloqueio de anúncio moderado é a policy de RLS somada ao
 * gatilho `anuncios_validar` (migration 0044) — a action só valida o que é
 * responsabilidade da interface (formato dos campos) e traduz o erro do
 * banco para uma frase que a pessoa entenda.
 */

/**
 * Mensagem fixa para a conta de exemplo (D-015/D-030): ela nunca escreve no
 * banco compartilhado — os anúncios que aparecem pra qualquer visitante da
 * landing nascem só por script, com a chave de serviço.
 */
const AVISO_CONTA_EXEMPLO =
  "Conta de demonstração não publica anúncios — eles aparecem na página pública.";

/**
 * Traduz os erros que a policy de RLS e o gatilho `anuncios_validar`
 * (migration 0044) devolvem em mensagens humanas. Sem isto, quem estourasse o
 * limite veria o texto cru do Postgres ("new row violates row-level security
 * policy for table \"anuncios\"") em vez de saber o que fazer.
 */
function traduzirErroAnuncio(error: { code?: string; message?: string } | null): string {
  if (error?.code === "P0001") {
    // Mensagem do gatilho: 'limite de anúncios ativos atingido (% de %)',
    // primeiro número são os ativos de agora, o segundo é o limite (limite_de_anuncios).
    const limite = error.message?.match(/\((\d+) de (\d+)\)/)?.[2];
    return limite
      ? `Você já tem ${limite} anúncios ativos, o máximo liberado para você. Pause ou encerre um para publicar outro.`
      : "Você atingiu o máximo de anúncios ativos liberado para você. Pause ou encerre um para publicar outro.";
  }
  if (error?.code === "42501" && error.message?.includes("moderação")) {
    return "Este anúncio foi tirado do ar pela moderação. Fale com o Administrador da sua praça.";
  }
  return "Não foi possível concluir. Tente de novo.";
}

/**
 * Publica um anúncio (form sem JS). Cidade e UF NUNCA vão no insert — o
 * gatilho `anuncios_validar` copia do perfil, então mandar um valor do
 * formulário só criaria uma falsa sensação de controle sobre um dado que a
 * sessão não decide.
 */
export async function criarAnuncioAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.exemplo) return { erro: AVISO_CONTA_EXEMPLO, valores: preserva };
  if (user.role !== "prestador_servico") {
    return { erro: "Só prestadores de serviço publicam anúncios.", valores: preserva };
  }

  // Normaliza antes do zod: um valor fora das duas opções do formulário
  // (campo ausente, JS desligado e o rádio sem "checked" nenhum) cai em
  // "servico" em vez de estourar um erro de enum em inglês.
  const tipo = campo(fd, "tipo") === "vaga_ajudante" ? "vaga_ajudante" : "servico";
  const parsed = AnuncioSchema.safeParse({
    tipo,
    titulo: campo(fd, "titulo"),
    descricao: campo(fd, "descricao"),
    categoria: campo(fd, "categoria"),
    whatsapp: campo(fd, "whatsapp"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos.", valores: preserva };
  }
  const d = parsed.data;

  // Vaga exige WhatsApp com DDD (10 a 13 dígitos, igual à constraint da
  // 0044); serviço nunca leva WhatsApp — a constraint `anuncios_servico_sem_whatsapp`
  // rejeitaria de qualquer jeito, mas o erro de banco não diria isso com clareza.
  let whatsapp: string | null = null;
  if (d.tipo === "vaga_ajudante") {
    whatsapp = soDigitos(d.whatsapp);
    if (whatsapp.length < 10 || whatsapp.length > 13) {
      return { erro: "Informe um WhatsApp válido, com DDD (10 a 13 números).", valores: preserva };
    }
  }

  const sb = await createServerClient();
  const { error } = await sb.from("anuncios").insert({
    prestador_id: user.id,
    tipo: d.tipo,
    titulo: d.titulo,
    descricao: d.descricao,
    categoria: d.categoria || null,
    whatsapp,
  });
  if (error) {
    logAction("criar_anuncio", { userId: user.id, result: "erro", code: error.code });
    return { erro: traduzirErroAnuncio(error), valores: preserva };
  }

  logAction("criar_anuncio", { userId: user.id, tipo: d.tipo, result: "ok" });
  revalidatePath("/anuncios");
  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Pausa, reativa ou encerra um anúncio próprio. "moderado" nunca é destino
 * desta action — só a chave de serviço põe ou tira um anúncio desse estado
 * (ver ADR/comentário do gatilho na migration 0044); tentar aqui vira o erro
 * 42501 traduzido acima.
 */
export async function mudarStatusAnuncioAction(
  anuncioId: string,
  status: "ativo" | "pausado" | "encerrado",
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  if (w.user.exemplo) return { ok: false, erro: AVISO_CONTA_EXEMPLO };

  const sb = await createServerClient();
  // Sem `.eq("prestador_id", ...)`: a policy `anuncios_update_prestador` já
  // restringe a linha ao dono — se o id não existir ou não for dele, a
  // atualização simplesmente não acha linha (`data` vem null), sem erro.
  const { data, error } = await sb
    .from("anuncios")
    .update({ status })
    .eq("id", anuncioId)
    .select("id")
    .maybeSingle();
  if (error) {
    logAction("mudar_status_anuncio", { userId: w.user.id, anuncioId, status, result: "erro", code: error.code });
    return { ok: false, erro: traduzirErroAnuncio(error) };
  }
  if (!data) return { ok: false, erro: "Anúncio não encontrado." };

  logAction("mudar_status_anuncio", { userId: w.user.id, anuncioId, status, result: "ok" });
  revalidatePath("/anuncios");
  revalidatePath(`/perfil/${w.user.id}`);
  revalidatePath("/");
  return { ok: true };
}
