"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarSlotsRecorrentesAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";

const DIAS = [
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
  { valor: 0, label: "Dom" },
];

/** Formulário do prestador para abrir a agenda num intervalo de dias (ex.: seg a sáb, das 8h às 12h). */
export function CriarSlotForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  function alternarDia(v: number) {
    setDiasSemana((atual) => (atual.includes(v) ? atual.filter((d) => d !== v) : [...atual, v]));
  }

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await criarSlotsRecorrentesAction({
            dataInicio: String(fd.get("dataInicio")),
            dataFim: String(fd.get("dataFim")),
            diasSemana,
            horaInicio: String(fd.get("horaInicio")),
            horaFim: String(fd.get("horaFim")),
          });
          if (r.ok) {
            setErro(null);
            router.refresh();
          } else setErro(r.erro ?? "Não foi possível criar os horários.");
        });
      }}
    >
      <p className="text-sm font-semibold">Abrir agenda num período</p>

      <div className="flex flex-wrap gap-1.5">
        {DIAS.map((d) => (
          <button
            key={d.valor}
            type="button"
            onClick={() => alternarDia(d.valor)}
            className={`min-h-9 rounded-lg border px-2.5 text-xs font-semibold transition ${
              diasSemana.includes(d.valor)
                ? "border-brand bg-brand-fill text-white"
                : "border-line bg-card text-muted"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="dataInicio">
            De
          </label>
          <input id="dataInicio" name="dataInicio" type="date" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="dataFim">
            Até
          </label>
          <input id="dataFim" name="dataFim" type="date" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="horaInicio">
            Das
          </label>
          <input id="horaInicio" name="horaInicio" type="time" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="horaFim">
            Até
          </label>
          <input id="horaFim" name="horaFim" type="time" required className="input" />
        </div>
      </div>

      {erro ? <FormError>{erro}</FormError> : null}
      <button type="submit" disabled={pending} className="btn-brand self-start px-4 text-xs">
        {pending ? "Salvando…" : "Abrir horários"}
      </button>
    </form>
  );
}
