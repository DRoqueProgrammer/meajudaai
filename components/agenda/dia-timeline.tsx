"use client";

import { useState } from "react";
import type { SlotDetalheProps } from "@/components/agenda/slot-detalhe";
import { SlotDetalheCliente } from "@/components/agenda/slot-detalhe-cliente";
import { EventoPopover } from "@/components/agenda/evento-popover";
import type { PerfilResumo } from "@/components/perfil-popover";

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
  variant = "prestador",
  prestadoresPorServico,
}: {
  eventos: DiaTimelineEvento[];
  /**
   * "prestador" (padrão) renderiza o `SlotDetalhe` original. "cliente" renderiza
   * `SlotDetalheCliente` — sem ações de prestador (aceitar, log privado). Um
   * componente por variante, não uma função passada de fora: o pai costuma ser
   * um Server Component, e React Server Components não podem passar closures
   * pra Client Components (só dados serializáveis).
   */
  variant?: "prestador" | "cliente";
  /** Necessário só na variant "cliente": perfil resumido do prestador de cada serviço, por id do serviço. */
  prestadoresPorServico?: Record<string, PerfilResumo>;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  if (eventos.length === 0) {
    return <p className="text-sm text-muted">Nenhum horário nesse dia.</p>;
  }

  const selecionado = eventos.find((e) => e.slot.id === selecionadoId) ?? null;

  return (
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

        {/* Card efêmero ancorado logo abaixo do bloco clicado — não empurra o
            resto da tela, fecha sozinho ao clicar fora (ver EventoPopover). */}
        {selecionado
          ? (() => {
              const inicio = paraHoras(selecionado.slot.hora_inicio);
              const fim = paraHoras(selecionado.slot.hora_fim);
              const topPopover = Math.max(0, inicio * HOUR_PX + (fim - inicio) * HOUR_PX + 4);
              return (
                <div className="absolute left-1 z-10" style={{ top: topPopover }}>
                  {variant === "cliente" ? (
                    selecionado.servico && prestadoresPorServico?.[selecionado.servico.id] ? (
                      <SlotDetalheCliente evento={selecionado} prestador={prestadoresPorServico[selecionado.servico.id]!} />
                    ) : (
                      <p className="text-sm text-muted">Horário livre.</p>
                    )
                  ) : (
                    <EventoPopover
                      evento={selecionado}
                      href={`/agenda/${selecionado.slot.id}`}
                      onFechar={() => setSelecionadoId(null)}
                    />
                  )}
                </div>
              );
            })()
          : null}
      </div>
    </div>
  );
}
