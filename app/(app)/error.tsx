"use client";

import Link from "next/link";
import { useEffect } from "react";
import { mailtoSuporte } from "@/lib/contato";

/**
 * Erro de rota. Fala do que o usuário pode fazer, não do que quebrou —
 * "Application error: a client-side exception" não ajuda pedreiro nenhum.
 * O detalhe técnico vai para o console, onde é útil para quem depura.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[meajudaai] erro de rota:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold">Essa tela não carregou</h1>
      <p className="text-sm leading-relaxed text-muted">
        Pode ter sido a internet. Tente de novo — nada do que você já fez foi perdido.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn-brand">
          Tentar de novo
        </button>
        <Link href="/inicio" className="btn-ghost">
          Voltar ao início
        </Link>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted">
          Se continuar,{" "}
          <a href={mailtoSuporte(`Erro ${error.digest}`)} className="text-brand underline">
            fale com o suporte
          </a>{" "}
          e informe este código: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
