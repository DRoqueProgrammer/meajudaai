import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Regras de indexação (Fatia 2, lote 2C) — hoje zero (parecer de marketing,
 * vistoria 10/09/2026). Libera só a landing e as páginas públicas de
 * autenticação/legal; bloqueia `/api` e toda rota que só existe com sessão
 * (grupo `app/(app)`) — inclusive `/prestador/[id]`, que hoje redireciona pra
 * `/login` sem sessão. `/auth` (callback de confirmação) e `/convite` (link
 * de convite com token) também ficam de fora: não têm valor de busca e o
 * token na URL não deveria circular indexado. A URL base vem de `getSiteUrl`
 * (D-020: o app ainda não tem domínio fixo, isso é configuração do deploy).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/convite/",
        // Grupo app/(app) — só existe com sessão.
        "/admin",
        "/agenda",
        "/avaliar",
        "/buscar-prestador",
        "/chat",
        "/clientes",
        "/equipe",
        "/financeiro",
        "/inicio",
        "/mapa",
        "/mensagens",
        "/meus-servicos",
        "/minhas-diarias",
        "/minhas-vagas",
        "/notificacoes",
        "/perfil",
        "/prestador",
        "/publicar",
        "/reativar",
        "/relatorios",
        "/vagas",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
