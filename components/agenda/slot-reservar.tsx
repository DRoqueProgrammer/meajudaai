"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { reservarSlotAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatData, formatHora } from "@/lib/format";
import type { AddressValue } from "@/components/maps/address-map-picker";
import type { TipoServico } from "@/lib/tipos-servico";
import { PERIODOS, periodosDaJanela, type PeriodoPreferido } from "@/lib/periodo-da-visita";

const AddressMapPicker = dynamic(() => import("@/components/maps/address-map-picker").then((m) => m.AddressMapPicker), {
  ssr: false,
  loading: () => <p className="text-xs text-muted">Carregando mapa…</p>,
});

/** A maior de duas horas "HH:MM[:SS]" (em "HH:MM") — recorta o período pela janela. */
function maxHora(a: string, b: string): string {
  return (a.slice(0, 5) > b.slice(0, 5) ? a : b).slice(0, 5);
}

/** A menor de duas horas "HH:MM[:SS]" (em "HH:MM"); "24:00" vira o fim da janela. */
function minHora(a: string, b: string): string {
  return (a.slice(0, 5) < b.slice(0, 5) ? a : b).slice(0, 5);
}

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
 * empilha o gráfico de faturamento do prestador — e diz quando prefere a visita
 * dentro da janela da agenda aberta (0050: manhã, tarde, noite ou tanto faz;
 * a hora certa o prestador marca depois de combinar, 0051). Chama
 * `reservarSlotAction` (lib/actions/agenda-v2.ts).
 */
export function SlotReservar({ slot, tipos }: { slot: SlotBasico; tipos: TipoServico[] }) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("");
  // Períodos que a janela cobre (0050): com um só, não há o que escolher.
  const periodos = periodosDaJanela(slot.hora_inicio, slot.hora_fim);
  const [periodo, setPeriodo] = useState<PeriodoPreferido>("qualquer");
  const [endereco, setEndereco] = useState<AddressValue>({ endereco: "", lat: null, lng: null });
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [reservado, setReservado] = useState(false);

  if (reservado) {
    return (
      <div className="card text-sm text-action" role="status">
        Pedido enviado! O prestador vai confirmar e combinar a hora da visita com você.
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">
        Horário selecionado: {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
      </p>
      <p className="-mt-1 text-xs leading-relaxed text-muted">
        A agenda do prestador está aberta nessa faixa. Diga quando prefere a visita — vocês combinam a hora certa
        depois, e ela aparece na agenda dos dois.
      </p>
      <div>
        <label className="label" htmlFor={`descricao-${slot.id}`}>
          O que você precisa?
        </label>
        <textarea
          id={`descricao-${slot.id}`}
          className="input"
          rows={3}
          placeholder="Descreva o serviço. Se tiver um horário de preferência, conte aqui (ex.: depois das 14h)."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      {periodos.length > 1 ? (
        <fieldset>
          <legend className="label">Quando prefere a visita?</legend>
          <div role="radiogroup" aria-label="Quando prefere a visita?" className="flex flex-wrap gap-2">
            {[...periodos, "qualquer" as const].map((p) => {
              const info = PERIODOS.find((x) => x.slug === p);
              const faixa = info
                ? `${maxHora(info.inicio, slot.hora_inicio)}–${minHora(info.fim, slot.hora_fim)}`
                : null;
              const ativo = periodo === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setPeriodo(p)}
                  className={`chip ${ativo ? "chip-on" : "chip-off"}`}
                >
                  {info ? `${info.nome} (${faixa})` : "Tanto faz"}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
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
              periodoPreferido: periodos.length > 1 ? periodo : periodos[0] ?? "qualquer",
            });
            if (r.ok) {
              setReservado(true);
              router.refresh();
            } else setErro(r.erro ?? "Não foi possível reservar.");
          })
        }
      >
        {pending ? "Enviando…" : "Enviar pedido"}
      </button>
    </div>
  );
}
