"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { formatBRL, formatData } from "@/lib/format";
import { CATEGORIAS, nomeCategoria } from "@/lib/categorias";

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
  categoria: string;
  data: string | null;
}

/**
 * Mapa Leaflet/OpenStreetMap com um pino por vaga e um painel de filtros.
 *
 * Num marketplace de obra o mapa É a busca: quem procura diária filtra por tipo
 * de serviço, faixa de valor e a partir de quando pode. Os filtros rodam no
 * cliente sobre os pontos já carregados — sem ida ao servidor a cada ajuste. O
 * centro é fixado na montagem (média de todos os pontos); os filtros só escondem
 * pinos, não recentralizam, para o mapa não "pular" a cada tecla.
 *
 * `filtros={false}` esconde o painel: na tela de detalhe da vaga o mapa mostra
 * UM ponto (o local da obra), e filtrar um único job não faz sentido.
 */
export function VagasMap({ points, filtros = true }: { points: VagaPonto[]; filtros?: boolean }) {
  const [categoria, setCategoria] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [dataDe, setDataDe] = useState("");

  const center = useMemo<[number, number]>(
    () =>
      points.length
        ? [
            points.reduce((s, p) => s + p.lat, 0) / points.length,
            points.reduce((s, p) => s + p.lng, 0) / points.length,
          ]
        : [-22.9, -43.1],
    [points],
  );

  const filtrados = useMemo(() => {
    if (!filtros) return points;
    const min = valorMin ? Number(valorMin) : null;
    const max = valorMax ? Number(valorMax) : null;
    return points.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (min != null && p.valor < min) return false;
      if (max != null && p.valor > max) return false;
      // Sem data cadastrada não casa com um "a partir de": fica de fora do recorte.
      if (dataDe && (p.data ?? "") < dataDe) return false;
      return true;
    });
  }, [filtros, points, categoria, valorMin, valorMax, dataDe]);

  const temFiltro = Boolean(categoria || valorMin || valorMax || dataDe);
  function limpar() {
    setCategoria("");
    setValorMin("");
    setValorMax("");
    setDataDe("");
  }

  return (
    <div className="flex flex-col gap-3">
      {filtros ? (
      <div className="card flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="filtro-categoria">Tipo de serviço</label>
            <select id="filtro-categoria" className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todos</option>
              {CATEGORIAS.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filtro-valor-min">Valor de (R$)</label>
            <input id="filtro-valor-min" className="input" type="number" inputMode="numeric" min="0" step="10" value={valorMin} onChange={(e) => setValorMin(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="filtro-valor-max">Valor até (R$)</label>
            <input id="filtro-valor-max" className="input" type="number" inputMode="numeric" min="0" step="10" value={valorMax} onChange={(e) => setValorMax(e.target.value)} placeholder="Sem limite" />
          </div>
          <div>
            <label className="label" htmlFor="filtro-data">A partir de</label>
            <input id="filtro-data" className="input" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted" aria-live="polite">
            Mostrando <span className="font-semibold tabular-nums">{filtrados.length}</span> de{" "}
            <span className="tabular-nums">{points.length}</span> vagas
          </p>
          {temFiltro ? (
            <button type="button" onClick={limpar} className="link-touch min-h-0 px-2 py-1 text-xs">
              Limpar filtros
            </button>
          ) : null}
        </div>
      </div>
      ) : null}

      {filtros && filtrados.length === 0 ? (
        <div className="card-vazio">Nenhuma vaga com esses filtros. Amplie a faixa de valor ou a data.</div>
      ) : null}

      <MapContainer
        center={center}
        zoom={points.length ? 12 : 10}
        scrollWheelZoom
        style={{ height: 440, width: "100%", borderRadius: 16 }}
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filtrados.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <strong>{p.titulo}</strong>
              <br />
              {nomeCategoria(p.categoria)}
              <br />
              {formatBRL(p.valor)} · {p.cidade}
              {p.data ? ` · ${formatData(p.data)}` : ""}
              <br />
              <Link href={`/vagas/${p.id}`}>Ver vaga →</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
