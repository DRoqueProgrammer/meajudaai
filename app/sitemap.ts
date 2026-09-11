import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Sitemap mínimo (Fatia 2, lote 2C) — só as páginas públicas com valor de
 * indexação: landing, cadastro, login, as páginas legais (parecer de
 * marketing, vistoria 10/09/2026) e, a partir da Fatia 5, a página pública de
 * cada prestador com anúncio ativo (`/p/[id]`). URL base de `getSiteUrl`
 * (D-020: o app ainda não tem domínio fixo).
 *
 * A lista de prestadores vem de `anuncios_publicos` (RPC liberada para
 * `anon`, migrations 0044/0045) — o sitemap nunca usa a chave de serviço,
 * igual ao resto da vitrine pública.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const agora = new Date();

  const sb = await createServerClient();
  const { data: anuncios } = await sb.rpc("anuncios_publicos", { p_limite: 60 });
  const prestadorIds = [...new Set((anuncios ?? []).map((a) => a.prestador_id))];

  return [
    { url: `${base}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cadastro`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: agora, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    ...prestadorIds.map((id) => ({
      url: `${base}/p/${id}`,
      lastModified: agora,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
