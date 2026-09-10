"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { mailtoSuporte } from "@/lib/contato";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Folha de conta do rodapé mobile.
 *
 * Existe porque "Sair" só morava na sidebar `hidden md:flex`: abaixo de 768px
 * não havia nenhuma forma de sair da conta. Num app mobile-first, isso é falha
 * de saída, não de conveniência.
 */
export function ContaSheet({
  perfilHref,
  nome,
  children,
  className = "",
}: {
  perfilHref: string;
  nome: string | null;
  /**
   * Herdado do call site (components/nav.tsx, fora do escopo deste lote) —
   * a folha de conta não usa mais este sinal. O link "Minhas diárias" (v1)
   * saiu daqui pra qualquer papel: candidatura de ajudante é rota de trabalho
   * do prestador, não item de conta — se ainda fizer sentido pra ele, o lugar
   * é a navegação principal (nav.tsx `meio`), não esta folha. Mantido na
   * assinatura só para o `<ContaSheet mostrarDiarias={...}>` existente
   * continuar tipando; remover exigiria tocar em nav.tsx, fora do escopo
   * (fatia 3, lote B).
   */
  mostrarDiarias: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  const fechar = () => ref.current?.close();

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className}>
        {children}
      </button>

      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby="conta-titulo"
        className="mb-0 w-full max-w-lg rounded-t-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40 sm:mb-auto sm:rounded-2xl"
      >
        <div className="flex flex-col gap-1 p-4">
          <h2 id="conta-titulo" className="px-2 pb-2 text-sm font-semibold text-muted">
            {nome ?? "Sua conta"}
          </h2>
          <Link
            href={perfilHref}
            onClick={fechar}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Meu perfil e avaliações
          </Link>
          <Link
            href="/perfil/editar"
            onClick={fechar}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Editar perfil e foto
          </Link>
          <a
            href={mailtoSuporte()}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Falar com o suporte
          </a>
          <Link
            href="/termos"
            onClick={fechar}
            className="flex min-h-11 items-center rounded-xl px-3 text-sm text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Termos e privacidade
          </Link>
          {/* Não fecha a folha ao alternar: assim a pessoa vê o tema mudar na hora. */}
          <ThemeToggle
            mostrarRotulo
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await logoutAction();
                router.push("/login");
              })
            }
            className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm text-danger hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {pending ? "Saindo…" : "Sair da conta"}
          </button>
          <button type="button" onClick={fechar} className="btn-ghost mt-2 w-full">
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
