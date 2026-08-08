"use client";

import { useState } from "react";
import { googleMapsUrl, wazeUrl, geoUri, coordLabel } from "@/lib/maps-share";

/**
 * Compartilhar localização one-shot.
 * - modo "obra": compartilha o ponto passado (o sócio manda o local da obra).
 * - modo "chegando": pega a posição atual do aparelho e compartilha (ajudante "estou a caminho").
 */
export function CompartilharLocal({
  modo,
  lat,
  lng,
}: {
  modo: "obra" | "chegando";
  lat?: number;
  lng?: number;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function share(la: number, ln: number) {
    const url = googleMapsUrl(la, ln);
    const data = { title: "Localização", text: coordLabel(la, ln), url };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard?.writeText(url);
    } catch {
      /* usuário cancelou */
    }
  }

  function compartilhar() {
    setErro(null);
    if (modo === "obra") {
      if (lat != null && lng != null) void share(lat, lng);
      return;
    }
    if (!navigator.geolocation) {
      setErro("Geolocalização não suportada neste aparelho.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        void share(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setBusy(false);
        setErro("Não foi possível obter sua localização (permissão negada?).");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={compartilhar} disabled={busy} className="btn-action px-4 text-sm">
          {busy ? "Obtendo…" : modo === "obra" ? "Compartilhar local da obra" : "📍 Estou a caminho"}
        </button>
        {modo === "obra" && lat != null && lng != null ? (
          <>
            <a
              href={googleMapsUrl(lat, lng)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Google Maps
            </a>
            <a
              href={wazeUrl(lat, lng)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Waze
            </a>
            <a href={geoUri(lat, lng)} className="btn-ghost px-3 py-1.5 text-xs">
              Abrir no celular
            </a>
          </>
        ) : null}
      </div>
      {erro ? <span className="text-[11px] text-danger">{erro}</span> : null}
    </div>
  );
}
