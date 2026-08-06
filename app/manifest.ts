import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA. O projeto se declarava PWA no CLAUDE.md e não tinha
 * manifesto nem ícone — não era instalável. Ícones vêm de app/icon.svg,
 * gerado pelo Next em /icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MeAjuda Aí",
    short_name: "MeAjuda Aí",
    description: "A ajuda que você precisa, no momento que você mais precisa.",
    start_url: "/inicio",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F7FA",
    theme_color: "#0D47A1",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
