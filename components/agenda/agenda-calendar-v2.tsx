"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlotDetalhe, type SlotDetalheProps } from "@/components/agenda/slot-detalhe";

const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface AgendaEvento {
  slot: SlotDetalheProps["slot"];
  servico: SlotDetalheProps["servico"];
  logs: SlotDetalheProps["logs"];
}

const corPorStatus: Record<string, string> = {
  livre: "bg-line",
  pendente: "bg-accent",
  confirmado: "bg-action",
  cancelado: "bg-danger",
  realizado: "bg-brand",
};

function iso(d: Date): string {
  return d.toLocaleDateString("sv-SE");
}

/** Agenda em calendário (mês ou semana), como no careconnect/vr-pilates: grade de dias, clique abre os horários daquele dia. */
export function AgendaCalendarV2({ eventos }: { eventos: AgendaEvento[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const hoje = useMemo(() => new Date(), []);
  const visao = (params.get("visao") === "semana" ? "semana" : "mes") as "mes" | "semana";
  const dataRef = params.get("data") ? new Date(`${params.get("data")}T00:00:00`) : hoje;
  const [diaSelecionado, setDiaSelecionado] = useState<string>(iso(hoje));

  const porDia = new Map<string, AgendaEvento[]>();
  for (const e of eventos) {
    const arr = porDia.get(e.slot.data) ?? [];
    arr.push(e);
    porDia.set(e.slot.data, arr);
  }

  function setUrl(novaVisao: "mes" | "semana", novaData: Date) {
    router.push(`${pathname}?visao=${novaVisao}&data=${iso(novaData)}`);
  }

  function celula(dataIso: string, numero: number, foraDoMes: boolean) {
    const eventosDoDia = porDia.get(dataIso) ?? [];
    const isHoje = dataIso === iso(hoje);
    const isSelecionado = dataIso === diaSelecionado;
    return (
      <button
        key={dataIso}
        type="button"
        onClick={() => setDiaSelecionado(dataIso)}
        className={`flex min-h-[64px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition ${
          isSelecionado ? "border-brand bg-tint-info" : "border-line bg-card"
        } ${foraDoMes ? "opacity-40" : ""}`}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
            isHoje ? "bg-brand-fill font-bold text-white" : "text-muted"
          }`}
        >
          {numero}
        </span>
        <div className="flex flex-wrap gap-0.5">
          {eventosDoDia.slice(0, 4).map((e) => (
            <span
              key={e.slot.id}
              className={`h-1.5 w-1.5 rounded-full ${corPorStatus[e.servico?.status ?? e.slot.status] ?? "bg-line"}`}
            />
          ))}
        </div>
      </button>
    );
  }

  let grade: React.ReactNode;
  if (visao === "mes") {
    const year = dataRef.getFullYear();
    const month = dataRef.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells: { data: Date; foraDoMes: boolean }[] = [];
    for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ data: new Date(year, month - 1, prevDays - i), foraDoMes: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ data: new Date(year, month, d), foraDoMes: false });
    while (cells.length % 7 !== 0) cells.push({ data: new Date(year, month + 1, cells.length - firstWeekday - daysInMonth + 1), foraDoMes: true });

    grade = (
      <>
        <div className="mb-1 flex items-center justify-between">
          <button type="button" onClick={() => setUrl("mes", new Date(year, month - 1, 1))} className="btn-ghost px-3 py-1" aria-label="Mês anterior">‹</button>
          <span className="text-sm font-semibold capitalize">{MES[month]} de {year}</span>
          <button type="button" onClick={() => setUrl("mes", new Date(year, month + 1, 1))} className="btn-ghost px-3 py-1" aria-label="Próximo mês">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => celula(iso(c.data), c.data.getDate(), c.foraDoMes))}
        </div>
      </>
    );
  } else {
    const inicioSemana = new Date(dataRef);
    inicioSemana.setDate(dataRef.getDate() - dataRef.getDay());
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(inicioSemana.getDate() + i);
      return d;
    });
    grade = (
      <>
        <div className="mb-1 flex items-center justify-between">
          <button type="button" onClick={() => setUrl("semana", new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() - 7))} className="btn-ghost px-3 py-1" aria-label="Semana anterior">‹</button>
          <span className="text-sm font-semibold">
            {dias[0]!.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – {dias[6]!.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
          <button type="button" onClick={() => setUrl("semana", new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 7))} className="btn-ghost px-3 py-1" aria-label="Próxima semana">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => celula(iso(d), d.getDate(), false))}
        </div>
      </>
    );
  }

  const eventosDoSelecionado = porDia.get(diaSelecionado) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-lg border border-line bg-card p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setUrl("mes", dataRef)}
          className={`rounded-md px-3 py-1 ${visao === "mes" ? "bg-brand-fill text-white" : "text-muted"}`}
        >
          Mês
        </button>
        <button
          type="button"
          onClick={() => setUrl("semana", dataRef)}
          className={`rounded-md px-3 py-1 ${visao === "semana" ? "bg-brand-fill text-white" : "text-muted"}`}
        >
          Semana
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
        {WD.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      {grade}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-xs font-semibold uppercase text-muted">
          {new Date(`${diaSelecionado}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        {eventosDoSelecionado.length === 0 ? (
          <p className="text-sm text-muted">Nenhum horário nesse dia.</p>
        ) : (
          eventosDoSelecionado.map((e) => <SlotDetalhe key={e.slot.id} slot={e.slot} servico={e.servico} logs={e.logs} />)
        )}
      </div>
    </div>
  );
}
