import "server-only";

/** Um dia de previsão, já com o emoji resolvido — o Hero (`components/hero-card.tsx`) só desenha. */
export interface DiaPrevisao {
  data: string;
  max: number;
  min: number;
  emoji: string;
}

const WEATHERCODE_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "❄️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

/**
 * Previsão de 4 dias da cidade informada, via Open-Meteo (geocoding + forecast,
 * gratuita, sem chave). Roda no SERVIDOR (chamada por `app/api/clima/route.ts`)
 * de propósito: antes, o Hero buscava isso direto do navegador, e o IP de
 * quem visita ia à Open-Meteo antes de qualquer consentimento (parecer LGPD,
 * vistoria 10/09/2026). Cache curto (30 min) — a previsão não muda de minuto a
 * minuto e evita bater na API a cada carregamento do Hero.
 */
export async function buscarPrevisao(cidade: string): Promise<DiaPrevisao[] | null> {
  const q = cidade.trim();
  if (!q) return null;
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`,
      { next: { revalidate: 1800 } },
    ).then((r) => r.json());
    const loc = geo?.results?.[0];
    if (!loc) return null;

    const prev = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`,
      { next: { revalidate: 1800 } },
    ).then((r) => r.json());
    if (!prev?.daily?.time) return null;

    return prev.daily.time.map((data: string, i: number) => ({
      data,
      max: Math.round(prev.daily.temperature_2m_max[i]),
      min: Math.round(prev.daily.temperature_2m_min[i]),
      emoji: WEATHERCODE_EMOJI[prev.daily.weathercode[i]] ?? "🌡️",
    }));
  } catch {
    // API fora do ar, cidade não encontrada, etc. — o Hero funciona sem previsão.
    return null;
  }
}
