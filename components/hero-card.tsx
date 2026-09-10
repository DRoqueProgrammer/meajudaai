"use client";

import { useEffect, useState } from "react";
import { boasVindas } from "@/lib/saudacao";

// Chave herdada de quando o Hero minimizava citação+clima juntos (D-022); hoje
// só governa o card de clima, mas trocar de chave descartaria a preferência
// já salva no navegador de quem já usa o app sem ganho nenhum.
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
 * Faixa de boas-vindas (Cliente, Administrador, Prestador de Serviço) — ver
 * ROADMAP.md §2.5 e CLAUDE.md. Saudação por gênero + relógio pequeno numa
 * única linha (~44px); a citação saiu (D-022) e o clima (Open-Meteo —
 * gratuita, sem chave de API) vira um card colapsável embaixo, para o total
 * no mobile ficar entre 96 e 120px mesmo aberto.
 */
export function HeroCard({ nome, genero, cidade }: { nome: string; genero: string | null; cidade: string | null }) {
  const [agora, setAgora] = useState<Date | null>(null);
  const [previsao, setPrevisao] = useState<DiaPrevisao[] | null>(null);
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    setAgora(new Date());
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
    <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-fill to-brand-fillhover text-white shadow-[0_1px_3px_rgba(15,23,42,0.10)]">
      {/* Faixa de saudação — sempre visível, ~44px de altura (a bordo do
          botão de 44×44, não de padding extra). O h1 fica menor que a escala
          padrão de página (text-2xl) de propósito: aqui é uma faixa utilitária,
          não o título da tela. */}
      <div className="flex items-center justify-between gap-3 px-4">
        <h1 className="truncate py-2.5 text-base font-bold tracking-tight">{boasVindas(genero, nome)}</h1>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-white/90">
            {agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
          {previsao ? (
            <button
              type="button"
              onClick={alternarMinimizado}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-base leading-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-expanded={!minimizado}
              aria-label={minimizado ? "Mostrar previsão do tempo" : "Ocultar previsão do tempo"}
            >
              {minimizado ? "▾" : "▴"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Card de clima colapsável (direção f) — só existe quando há previsão;
          fechado, a faixa acima já cumpre o teto de 96–120px no mobile. */}
      {!minimizado && previsao ? (
        <div className="flex gap-3 overflow-x-auto border-t border-white/15 px-4 py-2">
          {previsao.map((d) => (
            <div key={d.data} className="flex flex-col items-center gap-0.5 text-xs">
              <span className="text-rotulo uppercase tracking-wide text-white/70">
                {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short" })}
              </span>
              <span aria-hidden>{d.emoji}</span>
              <span className="tabular-nums text-white/90">
                {d.max}°/{d.min}°
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
