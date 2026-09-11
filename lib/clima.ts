import "server-only";

/** Um dia de previsão, já com emoji e descrição resolvidos — o Hero (`components/hero-card.tsx`) só desenha. */
export interface DiaPrevisao {
  data: string;
  max: number;
  min: number;
  emoji: string;
  descricao: string;
}

/** O tempo agora na cidade (temperatura e sensação arredondadas). */
export interface ClimaAgora {
  temperatura: number;
  sensacao: number;
  emoji: string;
  descricao: string;
}

/** O que o Hero recebe de `/api/clima`: o agora e os próximos 4 dias (hoje incluso). */
export interface Clima {
  agora: ClimaAgora | null;
  dias: DiaPrevisao[];
}

/** Código WMO do Open-Meteo → emoji e texto curto em PT-BR. */
const CONDICAO: Record<number, [string, string]> = {
  0: ["☀️", "Céu limpo"],
  1: ["🌤️", "Poucas nuvens"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Neblina"],
  48: ["🌫️", "Neblina"],
  51: ["🌦️", "Garoa fraca"],
  53: ["🌦️", "Garoa"],
  55: ["🌧️", "Garoa forte"],
  61: ["🌧️", "Chuva fraca"],
  63: ["🌧️", "Chuva"],
  65: ["🌧️", "Chuva forte"],
  71: ["🌨️", "Neve fraca"],
  73: ["🌨️", "Neve"],
  75: ["❄️", "Neve forte"],
  80: ["🌦️", "Pancadas de chuva"],
  81: ["🌧️", "Pancadas de chuva"],
  82: ["⛈️", "Pancadas fortes"],
  95: ["⛈️", "Trovoadas"],
  96: ["⛈️", "Trovoadas com granizo"],
  99: ["⛈️", "Trovoadas com granizo"],
};

function condicao(codigo: number): [string, string] {
  return CONDICAO[codigo] ?? ["🌡️", "—"];
}

/**
 * Tempo agora e previsão de 4 dias da cidade informada, via Open-Meteo
 * (geocoding + forecast, gratuita, sem chave). Roda no SERVIDOR (chamada por
 * `app/api/clima/route.ts`) de propósito: antes, o Hero buscava isso direto do
 * navegador, e o IP de quem visita ia à Open-Meteo antes de qualquer
 * consentimento (parecer LGPD, vistoria 10/09/2026). Cache curto (30 min para a
 * previsão, 10 min para o agora) — evita bater na API a cada carregamento.
 */
export async function buscarClima(cidade: string): Promise<Clima | null> {
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
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,apparent_temperature,weather_code` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`,
      { next: { revalidate: 600 } },
    ).then((r) => r.json());
    if (!prev?.daily?.time) return null;

    const dias: DiaPrevisao[] = prev.daily.time.map((data: string, i: number) => {
      const [emoji, descricao] = condicao(prev.daily.weathercode[i]);
      return {
        data,
        max: Math.round(prev.daily.temperature_2m_max[i]),
        min: Math.round(prev.daily.temperature_2m_min[i]),
        emoji,
        descricao,
      };
    });

    const c = prev.current;
    const agora: ClimaAgora | null =
      c && typeof c.temperature_2m === "number"
        ? (() => {
            const [emoji, descricao] = condicao(c.weather_code);
            return {
              temperatura: Math.round(c.temperature_2m),
              sensacao: Math.round(c.apparent_temperature ?? c.temperature_2m),
              emoji,
              descricao,
            };
          })()
        : null;

    return { agora, dias };
  } catch {
    // API fora do ar, cidade não encontrada, etc. — o Hero funciona sem clima.
    return null;
  }
}
