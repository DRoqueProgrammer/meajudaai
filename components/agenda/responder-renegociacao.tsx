"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderRenegociacaoAction } from "@/lib/actions/agenda-v2";
import { formatBRL } from "@/lib/format";

/** Cliente aceita ou recusa uma proposta de renegociação de valor. */
export function ResponderRenegociacao({ servicoId, precoPendente }: { servicoId: string; precoPendente: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function responder(aceitar: boolean) {
    start(async () => {
      await responderRenegociacaoAction({ servicoId, aceitar });
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-accent bg-tint-warn p-2 text-sm">
      <p className="text-tint-warn-ink">O prestador propôs um novo valor: {formatBRL(precoPendente)}</p>
      <div className="mt-1.5 flex gap-2">
        <button type="button" disabled={pending} onClick={() => responder(true)} className="btn-action px-3 py-1 text-xs">
          Aceitar
        </button>
        <button type="button" disabled={pending} onClick={() => responder(false)} className="btn-ghost px-3 py-1 text-xs">
          Recusar
        </button>
      </div>
    </div>
  );
}
