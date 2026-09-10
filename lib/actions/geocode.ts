"use server";

import { requireUser } from "@/lib/auth/roles";
import { rateLimit } from "@/lib/rate-limit";

export interface GeoHit {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Geocoda um endereço em texto via OpenStreetMap Nominatim (sem chave). No
 * servidor para mandar um User-Agent próprio e evitar CORS/rate no browser.
 * Limitada a 10 pedidos por pessoa a cada 60s (R-52) — sem isso, um bot queima
 * a cota do Nominatim para todo mundo. Estourou o limite: lista vazia, sem
 * lançar (o formulário já trata lista vazia como "nada encontrado").
 */
export async function geocodeAddress(query: string): Promise<GeoHit[]> {
  const user = await requireUser();
  if (!rateLimit(`geocode:${user.id}`, 10, 60_000).ok) return [];
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("addressdetails", "0");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MeAjudaAi/0.1 (marketplace de diarias)",
        "Accept-Language": "pt-BR",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  } catch {
    return [];
  }
}
