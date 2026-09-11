import type { createServerClient } from "@/lib/supabase/server";

/** Uma linha do catálogo `tipos_servico` (migration 0047) — o tipo de trabalho feito num serviço. */
export interface TipoServico {
  slug: string;
  nome: string;
  ordem: number;
}

/**
 * Lê o catálogo de tipos de serviço, na ordem de exibição (`ordem`, "Outros"
 * sempre por último). Repetido em três lugares (reserva do cliente, detalhe
 * do prestador, gráfico de faturamento) — centralizado aqui pra não desviar
 * a query em cada um. Leitura pública (RLS libera `anon`), então qualquer
 * client Supabase serve, sessão ou não.
 */
export async function listarTiposServico(
  sb: Awaited<ReturnType<typeof createServerClient>>,
): Promise<TipoServico[]> {
  const { data } = await sb.from("tipos_servico").select("slug, nome, ordem").order("ordem", { ascending: true });
  return data ?? [];
}
