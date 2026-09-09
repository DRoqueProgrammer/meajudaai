import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Esconde o overlay "N" do dev server (canto inferior) — só aparece em
  // `next dev`, mas polui print/demonstração pro cliente.
  devIndicators: false,
};

export default nextConfig;
