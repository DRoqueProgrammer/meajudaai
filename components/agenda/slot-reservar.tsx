"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { reservarSlotAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatData, formatHora } from "@/lib/format";
import type { AddressValue } from "@/components/maps/address-map-picker";
import type { TipoServico } from "@/lib/tipos-servico";

const AddressMapPicker = dynamic(() => import("@/components/maps/address-map-picker").then((m) => m.AddressMapPicker), {
  ssr: false,
  loading: () => <p className="text-xs text-muted">Carregando mapa…</p>,
});

export interface SlotBasico {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
}

/**
 * Formulário de reserva de UM horário já escolhido no `<SlotPicker>`: cliente
 * descreve o que precisa e marca o endereço daquele serviço específico
 * (POR SERVIÇO, não o do perfil — o mesmo cliente pode pedir serviço em
 * lugares diferentes, a própria casa, a de um parente, o escritório) e
 * reserva, e AGORA (0047) escolhe o tipo do serviço (obrigatório) — é o que
 * empilha o gráfico de faturamento do prestador. Chama `reservarSlotAction`
 * (contrato de `lib/actions/agenda-v2.ts`, que só ganhou o campo `tipo`).
 */
export function SlotReservar({ slot, tipos }: { slot: SlotBasico; tipos: TipoServico[] }) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("");
  const [endereco, setEndereco] = useState<AddressValue>({ endereco: "", lat: null, lng: null });
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [reservado, setReservado] = useState(false);

  if (reservado) {
    return (
      <div className="card text-sm text-action" role="status">
        Pedido enviado! O prestador vai confirmar em breve.
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">
        Horário selecionado: {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
      </p>
      <textarea
        className="input"
        rows={3}
        placeholder="O que você precisa?"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <div>
        <label className="label" htmlFor={`tipo-servico-${slot.id}`}>
          Tipo de serviço
        </label>
        <select
          id={`tipo-servico-${slot.id}`}
          className="input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          required
        >
          <option value="" disabled>
            — selecione —
          </option>
          {tipos.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="label">Onde é o serviço?</p>
        <AddressMapPicker onChange={setEndereco} />
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
      <button
        type="button"
        disabled={
          pending || !descricao.trim() || !tipo || !endereco.endereco.trim() || endereco.lat == null || endereco.lng == null
        }
        className="btn-action self-start px-4 text-xs"
        onClick={() =>
          start(async () => {
            const r = await reservarSlotAction({
              slotId: slot.id,
              descricao,
              endereco: endereco.endereco,
              lat: endereco.lat!,
              lng: endereco.lng!,
              tipo,
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
  );
}
