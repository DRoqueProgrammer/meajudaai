"use client";

import dynamic from "next/dynamic";
export type { AddressValue } from "./address-map-picker";

/** Loader client-only do picker Leaflet (Leaflet precisa de window). */
export const AddressMapPicker = dynamic(
  () => import("./address-map-picker").then((m) => m.AddressMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[320px] place-items-center rounded-2xl border border-line bg-white text-sm text-muted">
        Carregando mapa…
      </div>
    ),
  },
);
