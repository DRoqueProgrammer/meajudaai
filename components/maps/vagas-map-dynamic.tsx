"use client";

import dynamic from "next/dynamic";
export type { VagaPonto } from "./vagas-map";

/** Loader client-only do mapa de vagas (Leaflet precisa de window). */
export const VagasMap = dynamic(() => import("./vagas-map").then((m) => m.VagasMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-[440px] place-items-center rounded-2xl border border-line bg-card text-sm text-muted">
      Carregando mapa…
    </div>
  ),
});
