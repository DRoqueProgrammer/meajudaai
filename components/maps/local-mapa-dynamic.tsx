"use client";

import dynamic from "next/dynamic";

/** Loader client-only do mapa só-leitura de localização (Leaflet precisa de window). */
export const LocalMapa = dynamic(() => import("./local-mapa").then((m) => m.LocalMapa), {
  ssr: false,
  loading: () => (
    <div className="grid h-[200px] place-items-center rounded-2xl border border-line bg-card text-sm text-muted">
      Carregando mapa…
    </div>
  ),
});
