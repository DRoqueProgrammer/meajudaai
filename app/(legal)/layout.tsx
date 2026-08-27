import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Chrome compartilhado das páginas legais (Termos, Privacidade). Públicas — o
 * cadastro linka para elas antes de existir sessão (ver middleware). Coluna
 * estreita para leitura; a tipografia vem da classe `.legal` em globals.css.
 */
/** Layout das páginas legais (termos e privacidade), com cabeçalho simples e link de volta. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Início do MeAjuda Aí" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/termos" className="text-muted hover:text-brand">
              Termos
            </Link>
            <Link href="/privacidade" className="text-muted hover:text-brand">
              Privacidade
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-6 py-10">{children}</main>
    </div>
  );
}
