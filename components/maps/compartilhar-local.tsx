"use client";

import { useState } from "react";
import { googleMapsUrl, wazeUrl, geoUri, coordLabel } from "@/lib/maps-share";

/**
 * Compartilhar localização one-shot.
 * - modo "obra": compartilha o ponto passado (o sócio manda o local da obra).
 * - modo "chegando": pega a posição atual do aparelho e compartilha (ajudante "estou a caminho").
 * - modo "perfil": ponto fixo do perfil (Cliente/Prestador) — "Compartilhar" +
 *   abrir no Google Maps/Waze, usado no card de endereço de `/perfil/[id]` e
 *   na seção de localização de `/perfil/editar`.
 */
export function CompartilharLocal({
  modo,
  lat,
  lng,
}: {
  modo: "obra" | "chegando" | "perfil";
  lat?: number;
  lng?: number;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function share(la: number, ln: number) {
    const url = googleMapsUrl(la, ln);
    const data = { title: "Localização", text: coordLabel(la, ln), url };
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
      } else {
        setErro("Não foi possível compartilhar. Copie o link manualmente.");
      }
    } catch {
      /* usuário cancelou */
    }
  }

  function compartilhar() {
    setErro(null);
    setCopiado(false);
    if (modo === "obra" || modo === "perfil") {
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

  if (modo === "perfil") {
    if (lat == null || lng == null) return null;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={compartilhar} className="btn-action px-4 text-sm">
            Compartilhar
          </button>
          <a
            href={googleMapsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Abrir no Google Maps
          </a>
          <a
            href={wazeUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Abrir no Waze
          </a>
        </div>
        {copiado ? (
          <span role="status" className="text-rotulo text-ok">
            Link copiado.
          </span>
        ) : null}
        {erro ? (
          <span role="alert" className="text-rotulo text-danger">
            {erro}
          </span>
        ) : null}
      </div>
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
      {erro ? <span className="text-rotulo text-danger">{erro}</span> : null}
    </div>
  );
}
