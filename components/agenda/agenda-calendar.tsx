"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarBloqueioAction } from "@/lib/actions/agenda";
import { diasEmConflito } from "@/lib/agenda-conflitos";

const WD = ["D", "S", "T", "Q", "Q", "S", "S"];
const MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface DiariaAgenda {
  id: string;
  titulo: string;
  data: string | null;
}

export function AgendaCalendar({
  year,
  month,
  hoje,
  diarias,
  blocos,
}: {
  year: number;
  month: number;
  hoje: string;
  diarias: DiariaAgenda[];
  blocos: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const porDia = new Map<string, DiariaAgenda[]>();
  for (const d of diarias) {
    if (!d.data) continue;
    const a = porDia.get(d.data) ?? [];
    a.push(d);
    porDia.set(d.data, a);
  }
  const bloco = new Set(blocos);
  const conflito = diasEmConflito(diarias, blocos);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const iso = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  function goMonth(delta: number) {
    const dt = new Date(year, month - 1 + delta, 1);
    router.push(`/agenda?mes=${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  function toggle(diaIso: string) {
    start(async () => {
      await alternarBloqueioAction(diaIso);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => goMonth(-1)} className="btn-ghost px-3 py-1" aria-label="Mês anterior">
          ‹
        </button>
        <span className="text-sm font-semibold capitalize">
          {MES[month - 1]} de {year}
        </span>
        <button type="button" onClick={() => goMonth(1)} className="btn-ghost px-3 py-1" aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
        {WD.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dia = iso(d);
          const ds = porDia.get(dia) ?? [];
          const isBloco = bloco.has(dia);
          const isConf = conflito.has(dia);
          const isHoje = dia === hoje;
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(dia)}
              disabled={pending}
              className={`min-h-[64px] rounded-lg border p-1 text-left align-top transition ${
                isConf ? "border-danger" : "border-line"
              } ${isBloco ? "bg-surface opacity-70" : "bg-white"}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isHoje ? "bg-brand font-bold text-white" : "text-muted"
                }`}
              >
                {d}
              </span>
              {ds.length ? (
                <span className="mt-0.5 block truncate text-[10px] font-medium text-brand">
                  {ds.length === 1 ? ds[0]!.titulo : `${ds.length} diárias`}
                </span>
              ) : null}
              {isBloco ? <span className="mt-0.5 block text-[10px] text-muted">🚫 indisponível</span> : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        Toque num dia para marcar/desmarcar indisponibilidade. Dias em{" "}
        <span className="font-medium text-danger">vermelho</span> têm conflito (2+ diárias, ou diária
        num dia bloqueado).
      </p>
    </div>
  );
}
