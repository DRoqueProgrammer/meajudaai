"use client";

import { useTransition } from "react";
import { desativarMinhaContaAction } from "@/lib/actions/auth";

/** Zona de risco: desativa a própria conta (nunca deleta — ROADMAP.md §3). Reativa ao logar de novo. */
export function DesativarContaBotao() {
  const [pending, start] = useTransition();

  return (
    <div className="mt-6 flex flex-col gap-1 rounded-2xl border border-danger/30 p-4">
      <p className="text-sm font-semibold text-danger">Zona de risco</p>
      <p className="text-xs leading-relaxed text-muted">
        Desativar não apaga nada — você pode voltar a qualquer momento fazendo login de novo, e
        tudo continua do ponto onde parou.
      </p>
      <button
        type="button"
        disabled={pending}
        className="btn-ghost mt-2 self-start px-4 text-xs text-danger"
        onClick={() => {
          if (!window.confirm("Desativar sua conta agora?")) return;
          start(() => desativarMinhaContaAction());
        }}
      >
        {pending ? "Desativando…" : "Desativar minha conta"}
      </button>
    </div>
  );
}
