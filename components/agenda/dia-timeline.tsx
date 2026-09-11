"use client";

import { useState } from "react";
import type { SlotDetalheProps } from "@/components/agenda/slot-detalhe";
import { SlotDetalheCliente } from "@/components/agenda/slot-detalhe-cliente";
import { EventoPopover } from "@/components/agenda/evento-popover";
import type { PerfilResumo } from "@/components/perfil-popover";

const HOUR_PX = 16; // 24h * 16px = 384px de altura total
const MARCOS = [0, 4, 8, 12, 16, 20, 24];

const corPorStatus: Record<string, string> = {
  pendente: "border-accent bg-tint-warn",
  confirmado: "border-action bg-tint-ok",
  cancelado: "border-danger bg-tint-danger",
  realizado: "border-ink bg-tint-neutral",
};

function paraHoras(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function horasParaHHMM(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

interface Faixa {
  inicioH: number;
  fimH: number;
}

/**
 * Une faixas de horário sobrepostas ou encostadas (ex.: 09–12 e 12–18 virram
 * uma faixa só, 09–18). É o que dá a "agenda aberta das X às Y": o prestador
 * pode ter aberto o dia em vários lotes (ou um lote e depois uma reserva no
 * meio dele), mas pra quem olha a tela isso é uma faixa aberta só.
 */
function mesclarFaixas(faixas: Faixa[]): Faixa[] {
  const ordenadas = [...faixas].sort((a, b) => a.inicioH - b.inicioH);
  const mescladas: Faixa[] = [];
  for (const f of ordenadas) {
    const ultima = mescladas[mescladas.length - 1];
    if (ultima && f.inicioH <= ultima.fimH) {
      ultima.fimH = Math.max(ultima.fimH, f.fimH);
    } else {
      mescladas.push({ ...f });
    }
  }
  return mescladas;
}

/** "Agenda aberta das 09:00 às 18:00" ou, com mais de uma faixa, "...das 09:00 às 12:00 e das 14:00 às 18:00". */
function legendaAgendaAberta(faixas: Faixa[]): string {
  const partes = faixas.map((f) => `das ${horasParaHHMM(f.inicioH)} às ${horasParaHHMM(f.fimH)}`);
  if (partes.length <= 1) return `Agenda aberta ${partes[0] ?? ""}`.trim();
  const ultima = partes[partes.length - 1];
  const resto = partes.slice(0, -1).join(", ");
  return `Agenda aberta ${resto} e ${ultima}`;
}

export interface DiaTimelineEvento {
  slot: SlotDetalheProps["slot"];
  servico: (NonNullable<SlotDetalheProps["servico"]> & { clienteNome?: string | null }) | null;
  logs: SlotDetalheProps["logs"];
}

/**
 * Agenda do dia como linha do tempo — 00h no topo, meio-dia no meio, 00h nas
 * próximas 24h embaixo. As horas abertas (status ≠ 'fechado') aparecem como
 * uma FAIXA de fundo azul-clara contínua (faixas sobrepostas se unem); os
 * serviços aparecem como cartões por cima, na hora certa, coloridos pelo
 * status ("horário — descrição" numa linha só). Um horário livre sem serviço
 * não vira cartão nenhum — só a faixa azul embaixo já diz "aberto" (pedido do
 * Leonardo em 10/09/2026: nada de "09:00–18:00 — Livre" quando na verdade tem
 * serviço no meio do dia). Horário 'fechado' nunca chega aqui: quem monta
 * `eventos` (a página, `AgendaCalendarV2`) já filtra antes.
 */
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

  // Defensivo: 'fechado' não devia chegar aqui, mas se chegar não conta como
  // aberto nem aparece — nem na faixa de fundo, nem em lugar nenhum.
  const abertos = eventos.filter((e) => e.slot.status !== "fechado");

  if (abertos.length === 0) {
    return <p className="card-vazio">Nenhum horário nesse dia.</p>;
  }

  const faixas = mesclarFaixas(abertos.map((e) => ({ inicioH: paraHoras(e.slot.hora_inicio), fimH: paraHoras(e.slot.hora_fim) })));
  const comServico = abertos.filter((e) => e.servico);

  const selecionado = comServico.find((e) => e.slot.id === selecionadoId) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand-fill" />
        {legendaAgendaAberta(faixas)}
      </p>
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

          {/* Faixa de fundo: as horas abertas, sem texto — a legenda acima já diz quais são. */}
          {faixas.map((f) => (
            <div
              key={`${f.inicioH}-${f.fimH}`}
              aria-hidden="true"
              className="absolute inset-x-0 rounded-md bg-tint-info"
              style={{ top: f.inicioH * HOUR_PX, height: (f.fimH - f.inicioH) * HOUR_PX }}
            />
          ))}

          {comServico.map((e) => {
            const inicio = paraHoras(e.slot.hora_inicio);
            const fim = paraHoras(e.slot.hora_fim);
            const top = inicio * HOUR_PX;
            const altura = Math.max(20, (fim - inicio) * HOUR_PX);
            const status = e.servico!.status;
            const classes = `absolute left-1 right-1 flex items-center justify-center gap-1.5 overflow-hidden rounded-md border-l-4 px-2 text-center text-sm transition ${
              corPorStatus[status] ?? "border-line bg-card"
            }`;
            return (
              <button
                key={e.slot.id}
                type="button"
                onClick={() => setSelecionadoId((atual) => (atual === e.slot.id ? null : e.slot.id))}
                className={`${classes} ${selecionadoId === e.slot.id ? "ring-2 ring-brand" : ""}`}
                style={{ top, height: altura }}
              >
                <span className="shrink-0 text-rotulo text-muted">
                  {e.slot.hora_inicio.slice(0, 5)}–{e.slot.hora_fim.slice(0, 5)}
                </span>
                <span className="shrink-0 text-rotulo text-muted">—</span>
                <span className="truncate font-medium text-ink">{e.servico!.descricao}</span>
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
    </div>
  );
}
