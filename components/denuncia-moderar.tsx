"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderarDenunciaAction, type DenunciaStatus } from "@/lib/actions/denuncias";
import { FormError } from "@/components/ui";

export function DenunciaModerar({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resolucao, setResolucao] = useState("");

  const encerrada = status === "resolvida" || status === "descartada";

  function moderar(novo: DenunciaStatus) {
    setErro(null);
    start(async () => {
      const r = await moderarDenunciaAction(id, novo, resolucao);
      if (r.ok) router.refresh();
      else setErro(r.erro ?? "Erro ao moderar.");
    });
  }

  if (encerrada) {
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => moderar("aberta")} disabled={pending} className="text-xs font-medium text-brand hover:underline">
          Reabrir
        </button>
        {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <label className="sr-only" htmlFor={`resolucao-${id}`}>
        Nota da moderação
      </label>
      <textarea
        id={`resolucao-${id}`}
        name={`resolucao-${id}`}
        value={resolucao}
        onChange={(e) => setResolucao(e.target.value)}
        placeholder="Nota da moderação (opcional)…"
        rows={2}
        className="input text-xs"
      />
      <div className="flex flex-wrap gap-2">
        {status === "aberta" ? (
          <button onClick={() => moderar("em_analise")} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs">
            Em análise
          </button>
        ) : null}
        <button onClick={() => moderar("descartada")} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs">
          Descartar
        </button>
        <button onClick={() => moderar("resolvida")} disabled={pending} className="btn-action px-3 py-1.5 text-xs">
          Resolver
        </button>
      </div>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
