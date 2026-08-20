"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { formatBRL } from "@/lib/format";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface VagaPonto {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  valor: number;
  cidade: string;
}

/** Mapa Leaflet/OpenStreetMap com um pino por vaga (coordenada aproximada) e popup com valor e link. */
export function VagasMap({ points }: { points: VagaPonto[] }) {
  const center: [number, number] = points.length
    ? [
        points.reduce((s, p) => s + p.lat, 0) / points.length,
        points.reduce((s, p) => s + p.lng, 0) / points.length,
      ]
    : [-22.9, -43.1];

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 12 : 10}
      scrollWheelZoom
      style={{ height: 440, width: "100%", borderRadius: 16 }}
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
          <Popup>
            <strong>{p.titulo}</strong>
            <br />
            {formatBRL(p.valor)} · {p.cidade}
            <br />
            <Link href={`/vagas/${p.id}`}>Ver vaga →</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
