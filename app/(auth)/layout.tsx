import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Chrome das rotas de autenticação (login, cadastro, recuperação de senha).
 *
 * Essas telas são colunas centralizadas, sem o cabeçalho da landing nem a
 * navegação do app — então o alternador de tema fica num botão fixo no canto,
 * para que quem chega direto no login também possa trocar claro/escuro.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed right-3 top-3 z-30">
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-muted shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
      </div>
      {children}
    </>
  );
}
