"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusVagaAction } from "@/lib/actions/vagas";
import { FormError } from "@/components/ui";

/**
 * Cancelar a vaga. O status `cancelada` já existia no schema e nas abas de
 * /minhas-vagas — só não havia como chegar nele pela interface.
 * Confirmação obrigatória: cancelar avisa todo mundo que já se candidatou.
 */
export function CancelarVaga({ vagaId, candidatos }: { vagaId: string; candidatos: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="min-h-11 self-start text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Cancelar esta vaga
        </button>
        {erro ? <FormError>{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-danger bg-tint-danger p-3">
      <p className="text-sm">
        Cancelar esta diária?{" "}
        {candidatos > 0
          ? `${candidatos} pessoa${candidatos === 1 ? "" : "s"} já se candidatou e vai ser avisada.`
          : "A vaga sai do ar e ninguém mais consegue se candidatar."}
      </p>
      <p className="text-xs text-muted">Não dá para reabrir depois — você teria que publicar de novo.</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="btn-ghost px-4 text-xs"
        >
          Manter vaga
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-ghost border-danger px-4 text-xs text-danger"
          onClick={() =>
            start(async () => {
              const r = await mudarStatusVagaAction(vagaId, "cancelada");
              if (r.ok) {
                setConfirmando(false);
                router.refresh();
              } else setErro(r.erro ?? "Não foi possível cancelar.");
            })
          }
        >
          {pending ? "Cancelando…" : "Cancelar vaga"}
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
