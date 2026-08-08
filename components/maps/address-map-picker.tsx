"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddress } from "@/lib/actions/geocode";
import { coordLabel } from "@/lib/maps-share";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

export interface AddressValue {
  endereco: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Digite o endereço → "Localizar" geocoda e marca o pino (arrastável). Ou
 * "usar minha localização". Emite lat/lng para o formulário via onChange.
 */
export function AddressMapPicker({ onChange }: { onChange: (v: AddressValue) => void }) {
  const [endereco, setEndereco] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [pending, start] = useTransition();
  const markerRef = useRef<L.Marker>(null);

  function emit(next: Partial<AddressValue>) {
    onChange({ endereco, lat, lng, ...next });
  }

  function usarLocalAtual() {
    setGeoErr(null);
    if (!navigator.geolocation) {
      setGeoErr("Geolocalização não suportada neste aparelho.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        emit({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
      },
      () => {
        setGeoErr("Não foi possível obter sua localização (permissão negada?).");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function buscar() {
    start(async () => {
      const res = await geocodeAddress(endereco);
      setHits(res);
      if (res[0]) {
        setLat(res[0].lat);
        setLng(res[0].lng);
        emit({ lat: res[0].lat, lng: res[0].lng });
      }
    });
  }

  const hasPin = lat !== null && lng !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="input"
          value={endereco}
          onChange={(e) => {
            setEndereco(e.target.value);
            emit({ endereco: e.target.value });
          }}
          placeholder="Rua, número, bairro"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscar())}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={pending || endereco.trim().length < 3}
          className="btn-action shrink-0 px-4 text-sm"
        >
          {pending ? "…" : "Localizar"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={usarLocalAtual}
          disabled={geoBusy}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          {geoBusy ? "Obtendo…" : "📍 Usar minha localização"}
        </button>
        {geoErr ? <span className="text-[11px] text-danger">{geoErr}</span> : null}
      </div>

      {hits.length > 1 ? (
        <ul className="rounded-xl border border-line bg-white text-sm">
          {hits.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setLat(h.lat);
                  setLng(h.lng);
                  emit({ lat: h.lat, lng: h.lng });
                  setHits([]);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-muted hover:bg-surface hover:text-ink"
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line">
        <MapContainer
          center={[hasPin ? lat! : -22.9, hasPin ? lng! : -43.1]}
          zoom={hasPin ? 15 : 11}
          scrollWheelZoom
          style={{ height: 260, width: "100%" }}
        >
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {hasPin ? (
            <>
              <Recenter lat={lat!} lng={lng!} />
              <Marker
                position={[lat!, lng!]}
                draggable
                icon={icon}
                ref={markerRef}
                eventHandlers={{
                  dragend: () => {
                    const m = markerRef.current;
                    if (!m) return;
                    const p = m.getLatLng();
                    setLat(p.lat);
                    setLng(p.lng);
                    emit({ lat: p.lat, lng: p.lng });
                  },
                }}
              />
            </>
          ) : null}
        </MapContainer>
      </div>

      {hasPin ? (
        <p className="text-xs text-muted">
          📍 {coordLabel(lat!, lng!)} · arraste o pino para ajustar
        </p>
      ) : (
        <p className="text-xs text-faint">Opcional: marque o ponto exato da obra no mapa.</p>
      )}
    </div>
  );
}
