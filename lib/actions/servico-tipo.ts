"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/**
 * Prestador recategoriza o TIPO de um serviço já nascido — a única mudança
 * que o gatilho de transição (migration 0047, `validar_transicao_servico`)
 * libera em qualquer estado do serviço, inclusive "realizado" (é o que
 * alimenta, retroativamente, o gráfico de faturamento por tipo). O cliente
 * também pode mudar o tipo, mas só enquanto o serviço está pendente — essa
 * combinação nasce junto com o serviço, no formulário de reserva
 * (`reservarSlotAction`), não aqui: esta action é só do prestador.
 *
 * A validação do slug contra o catálogo já existe no banco (FK
 * `servicos.tipo → tipos_servico.slug`); repetimos aqui só pra devolver um
 * erro claro em vez do erro genérico de FK.
 */
export async function recategorizarServicoAction(servicoId: string, tipo: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };

  const sb = await createServerClient();
  const { data: tipoValido } = await sb.from("tipos_servico").select("slug").eq("slug", tipo).maybeSingle();
  if (!tipoValido) return { ok: false, erro: "Tipo de serviço inválido." };

  const { data: servico } = await sb.from("servicos").select("id, prestador_id").eq("id", servicoId).maybeSingle();
  if (!servico || servico.prestador_id !== w.user.id) return { ok: false, erro: "Serviço não encontrado." };

  const { error } = await sb.from("servicos").update({ tipo }).eq("id", servico.id);
  if (error) return { ok: false, erro: "Não foi possível recategorizar." };

  revalidatePath("/agenda");
  return { ok: true };
}
