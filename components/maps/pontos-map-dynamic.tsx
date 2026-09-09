"use client";

import dynamic from "next/dynamic";
export type { MapaPonto } from "./pontos-map";

/** Loader client-only do mapa de pontos (Leaflet precisa de window). */
export const PontosMap = dynamic(() => import("./pontos-map").then((m) => m.PontosMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-[360px] place-items-center rounded-2xl border border-line bg-card text-sm text-muted">
      Carregando mapa…
    </div>
  ),
});
