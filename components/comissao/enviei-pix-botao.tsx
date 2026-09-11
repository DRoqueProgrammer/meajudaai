"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { informarPagamentoAction } from "@/lib/actions/comissao";
import { formatBRL } from "@/lib/format";
import { FormError } from "@/components/ui";

/**
 * Botão "Enviei o Pix" da tela `/comissao` (D-044): pede uma confirmação
 * explícita com o valor e o nome de quem recebe antes de chamar a action —
 * um clique aqui trava o saldo em "informada" até a administração decidir,
 * então evita o clique acidental (mesmo padrão de duas etapas de
 * `components/pix/chaves-pix.tsx` na exclusão de chave).
 */
export function EnvieiPixBotao({ valor, recebedor }: { valor: number; recebedor: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    setErro(null);
    start(async () => {
      const r = await informarPagamentoAction();
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível informar o pagamento. Tente de novo.");
        return;
      }
      setConfirmando(false);
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="btn-brand h-11 w-full sm:w-auto sm:px-8">
        Enviei o Pix
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-[340px] flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left">
      <p className="text-sm leading-relaxed">
        Confirmo que enviei <strong className="font-semibold text-ink">{formatBRL(valor)}</strong> para{" "}
        <strong className="font-semibold text-ink">{recebedor}</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={enviar} className="btn-brand h-11 flex-1 px-4 text-sm">
          {pending ? "Enviando…" : "Sim, enviei"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirmando(false)} className="btn-ghost h-11 px-4 text-sm">
          Cancelar
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
