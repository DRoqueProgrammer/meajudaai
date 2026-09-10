import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { getSiteUrl } from "@/lib/site-url";

// next/font/google baixa a fonte NA BUILD e serve do próprio domínio — sem isso,
// o navegador de todo visitante pedia fonts.googleapis.com/fonts.gstatic.com
// direto, mandando o IP dele ao Google antes de qualquer consentimento (parecer
// LGPD, vistoria 10/09/2026). Mesmos pesos do `<link>` que ela substitui; a
// CSS variable é consumida por `fontFamily.sans` em tailwind.config.ts.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const DESCRICAO =
  "Encontre um prestador de serviço perto de você e marque um horário direto na agenda dele — sem grupo de WhatsApp, sem mural de vagas, sem esperar candidatura.";

/**
 * Metadata do site: título com template (páginas internas podem sobrescrever
 * só a parte específica), Open Graph e Twitter Card (a imagem vem do
 * `app/opengraph-image.tsx`) — sem isso, colar o link num grupo do bairro
 * chegava sem imagem nem descrição (parecer de marketing, vistoria
 * 10/09/2026). A URL base é `getSiteUrl` (D-020: o app ainda não tem domínio
 * fixo — vem de configuração do deploy).
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = await getSiteUrl();
  return {
    metadataBase: new URL(base),
    title: { default: "Me Ajuda Aí", template: "%s · Me Ajuda Aí" },
    description: DESCRICAO,
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Me Ajuda Aí" },
    openGraph: {
      title: "Me Ajuda Aí",
      description: DESCRICAO,
      url: base,
      siteName: "Me Ajuda Aí",
      locale: "pt_BR",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Me Ajuda Aí" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Me Ajuda Aí",
      description: DESCRICAO,
      images: ["/opengraph-image"],
    },
  };
}

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
    <html lang="pt-BR" suppressHydrationWarning className={poppins.variable}>
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
      </head>
      <body className="font-sans antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
