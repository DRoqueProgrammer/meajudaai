import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Footer } from "@/components/footer";

/**
 * Chrome compartilhado das páginas legais (Termos, Privacidade). Públicas — o
 * cadastro linka para elas antes de existir sessão (ver middleware). Coluna
 * estreita para leitura; a tipografia vem da classe `.legal` em globals.css.
 */
/** Layout das páginas legais (termos e privacidade), com cabeçalho simples e link de volta. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* `gap-x-2` entre logo e nav: sem isso "Aí" (fim da logo) colava em
          "Termos" (início da nav). `flex-wrap` garante que a nav desça pra
          uma 2ª linha em vez de cortar em 390px (hoje 405px sem isso) — ver
          quick win 1 do parecer de design da vistoria. */}
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Início do Me Ajuda Aí" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Logo />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link href="/termos" className="text-muted hover:text-brand">
              Termos
            </Link>
            <Link href="/privacidade" className="text-muted hover:text-brand">
              Privacidade
            </Link>
            <ThemeToggle className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
          </nav>
        </div>
      </header>
      {/* flex-1: em página curta, o rodapé fica no fim da tela. */}
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-10">{children}</main>
      <Footer />
    </div>
  );
}
