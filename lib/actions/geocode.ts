"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/roles";
import { rateLimit } from "@/lib/rate-limit";

export interface GeoHit {
  label: string;
  lat: number;
  lng: number;
}

/** IP de quem chamou, pelos cabeçalhos de proxy (Vercel sempre manda `x-forwarded-for`). */
async function ipDoVisitante(): Promise<string> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

/**
 * Geocoda um endereço em texto via OpenStreetMap Nominatim (sem chave). No
 * servidor para mandar um User-Agent próprio e evitar CORS/rate no browser.
 *
 * Precisa funcionar SEM sessão: o mapa de "Localizar" do cadastro
 * (`components/maps/address-map-picker.tsx`) roda antes do login. Com sessão,
 * o limite é por pessoa; sem sessão, por IP (`x-forwarded-for`/`x-real-ip`) —
 * 10 pedidos a cada 60s nos dois casos (R-52). Sem isso, um bot queima a cota
 * do Nominatim para todo mundo. Estourou o limite: lista vazia, sem lançar (o
 * formulário já trata lista vazia como "nada encontrado").
 */
export async function geocodeAddress(query: string): Promise<GeoHit[]> {
  const user = await getCurrentUser();
  const chave = user ? `geocode:usuario:${user.id}` : `geocode:ip:${await ipDoVisitante()}`;
  if (!rateLimit(chave, 10, 60_000).ok) return [];
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
