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
  servico: (NonNullable<SlotDetalheProps["servico"]> & { clienteNome?: string | null }) | null;
  logs: SlotDetalheProps["logs"];
}

/** Agenda do dia como linha do tempo — 00h no topo, meio-dia no meio, 00h nas próximas 24h embaixo; cada bloco lê "horário — descrição" numa linha só. Clicar num bloco com serviço abre o resumo; horário livre não é clicável (não há serviço pra abrir). */
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
    return <p className="card-vazio">Nenhum horário nesse dia.</p>;
  }

  const selecionado = eventos.find((e) => e.slot.id === selecionadoId) ?? null;

  return (
    <div className="flex">
      <div className="relative w-9 shrink-0" style={{ height: 24 * HOUR_PX }}>
        {MARCOS.map((h) => (
          <span key={h} className="absolute -top-2 text-rotulo text-muted" style={{ top: h * HOUR_PX }}>
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
          const classes = `absolute left-1 right-1 flex items-center justify-center gap-1.5 overflow-hidden rounded-md border-l-4 px-2 text-center text-sm transition ${
            corPorStatus[status] ?? "border-line bg-card"
          }`;
          const rotulo = (
            <>
              <span className="shrink-0 text-rotulo text-muted">
                {e.slot.hora_inicio.slice(0, 5)}–{e.slot.hora_fim.slice(0, 5)}
              </span>
              <span className="shrink-0 text-rotulo text-muted">—</span>
              <span className="truncate font-medium text-ink">{e.servico?.descricao ?? "Livre"}</span>
            </>
          );
          // Horário livre não abre nada: não existe serviço pra mostrar. Sem
          // <button> ele também não finge ser clicável.
          if (!e.servico) {
            return (
              <div key={e.slot.id} className={classes} style={{ top, height: altura }}>
                {rotulo}
              </div>
            );
          }
          return (
            <button
              key={e.slot.id}
              type="button"
              onClick={() => setSelecionadoId((atual) => (atual === e.slot.id ? null : e.slot.id))}
              className={`${classes} ${selecionadoId === e.slot.id ? "ring-2 ring-brand" : ""}`}
              style={{ top, height: altura }}
            >
              {rotulo}
            </button>
          );
        })}

        {/* Variant "cliente" continua ancorada logo abaixo do bloco. */}
        {selecionado && variant === "cliente"
          ? (() => {
              const inicio = paraHoras(selecionado.slot.hora_inicio);
              const fim = paraHoras(selecionado.slot.hora_fim);
              const topPopover = Math.max(0, inicio * HOUR_PX + (fim - inicio) * HOUR_PX + 4);
              return (
                <div className="absolute left-1 z-10" style={{ top: topPopover }}>
                  {selecionado.servico && prestadoresPorServico?.[selecionado.servico.id] ? (
                    <SlotDetalheCliente evento={selecionado} prestador={prestadoresPorServico[selecionado.servico.id]!} />
                  ) : null}
                </div>
              );
            })()
          : null}
      </div>

      {/* Variant "prestador": overlay centrado na tela, não ancorado na
          linha do tempo — ver EventoPopover. */}
      {selecionado?.servico && variant === "prestador" ? (
        <EventoPopover
          evento={{ slot: selecionado.slot, servico: selecionado.servico }}
          href={`/agenda/${selecionado.slot.id}`}
          onFechar={() => setSelecionadoId(null)}
        />
      ) : null}
    </div>
  );
}
