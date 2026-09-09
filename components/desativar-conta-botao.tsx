"use client";

import { useTransition } from "react";
import { desativarMinhaContaAction } from "@/lib/actions/auth";

/** Zona de risco: desativa a própria conta (nunca deleta — ROADMAP.md §3). Reativa ao logar de novo. */
export function DesativarContaBotao() {
  const [pending, start] = useTransition();

  return (
    // `mt-12 border-t pt-8`: a zona de risco precisa de distância real do botão
    // SALVAR — logo abaixo dele (só `mt-6`) dava pra confundir os dois cliques
    // num formulário que termina com um botão cheio e chamativo.
    <div className="mt-12 flex flex-col gap-1 border-t border-line pt-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-danger">Zona de risco</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Desativar não apaga nada — você pode voltar a qualquer momento fazendo login de novo, e
        tudo continua do ponto onde parou.
      </p>
      <button
        type="button"
        disabled={pending}
        className="btn-ghost mt-3 self-start border-danger/40 px-4 text-xs text-danger hover:bg-tint-danger"
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
