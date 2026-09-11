"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/**
 * Mapa Leaflet SÓ LEITURA — um pino fixo, sem arrastar e sem busca por
 * endereço. Usado no card "Endereço e localização" do perfil público
 * (`/perfil/[id]`), onde já se sabe a coordenada exata (a RLS de
 * `profile_local` decidiu isso antes de a página chegar aqui) e só falta
 * mostrá-la. Contraponto ao `AddressMapPicker`, que é de edição.
 */
export function LocalMapa({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: 200, width: "100%" }}
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={icon} />
      </MapContainer>
    </div>
  );
}
