"use client";

import { useEffect, useState } from "react";
import { boasVindas } from "@/lib/saudacao";
import { citacaoAleatoria } from "@/lib/citacoes";

const CHAVE_MINIMIZADO = "maa-hero-minimizado";

const WEATHERCODE_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "❄️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

interface DiaPrevisao {
  data: string;
  max: number;
  min: number;
  emoji: string;
}

/**
 * Hero de boas-vindas (Cliente, Administrador, Prestador de Serviço) — ver
 * ROADMAP.md §2.5 e CLAUDE.md. Relógio ao vivo, citação aleatória, previsão
 * do tempo (Open-Meteo — gratuita, sem chave de API), card minimizável.
 */
export function HeroCard({ nome, genero, cidade }: { nome: string; genero: string | null; cidade: string | null }) {
  const [agora, setAgora] = useState<Date | null>(null);
  const [citacao, setCitacao] = useState<string | null>(null);
  const [previsao, setPrevisao] = useState<DiaPrevisao[] | null>(null);
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    setAgora(new Date());
    setCitacao(citacaoAleatoria());
    const t = setInterval(() => setAgora(new Date()), 1000 * 30);
    try {
      setMinimizado(localStorage.getItem(CHAVE_MINIMIZADO) === "1");
    } catch {
      // sem localStorage, segue expandido
    }
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cidade) return;
    let cancelado = false;
    (async () => {
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`,
        ).then((r) => r.json());
        const loc = geo?.results?.[0];
        if (!loc || cancelado) return;
        const prev = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`,
        ).then((r) => r.json());
        if (cancelado || !prev?.daily) return;
        const dias: DiaPrevisao[] = prev.daily.time.map((data: string, i: number) => ({
          data,
          max: Math.round(prev.daily.temperature_2m_max[i]),
          min: Math.round(prev.daily.temperature_2m_min[i]),
          emoji: WEATHERCODE_EMOJI[prev.daily.weathercode[i]] ?? "🌡️",
        }));
        setPrevisao(dias);
      } catch {
        // Sem previsão disponível (API fora do ar, cidade não encontrada) — o Hero funciona sem ela.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [cidade]);

  function alternarMinimizado() {
    setMinimizado((m) => {
      const novo = !m;
      try {
        localStorage.setItem(CHAVE_MINIMIZADO, novo ? "1" : "0");
      } catch {
        // sem localStorage, só não persiste
      }
      return novo;
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-fill to-brand-fillhover p-5 text-white shadow-[0_1px_3px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{boasVindas(genero, nome)}</h1>
          {!minimizado && citacao ? <p className="mt-1 text-sm text-white/85">&ldquo;{citacao}&rdquo;</p> : null}
        </div>
        <button
          type="button"
          onClick={alternarMinimizado}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm leading-none hover:bg-white/20"
          aria-label={minimizado ? "Expandir" : "Minimizar"}
        >
          {minimizado ? "▾" : "✕"}
        </button>
      </div>

      {!minimizado ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/15 pt-3">
          <span className="text-2xl font-bold tabular-nums">
            {agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
          {previsao ? (
            <div className="flex gap-3">
              {previsao.map((d) => (
                <div key={d.data} className="flex flex-col items-center text-xs">
                  <span>{new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short" })}</span>
                  <span className="text-base">{d.emoji}</span>
                  <span className="tabular-nums">
                    {d.max}°/{d.min}°
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
