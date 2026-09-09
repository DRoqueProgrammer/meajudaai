"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarServicoAction } from "@/lib/actions/agenda-v2";

/** Botão de cancelar um serviço — pede justificativa (usado pelo cliente e pelo prestador). */
export function CancelarServicoBotao({ servicoId }: { servicoId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost self-start px-3 text-xs text-danger"
      onClick={() => {
        const motivo = window.prompt("Justificativa do cancelamento:");
        if (!motivo) return;
        start(async () => {
          await cancelarServicoAction({ servicoId, motivo });
          router.refresh();
        });
      }}
    >
      {pending ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
