"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { candidatarAction, cancelarCandidaturaAction } from "@/lib/actions/candidaturas";
import { FormError } from "@/components/ui";

export function CandidatarButton({
  vagaId,
  candidaturaId,
  candidaturaStatus,
}: {
  vagaId: string;
  candidaturaId?: string;
  candidaturaStatus?: string;
}) {
  const router = useRouter();
  const [feito, setFeito] = useState(!!candidaturaId);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Só dá para retirar enquanto ninguém respondeu. Depois de aceito, sumir sem
  // avisar deixa o profissional sem ajudante na véspera — isso se resolve no chat.
  const podeRetirar = !!candidaturaId && candidaturaStatus === "aguardando";

  if (feito) {
    return (
      <div className="flex flex-col gap-2">
        <p className="btn bg-surface text-muted">Candidatura enviada <span aria-hidden="true">✓</span></p>
        {podeRetirar && !confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="min-h-11 text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Retirar candidatura
          </button>
        ) : null}
        {confirmando ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-3">
            <p className="text-sm">
              Retirar sua candidatura? O profissional deixa de ver seu nome nesta vaga.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={pending}
                className="btn-ghost px-4 text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={pending}
                className="btn-ghost border-danger px-4 text-xs text-danger"
                onClick={() =>
                  start(async () => {
                    const r = await cancelarCandidaturaAction(candidaturaId!);
                    if (r.ok) {
                      setFeito(false);
                      setConfirmando(false);
                      router.refresh();
                    } else
                      setErro(
                        r.erro ?? "Não foi possível retirar agora. Pode ter sido a internet — tente de novo.",
                      );
                  })
                }
              >
                {pending ? "Retirando…" : "Retirar"}
              </button>
            </div>
          </div>
        ) : null}
        {erro ? <FormError>{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn-action w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await candidatarAction(vagaId);
            if (r.ok) {
              setFeito(true);
              router.refresh();
            } else
              setErro(
                r.erro ?? "Não foi possível enviar sua candidatura. Pode ter sido a internet — tente de novo.",
              );
          })
        }
      >
        {pending ? "Enviando…" : "ME CANDIDATAR"}
      </button>
      {erro ? <FormError className="mt-1">{erro}</FormError> : null}
    </div>
  );
}
