import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem de Open Graph/Twitter Card (Fatia 2, lote 2C) — Next resolve este
 * arquivo pra `og:image`/`twitter:image` de toda página que não sobrescreve
 * (ver `app/layout.tsx`). Sem foto: só a identidade visual (azul #0D47A1,
 * amarelo #FFC107 de acento — CLAUDE.md) e uma linha curta do produto, pra um
 * link colado num grupo do bairro já chegar com cara de aplicativo (parecer de
 * marketing, vistoria 10/09/2026). Fonte padrão (sans-serif do satori) em vez
 * do Poppins de propósito: evita depender de buscar o arquivo da fonte a cada
 * geração da imagem.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0D47A1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              width: 100,
              height: 100,
              borderRadius: 22,
              backgroundColor: "#071B3D",
            }}
          />
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "#ffffff" }}>
            Me Ajuda <span style={{ color: "#FFC107" }}>Aí</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 40, maxWidth: 900, fontSize: 32, color: "#DCE6F8" }}>
          Encontre um prestador de serviço perto de você e marque um horário direto na agenda dele.
        </div>
        <div style={{ display: "flex", marginTop: 48, width: 140, height: 10, borderRadius: 6, backgroundColor: "#FFC107" }} />
      </div>
    ),
    { ...size },
  );
}
