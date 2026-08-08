"use client";

import { useState, type ReactNode } from "react";

/** Alterna entre a lista (server-rendered, passada como prop) e o calendário. */
export function AgendaView({ lista, calendario }: { lista: ReactNode; calendario: ReactNode }) {
  const [modo, setModo] = useState<"lista" | "calendario">("lista");
  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex gap-1 self-start rounded-full border border-line bg-white p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setModo("lista")}
          className={`rounded-full px-3 py-1 font-medium ${modo === "lista" ? "bg-brand text-white" : "text-muted"}`}
          aria-pressed={modo === "lista"}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setModo("calendario")}
          className={`rounded-full px-3 py-1 font-medium ${modo === "calendario" ? "bg-brand text-white" : "text-muted"}`}
          aria-pressed={modo === "calendario"}
        >
          Calendário
        </button>
      </div>
      {modo === "lista" ? lista : calendario}
    </div>
  );
}
