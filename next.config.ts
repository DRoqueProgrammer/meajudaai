import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Esconde o overlay "N" do dev server (canto inferior) — só aparece em
  // `next dev`, mas polui print/demonstração pro cliente.
  devIndicators: false,
  experimental: {
    serverActions: {
      // Padrão do Next é 1 MB — pequeno demais pra foto de perfil (até 2 MB,
      // ver lib/actions/auth.ts e lib/actions/perfil.ts) mais o resto dos
      // campos do formulário no mesmo corpo multipart.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
