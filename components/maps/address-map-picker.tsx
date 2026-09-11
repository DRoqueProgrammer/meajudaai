"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddress } from "@/lib/actions/geocode";
import { coordLabel } from "@/lib/maps-share";
import { AlvoIcon } from "@/components/icons";

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

/**
 * Leaflet mede o contêiner só na montagem. O cadastro usa uma altura de mapa
 * maior a partir do breakpoint `lg` (classe Tailwind, não JS) — sem isto o
 * mapa montado em mobile e depois redimensionado pra desktop (ou o DevTools
 * mudando de viewport) ficava com o tile pane no tamanho antigo.
 */
function AjustarTamanho() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const aoRedimensionar = () => map.invalidateSize();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [map]);
  return null;
}

export interface AddressValue {
  endereco: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Digite o endereço → "Localizar" geocoda e marca o pino (arrastável). Ou
 * "Marcar minha localização atual" (GPS do aparelho). Emite lat/lng para o
 * formulário via onChange. `inicial` semeia o estado (pino já salvo em
 * `profile_local`, por ex. em `/perfil/editar`) sem quebrar quem não passa
 * nada (cadastro, publicar diária) — nesse caso começa sem pino, como antes.
 *
 * `dicaSemPino` é a legenda mostrada enquanto não há pino — cada tela decide a
 * própria (obrigatório no cadastro, opcional em publicar diária); sem prop,
 * nada aparece. Antes o aviso de pino dispensável ficava fixo aqui e
 * contradizia o cadastro, que trata o pino como obrigatório (parecer de
 * design, item [ALTO] "copy contraditória"). `alturaMapa` são classes
 * Tailwind de altura — o cadastro usa uma versão maior a partir do desktop
 * (`lg:`).
 */
export function AddressMapPicker({
  inicial,
  onChange,
  dicaSemPino,
  alturaMapa = "h-[260px]",
}: {
  inicial?: AddressValue;
  onChange: (v: AddressValue) => void;
  dicaSemPino?: string;
  alturaMapa?: string;
}) {
  const [endereco, setEndereco] = useState(inicial?.endereco ?? "");
  const [lat, setLat] = useState<number | null>(inicial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(inicial?.lng ?? null);
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  // Precisão informada pelo GPS (accuracy, em metros) — só existe depois de um
  // "Marcar minha localização atual" bem-sucedido; busca por endereço e
  // arrastar o pino não têm essa medida, então zeram de novo.
  const [precisao, setPrecisao] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const markerRef = useRef<L.Marker>(null);

  function emit(next: Partial<AddressValue>) {
    onChange({ endereco, lat, lng, ...next });
  }

  /**
   * GPS real do aparelho (não geocodificação de texto). `enableHighAccuracy`
   * + `maximumAge: 0` pedem a leitura mais precisa disponível, mesmo que
   * demore mais — o pino é o ponto exato do perfil, uma leitura em cache ou
   * de baixa precisão (torre de celular) não serve. Sem geocodificação
   * reversa no projeto (lib/actions/geocode.ts só busca texto → coordenada,
   * não o caminho inverso): preenche só o pino, o endereço em texto continua
   * o que a pessoa já tinha digitado.
   */
  function marcarLocalAtual() {
    setGeoErr(null);
    if (!navigator.geolocation) {
      setGeoErr("Geolocalização não é suportada neste navegador.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setPrecisao(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
        emit({ lat: latitude, lng: longitude });
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoErr(
            "Permissão de localização negada. Libere o acesso à localização para este site nas configurações do navegador (ícone de cadeado ao lado do endereço) e tente de novo.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoErr("Não foi possível determinar sua posição agora. Tente novamente em instantes.");
        } else if (err.code === err.TIMEOUT) {
          setGeoErr("Tempo esgotado tentando obter sua localização. Tente de novo.");
        } else {
          setGeoErr("Não foi possível obter sua localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function buscar() {
    start(async () => {
      const res = await geocodeAddress(endereco);
      setHits(res);
      if (res[0]) {
        setLat(res[0].lat);
        setLng(res[0].lng);
        setPrecisao(null); // pino veio do texto buscado, não mais do GPS
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

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={marcarLocalAtual}
          disabled={geoBusy}
          className="btn-action w-full gap-2 sm:w-auto"
        >
          <AlvoIcon className="h-5 w-5 shrink-0" />
          {geoBusy ? "Obtendo localização…" : "Marcar minha localização atual"}
        </button>
        {precisao != null && !geoErr ? (
          <p className="text-xs text-muted">precisão de ~{precisao} m</p>
        ) : null}
        {geoErr ? (
          <p role="alert" className="text-rotulo text-danger">
            {geoErr}
          </p>
        ) : null}
      </div>

      {hits.length > 1 ? (
        <ul className="rounded-xl border border-line bg-card text-sm">
          {hits.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setLat(h.lat);
                  setLng(h.lng);
                  setPrecisao(null);
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

      <div className={`overflow-hidden rounded-2xl border border-line ${alturaMapa}`}>
        <MapContainer
          center={[hasPin ? lat! : -22.9, hasPin ? lng! : -43.1]}
          zoom={hasPin ? 15 : 11}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AjustarTamanho />
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
                    setPrecisao(null); // pino ajustado à mão, precisão do GPS não se aplica mais
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
      ) : dicaSemPino ? (
        <p className="text-xs text-muted">{dicaSemPino}</p>
      ) : null}
    </div>
  );
}
