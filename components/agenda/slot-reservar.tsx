"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { reservarSlotAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatData, formatHora } from "@/lib/format";
import type { AddressValue } from "@/components/maps/address-map-picker";

const AddressMapPicker = dynamic(() => import("@/components/maps/address-map-picker").then((m) => m.AddressMapPicker), {
  ssr: false,
  loading: () => <p className="text-xs text-muted">Carregando mapa…</p>,
});

/**
 * Card de um horário livre — cliente clica, descreve o que precisa e marca o
 * endereço daquele serviço específico e reserva. O endereço é POR SERVIÇO,
 * não o do perfil: o mesmo cliente pode pedir serviço em lugares diferentes
 * (a própria casa, a de um parente, o escritório).
 */
export function SlotReservar({ slot }: { slot: { id: string; data: string; hora_inicio: string; hora_fim: string } }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState<AddressValue>({ endereco: "", lat: null, lng: null });
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
          <div>
            <p className="label">Onde é o serviço?</p>
            <AddressMapPicker onChange={setEndereco} />
          </div>
          {erro ? <FormError>{erro}</FormError> : null}
          <button
            type="button"
            disabled={pending || !descricao.trim() || !endereco.endereco.trim() || endereco.lat == null || endereco.lng == null}
            className="btn-action self-start px-4 text-xs"
            onClick={() =>
              start(async () => {
                const r = await reservarSlotAction({
                  slotId: slot.id,
                  descricao,
                  endereco: endereco.endereco,
                  lat: endereco.lat!,
                  lng: endereco.lng!,
                });
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
