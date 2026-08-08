"use server";

import { requireUser } from "@/lib/auth/roles";

export interface GeoHit {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Geocoda um endereço em texto via OpenStreetMap Nominatim (sem chave). No
 * servidor para mandar um User-Agent próprio e evitar CORS/rate no browser.
 */
export async function geocodeAddress(query: string): Promise<GeoHit[]> {
  await requireUser();
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
