"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { limparRedFlagsAction } from "@/lib/actions/suspeitas";
import { FormError } from "@/components/ui";

/**
 * Botão "Limpar red flags" (migration 0058, pedido do Leonardo em 11/09/2026):
 * o Administrador tira as red flags de um cliente ou prestador que ele
 * alcança, quando entende que não se justificam mais e estão prejudicando a
 * pessoa — as sinalizações aprovadas continuam registradas (D-045), só saem
 * do perfil. Confirmação em DOIS PASSOS na própria linha, sem o diálogo
 * nativo do navegador (que bloqueia a validação automatizada e falha em
 * alguns navegadores in-app): o primeiro clique troca o botão por um aviso
 * com Confirmar/Cancelar.
 */
export function LimparRedFlags({
  userId,
  nome,
  quantidade,
}: {
  userId: string;
  nome: string;
  quantidade: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (quantidade <= 0) return null;

  function confirmar() {
    setErro(null);
    start(async () => {
      const r = await limparRedFlagsAction(userId);
      if (r.ok) {
        setConfirmando(false);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível limpar as red flags.");
    });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-danger hover:bg-tint-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Limpar red flags
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-tint-danger p-3">
      <p className="text-sm text-danger">
        Limpar as {quantidade} {quantidade === 1 ? "red flag" : "red flags"} de {nome}? Elas saem do perfil, mas
        continuam registradas para a administração.
      </p>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmando(false)}
          className="btn-ghost min-h-11 flex-1 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmar}
          className="btn min-h-11 flex-1 px-3 py-2 text-sm text-danger hover:bg-tint-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {pending ? "Limpando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
