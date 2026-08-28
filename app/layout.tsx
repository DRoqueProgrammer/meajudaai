import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeAjuda Aí",
  description: "A ajuda que você precisa, no momento que você mais precisa.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MeAjuda Aí" },
};

/** Pinta a barra do navegador com o azul da marca quando instalado. */
export const viewport: Viewport = {
  themeColor: "#0D47A1",
  width: "device-width",
  initialScale: 1,
  // Sem maximumScale: travar o zoom quebra quem depende dele para enxergar.
  viewportFit: "cover",
};

/** Root layout: metadata, fonte Poppins, viewport e casca PWA aplicados a todas as rotas. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe data-theme no <html> antes da
    // hidratação, então o atributo diverge do HTML do servidor de propósito.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Reaplica o tema salvo ANTES da pintura (sem flash). Padrão é claro:
            só marca o <html> quando a escolha salva é "dark". A chave precisa
            casar com CHAVE_TEMA em components/theme-toggle.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('maa-tema')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
