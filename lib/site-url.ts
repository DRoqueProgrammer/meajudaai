import { headers } from "next/headers";

/**
 * Origem canônica do app, para montar links que saem por e-mail.
 *
 * Ordem: `NEXT_PUBLIC_SITE_URL` primeiro, cabeçalho `origin` depois.
 *
 * O cabeçalho sozinho não serve em produção: atrás de proxy/CDN ele pode vir
 * ausente ou com o host interno, e aí o link de recuperação de senha aponta
 * para um endereço que o usuário não consegue abrir. Como o link precisa estar
 * na allow-list de Redirect URLs do Supabase, ele tem que ser previsível — e
 * variável de ambiente é previsível, cabeçalho não.
 */
export async function getSiteUrl(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");

  const origem = (await headers()).get("origin");
  if (origem) return origem.replace(/\/+$/, "");

  return "http://localhost:3000";
}
