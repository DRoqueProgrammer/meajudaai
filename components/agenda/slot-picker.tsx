"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatData, formatHora } from "@/lib/format";
import { SlotReservar, type SlotBasico } from "@/components/agenda/slot-reservar";
import type { TipoServico } from "@/lib/tipos-servico";

/**
 * Seletor de horário do perfil público do prestador — a ação central do
 * produto (ROADMAP.md §2.4, parecer de design 01: item [ALTO]). Antes disso
 * era uma pilha de até 20 botões idênticos de 324×20px, sem agrupar por dia e
 * sem estado de seleção visível. Agora os horários vêm agrupados por dia (com
 * um rótulo legível, ex. "Seg, 15/09") e cada horário é um chip de 44px
 * (`.chip`, a base de toque da direção "h" do parecer); escolher um chip
 * revela o formulário de reserva (`SlotReservar`) daquele horário embaixo.
 *
 * O nome acessível de cada chip carrega a data por extenso, não só a hora
 * visível no rótulo — a regressão automatizada (scripts/regressao/fatia1.mjs)
 * encontra o horário certo por esse nome, no formato `dd/mm/aaaa · HH:MM–HH:MM`.
 */
export function SlotPicker({ slots, tipos }: { slots: SlotBasico[]; tipos: TipoServico[] }) {
  const grupos = useMemo(() => agruparPorDia(slots), [slots]);
  const ordemFocal = useMemo(() => grupos.flatMap((g) => g.slots), [grupos]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const botoesRef = useRef(new Map<string, HTMLButtonElement>());
  const formularioRef = useRef<HTMLDivElement>(null);

  const selecionado = ordemFocal.find((s) => s.id === selecionadoId) ?? null;

  // Com os dias em grade, o formulário do horário escolhido pode nascer fora da tela:
  // leva a pessoa até ele (sem animação para quem pediu movimento reduzido).
  useEffect(() => {
    if (!selecionadoId || !formularioRef.current) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formularioRef.current.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "nearest" });
  }, [selecionadoId]);

  /** Move o foco pro chip vizinho (seta ← ↑ volta, → ↓ avança), passando de um dia para o outro nas pontas. */
  function focarVizinho(atualId: string, delta: 1 | -1) {
    const idx = ordemFocal.findIndex((s) => s.id === atualId);
    if (idx === -1) return;
    const proximo = ordemFocal[(idx + delta + ordemFocal.length) % ordemFocal.length];
    if (proximo) botoesRef.current.get(proximo.id)?.focus();
  }

  if (grupos.length === 0) {
    return <p className="text-sm text-muted">Nenhum horário livre no momento.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Um cartão por dia, em grade: no desktop a agenda ocupa a largura em vez de
          descer um dia por linha. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((grupo) => {
          const rotuloDia = labelDia(grupo.data);
          return (
            <div key={grupo.data} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
              <p className="text-rotulo font-semibold uppercase tracking-wide text-muted">{rotuloDia}</p>
              <div role="group" aria-label={`Horários de ${rotuloDia}`} className="flex flex-wrap gap-2">
                {grupo.slots.map((slot) => {
                  const ativo = slot.id === selecionadoId;
                  const nomeAcessivel = `${formatData(slot.data)} · ${formatHora(slot.hora_inicio)}–${formatHora(slot.hora_fim)}`;
                  return (
                    <button
                      key={slot.id}
                      ref={(el) => {
                        if (el) botoesRef.current.set(slot.id, el);
                        else botoesRef.current.delete(slot.id);
                      }}
                      type="button"
                      aria-pressed={ativo}
                      aria-label={nomeAcessivel}
                      onClick={() => setSelecionadoId((atual) => (atual === slot.id ? null : slot.id))}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                          e.preventDefault();
                          focarVizinho(slot.id, 1);
                        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                          e.preventDefault();
                          focarVizinho(slot.id, -1);
                        }
                      }}
                      className={`chip gap-1.5 font-semibold ${ativo ? "chip-on" : "chip-off"}`}
                    >
                      {/* O estado de seleção não depende só da cor (item [ALTO] do parecer): o
                          chip ativo também ganha o ✓ e o negrito, então dá pra distinguir sem
                          depender de percepção de cor. */}
                      {ativo ? <span aria-hidden="true">✓</span> : null}
                      {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* `key` reinicia o formulário (descrição/endereço) quando o cliente troca de horário. */}
      <div ref={formularioRef}>{selecionado ? <SlotReservar key={selecionado.id} slot={selecionado} tipos={tipos} /> : null}</div>
    </div>
  );
}

function agruparPorDia(slots: SlotBasico[]): { data: string; slots: SlotBasico[] }[] {
  const porData = new Map<string, SlotBasico[]>();
  for (const slot of slots) {
    const grupo = porData.get(slot.data);
    if (grupo) grupo.push(slot);
    else porData.set(slot.data, [slot]);
  }
  // `Map` preserva a ordem de inserção — os slots já chegam ordenados por
  // data/hora da consulta, então os grupos saem na mesma ordem sem reordenar.
  return [...porData.entries()].map(([data, slots]) => ({ data, slots }));
}

/** Rótulo legível de dia pra agrupar os chips: "Seg, 15/09" (sem shift de fuso — constrói a partir das partes da data ISO, não do parse direto). */
function labelDia(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(/\.$/, "");
  const capitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${capitalizado}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}
