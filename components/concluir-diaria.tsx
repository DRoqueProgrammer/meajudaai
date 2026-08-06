"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusVagaAction } from "@/lib/actions/vagas";
import { FormError } from "@/components/ui";

/**
 * Fecha a diária.
 *
 * O status `finalizada` existia no schema, nas abas de /minhas-vagas e no tipo
 * da action — e nenhuma linha de interface fazia a transição. A timeline tinha
 * 5 etapas e o usuário nunca chegava na 4ª nem na 5ª: a avaliação ficava
 * pendurada num estado inalcançável e o produto não tinha fim.
 *
 * Quem fecha é o profissional: é ele quem sabe se o serviço foi entregue.
 */
export function ConcluirDiaria({
  vagaId,
  ajudante,
  jaPassou,
}: {
  vagaId: string;
  ajudante: string | null;
  /** Antes do dia do serviço, concluir seria mentira. */
  jaPassou: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!jaPassou) {
    return (
      <p className="text-sm text-muted">
        Depois do dia do serviço, você marca a diária como concluída por aqui.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setConfirmando(true)} className="btn-action w-full">
          Marcar diária como concluída
        </button>
        <p className="text-xs text-muted">
          Fecha o serviço e libera a avaliação para os dois lados.
        </p>
        {erro ? <FormError>{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-action-dark bg-[#e7f5e9] p-3">
      <p className="text-sm">
        O serviço {ajudante ? <>de <strong className="font-semibold">{ajudante}</strong></> : null} foi
        entregue?
      </p>
      <p className="text-xs text-muted">
        A diária sai do andamento e vocês dois podem se avaliar. Não dá para reabrir.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="btn-ghost px-4 text-xs"
        >
          Ainda não
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-action px-4 text-xs"
          onClick={() =>
            start(async () => {
              const r = await mudarStatusVagaAction(vagaId, "finalizada");
              if (r.ok) {
                setConfirmando(false);
                router.refresh();
              } else setErro(r.erro ?? "Não foi possível concluir.");
            })
          }
        >
          {pending ? "Concluindo…" : "Sim, foi entregue"}
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
