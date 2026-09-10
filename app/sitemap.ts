import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Sitemap mínimo (Fatia 2, lote 2C) — só as páginas públicas com valor de
 * indexação: landing, cadastro, login e as páginas legais (parecer de
 * marketing, vistoria 10/09/2026). URL base de `getSiteUrl` (D-020: o app
 * ainda não tem domínio fixo).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const agora = new Date();
  return [
    { url: `${base}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cadastro`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: agora, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
