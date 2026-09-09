"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface MapaPonto {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  subtitulo?: string;
  href?: string;
}

/**
 * Mapa Leaflet/OpenStreetMap genérico com um pino por ponto — usado tanto pro
 * cliente ver prestadores próximos (`/buscar-prestador`) quanto pro prestador
 * ver os clientes com serviço em aberto (`/mapa`). Os pontos SEMPRE vêm de
 * `lat_aprox`/`lng_aprox` (migration 0033) — nunca a coordenada exata de
 * ninguém, por isso não tem endereço na exibição, só o pino aproximado.
 */
export function PontosMap({ pontos }: { pontos: MapaPonto[] }) {
  const center = useMemo<[number, number]>(
    () =>
      pontos.length
        ? [
            pontos.reduce((s, p) => s + p.lat, 0) / pontos.length,
            pontos.reduce((s, p) => s + p.lng, 0) / pontos.length,
          ]
        : [-22.9, -43.1],
    [pontos],
  );

  return (
    <MapContainer
      center={center}
      zoom={pontos.length ? 12 : 10}
      scrollWheelZoom
      style={{ height: 360, width: "100%", borderRadius: 16 }}
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pontos.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
          <Popup>
            <strong>{p.titulo}</strong>
            {p.subtitulo ? (
              <>
                <br />
                {p.subtitulo}
              </>
            ) : null}
            {p.href ? (
              <>
                <br />
                <Link href={p.href}>Ver perfil →</Link>
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
