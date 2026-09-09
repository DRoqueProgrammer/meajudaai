"use client";

import { useState } from "react";
import { SlotDetalhe, type SlotDetalheProps } from "@/components/agenda/slot-detalhe";

const HOUR_PX = 16; // 24h * 16px = 384px de altura total
const MARCOS = [0, 4, 8, 12, 16, 20, 24];

const corPorStatus: Record<string, string> = {
  livre: "border-brand bg-tint-info",
  pendente: "border-accent bg-tint-warn",
  confirmado: "border-action bg-tint-ok",
  cancelado: "border-danger bg-tint-danger",
  realizado: "border-ink bg-tint-neutral",
};

function paraHoras(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

export interface DiaTimelineEvento {
  slot: SlotDetalheProps["slot"];
  servico: SlotDetalheProps["servico"];
  logs: SlotDetalheProps["logs"];
}

/** Agenda do dia como linha do tempo — 00h no topo, meio-dia no meio, 00h nas próximas 24h embaixo; horário pequeno, descrição maior. Clique num bloco expande os detalhes. */
export function DiaTimeline({
  eventos,
  renderDetalhe,
}: {
  eventos: DiaTimelineEvento[];
  /** Card de detalhe do evento selecionado — padrão é o `SlotDetalhe` do prestador; o cliente passa sua própria versão. */
  renderDetalhe?: (evento: DiaTimelineEvento) => React.ReactNode;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  if (eventos.length === 0) {
    return <p className="text-sm text-muted">Nenhum horário nesse dia.</p>;
  }

  const selecionado = eventos.find((e) => e.slot.id === selecionadoId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex">
        <div className="relative w-9 shrink-0" style={{ height: 24 * HOUR_PX }}>
          {MARCOS.map((h) => (
            <span key={h} className="absolute -top-2 text-[9px] text-muted" style={{ top: h * HOUR_PX }}>
              {String(h % 24).padStart(2, "0")}h
            </span>
          ))}
        </div>
        <div className="relative flex-1 border-l border-line" style={{ height: 24 * HOUR_PX }}>
          {MARCOS.map((h) => (
            <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: h * HOUR_PX }} />
          ))}
          {eventos.map((e) => {
            const inicio = paraHoras(e.slot.hora_inicio);
            const fim = paraHoras(e.slot.hora_fim);
            const top = inicio * HOUR_PX;
            const altura = Math.max(20, (fim - inicio) * HOUR_PX);
            const status = e.servico?.status ?? e.slot.status;
            return (
              <button
                key={e.slot.id}
                type="button"
                onClick={() => setSelecionadoId((atual) => (atual === e.slot.id ? null : e.slot.id))}
                className={`absolute left-1 right-1 overflow-hidden rounded-md border-l-4 px-2 py-0.5 text-left transition ${
                  corPorStatus[status] ?? "border-line bg-card"
                } ${selecionadoId === e.slot.id ? "ring-2 ring-brand" : ""}`}
                style={{ top, height: altura }}
              >
                <span className="block text-[10px] text-muted">
                  {e.slot.hora_inicio.slice(0, 5)}–{e.slot.hora_fim.slice(0, 5)}
                </span>
                <span className="block truncate text-sm font-medium text-ink">
                  {e.servico?.descricao ?? "Horário livre"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selecionado ? (
        renderDetalhe ? (
          renderDetalhe(selecionado)
        ) : (
          <SlotDetalhe slot={selecionado.slot} servico={selecionado.servico} logs={selecionado.logs} />
        )
      ) : null}
    </div>
  );
}
