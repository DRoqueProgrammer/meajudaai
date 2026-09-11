"use client";

import { useState, useTransition } from "react";
import { decidirPagamentoAction } from "@/lib/actions/comissao";
import { FormError } from "@/components/ui";

/**
 * Confirmar ou recusar um pagamento de comissão "informado" (o prestador
 * clicou "Enviei o Pix"). A observação é opcional — serve tanto para anotar
 * "recebi às 14h" quanto, na recusa, "não caiu" (D-044). Confirmado, as
 * comissões viram pagas; recusado, voltam a em aberto — a action já faz isso.
 */
export function PagamentoDecidirForm({ pagamentoId }: { pagamentoId: string }) {
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [decidido, setDecidido] = useState(false);
  const [pending, start] = useTransition();

  function decidir(confirmar: boolean) {
    setErro(null);
    start(async () => {
      const r = await decidirPagamentoAction(pagamentoId, confirmar, observacao.trim() || undefined);
      if (r.ok) setDecidido(true);
      else setErro(r.erro ?? "Não foi possível registrar a decisão.");
    });
  }

  if (decidido) {
    return <p className="text-sm text-ok">Decisão registrada.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className="input text-sm"
        placeholder="Observação (opcional) — ex.: não caiu"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        maxLength={300}
        aria-label="Observação da decisão"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => decidir(true)} className="btn-action">
          {pending ? "Registrando…" : "Confirmar recebimento"}
        </button>
        <button type="button" disabled={pending} onClick={() => decidir(false)} className="btn-ghost">
          Recusar
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
