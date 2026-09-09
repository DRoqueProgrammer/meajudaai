"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reservarSlotAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatData, formatHora } from "@/lib/format";

/** Card de um horário livre — cliente clica, descreve o que precisa e reserva. */
export function SlotReservar({ slot }: { slot: { id: string; data: string; hora_inicio: string; hora_fim: string } }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [reservado, setReservado] = useState(false);

  if (reservado) {
    return (
      <div className="card text-sm text-action">
        Pedido enviado! O prestador vai confirmar em breve.
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2">
      <button type="button" onClick={() => setAberto((a) => !a)} className="text-left text-sm font-medium">
        {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
      </button>
      {aberto ? (
        <div className="flex flex-col gap-2 border-t border-line pt-2">
          <textarea
            className="input"
            rows={3}
            placeholder="O que você precisa?"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          {erro ? <FormError>{erro}</FormError> : null}
          <button
            type="button"
            disabled={pending || !descricao.trim()}
            className="btn-action self-start px-4 text-xs"
            onClick={() =>
              start(async () => {
                const r = await reservarSlotAction({ slotId: slot.id, descricao });
                if (r.ok) {
                  setReservado(true);
                  router.refresh();
                } else setErro(r.erro ?? "Não foi possível reservar.");
              })
            }
          >
            {pending ? "Enviando…" : "Reservar horário"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
