"use client";

import { useState, useTransition } from "react";
import { registrarRecebimentoAction } from "@/lib/actions/comissao";
import { FormError } from "@/components/ui";

/**
 * "Registrar recebimento": o Administrador quita o saldo em aberto de um
 * prestador que pagou por fora do fluxo normal ("Enviei o Pix") — ex.: em
 * dinheiro. Confirmação em DOIS PASSOS (sem `window.confirm`, que trava em
 * SSR e é feio): o primeiro clique abre a explicação e o botão de fato; só o
 * segundo clique escreve no banco.
 */
export function RegistrarRecebimentoBotao({
  workspaceId,
  prestadorId,
}: {
  workspaceId: string;
  prestadorId: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [pending, start] = useTransition();

  if (feito) return <p className="text-xs text-ok">Recebimento registrado.</p>;

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="btn-ghost text-xs">
        Registrar recebimento
      </button>
    );
  }

  function confirmar() {
    setErro(null);
    start(async () => {
      const r = await registrarRecebimentoAction({ workspaceId, prestadorId, observacao: observacao.trim() || undefined });
      if (r.ok) setFeito(true);
      else setErro(r.erro ?? "Não foi possível registrar o recebimento.");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <p className="text-xs text-muted">
        Para quando ele pagou por fora do &ldquo;Enviei o Pix&rdquo;, ex.: em dinheiro. Confirma que recebeu o
        saldo em aberto deste prestador?
      </p>
      <input
        className="input text-xs"
        placeholder="Observação (opcional)"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        maxLength={300}
      />
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={confirmar} className="btn-action">
          {pending ? "Registrando…" : "Sim, recebi"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirmando(false)} className="btn-ghost">
          Cancelar
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
