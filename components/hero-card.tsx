"use client";

import { useEffect, useState } from "react";
import { boasVindas } from "@/lib/saudacao";
import { CITACOES } from "@/lib/citacoes";
import type { ClimaAgora, DiaPrevisao } from "@/lib/clima";

const CHAVE_MINIMIZADO = "maa-hero-minimizado";

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora local. */
function periodoDoDia(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Quinta-feira, 10 de setembro". */
function dataPorExtenso(d: Date): string {
  const t = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Rótulo curto do dia da previsão: "Hoje", depois "Sex", "Sáb"… */
function rotuloDia(data: string, i: number): string {
  if (i === 0) return "Hoje";
  const t = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Sorteia um índice de frase diferente do atual (para o botão "Outra frase" sempre trocar). */
function sortearFrase(atual: number | null): number {
  if (CITACOES.length < 2) return 0;
  let i = Math.floor(Math.random() * CITACOES.length);
  if (i === atual) i = (i + 1) % CITACOES.length;
  return i;
}

function IconePino() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function IconeTrocar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3v5h5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 21v-5h-5" />
    </svg>
  );
}

function IconeSeta({ paraCima }: { paraCima: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 transition-transform motion-reduce:transition-none ${paraCima ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

/**
 * Hero do Início de Cliente e Prestador de Serviço (CLAUDE.md, ROADMAP.md §2.5).
 * Redesenhado em 10/09/2026 a pedido do Leonardo ("quero um hero BONITO,
 * elegante… preencha esses espaços, melhore tamanhos e layout… recoloque as
 * frases"): à esquerda, a data, a saudação por gênero em tamanho de título e a
 * frase sorteada (com "Outra frase"); à direita, um painel com o relógio grande,
 * o tempo agora na cidade e os próximos dias. Fundo azul da marca com a grade
 * de planta baixa bem sutil — o ofício de obra do app — e um brilho do amarelo.
 *
 * O clima vem de `/api/clima` (o servidor fala com a Open-Meteo; o navegador
 * não). Tudo o que depende do relógio ou do sorteio só aparece depois de
 * montar, para o HTML do servidor e o do navegador não divergirem.
 * Minimizado, vira uma faixa com saudação, hora e temperatura.
 */
export function HeroCard({ nome, genero, cidade }: { nome: string; genero: string | null; cidade: string | null }) {
  const [agora, setAgora] = useState<Date | null>(null);
  const [climaAgora, setClimaAgora] = useState<ClimaAgora | null>(null);
  const [previsao, setPrevisao] = useState<DiaPrevisao[] | null>(null);
  const [minimizado, setMinimizado] = useState(false);
  const [frase, setFrase] = useState<number | null>(null);

  useEffect(() => {
    setAgora(new Date());
    setFrase(sortearFrase(null));
    const t = setInterval(() => setAgora(new Date()), 1000);
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
        const res = await fetch(`/api/clima?cidade=${encodeURIComponent(cidade)}`);
        const json = await res.json();
        if (cancelado) return;
        if (json?.agora) setClimaAgora(json.agora);
        if (json?.previsao) setPrevisao(json.previsao);
      } catch {
        // Sem clima (API fora do ar, cidade não encontrada) — o Hero funciona sem ele.
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

  const hh = agora ? String(agora.getHours()).padStart(2, "0") : "--";
  const mm = agora ? String(agora.getMinutes()).padStart(2, "0") : "--";
  const ss = agora ? String(agora.getSeconds()).padStart(2, "0") : "--";
  const saudacao = boasVindas(genero, nome);

  const botaoMinimizar = (
    <button
      type="button"
      onClick={alternarMinimizado}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
      aria-expanded={!minimizado}
      aria-label={minimizado ? "Expandir o painel de boas-vindas" : "Recolher o painel de boas-vindas"}
    >
      <IconeSeta paraCima={!minimizado} />
    </button>
  );

  return (
    <section
      aria-label="Boas-vindas"
      className="relative isolate overflow-hidden rounded-3xl bg-[#0D47A1] text-white shadow-[0_24px_48px_-24px_rgba(13,71,161,0.65)] ring-1 ring-inset ring-white/10"
    >
      {/* Fundo: gradiente da marca, grade de planta baixa quase invisível e um
          brilho do amarelo no canto — decoração só, fora da árvore de leitura. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#0D47A1_0%,#0B3C8C_48%,#082B66_100%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(115deg,black_10%,transparent_75%)]"
      />
      <div aria-hidden="true" className="absolute -right-28 -top-32 -z-10 h-80 w-80 rounded-full bg-[#FFC107] opacity-[0.18] blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 left-1/3 -z-10 h-72 w-72 rounded-full bg-[#42A5F5] opacity-[0.16] blur-3xl" />

      {minimizado ? (
        <div className="flex min-h-[64px] items-center justify-between gap-3 py-2 pl-5 pr-2 sm:pl-6">
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight sm:text-xl">{saudacao}</h1>
          <div className="flex shrink-0 items-center gap-3">
            {climaAgora ? (
              <span className="hidden items-center gap-1.5 text-sm font-medium text-white/85 sm:inline-flex">
                <span aria-hidden="true">{climaAgora.emoji}</span>
                <span className="tabular-nums">{climaAgora.temperatura}°</span>
              </span>
            ) : null}
            <span className="text-lg font-semibold tabular-nums">
              {hh}:{mm}
            </span>
            {botaoMinimizar}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10 lg:p-9">
          {/* Esquerda: data, saudação e frase. */}
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD54F]">
                  {agora ? `${periodoDoDia(agora)} · ${dataPorExtenso(agora)}` : " "}
                </p>
                <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight [text-wrap:balance] sm:text-[42px] lg:text-[54px]">
                  {saudacao}
                </h1>
              </div>
              {/* No celular o botão fica aqui; no desktop, no canto do painel. */}
              <div className="-mr-2 -mt-2 lg:hidden">{botaoMinimizar}</div>
            </div>

            <figure className="relative mt-auto max-w-[52ch] rounded-2xl border-l-4 border-[#FFC107] bg-white/[0.06] py-3 pl-4 pr-3 sm:py-4 sm:pl-5 sm:pr-4">
              <span aria-hidden="true" className="pointer-events-none absolute -top-5 right-3 select-none font-serif text-[88px] leading-none text-[#FFC107]/35">
                ”
              </span>
              <blockquote className="min-h-[2.6em] text-base font-medium leading-snug text-white/95 sm:text-xl lg:text-[22px]">
                {frase !== null ? CITACOES[frase] : " "}
              </blockquote>
              <figcaption className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Frase do dia</span>
                <button
                  type="button"
                  onClick={() => setFrase((f) => sortearFrase(f))}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  <IconeTrocar />
                  Outra frase
                </button>
              </figcaption>
            </figure>
          </div>

          {/* Direita: relógio, tempo agora e próximos dias. */}
          <div className="relative flex min-w-0 flex-col gap-4 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm sm:gap-5 sm:p-6">
            <div className="absolute right-2 top-2 hidden lg:block">{botaoMinimizar}</div>

            <div className="flex items-end justify-between gap-4">
              <p className="leading-none" aria-label={agora ? `Agora são ${hh} horas e ${mm} minutos` : undefined}>
                <time dateTime={agora?.toISOString()} className="font-bold tabular-nums tracking-tight">
                  <span className="text-[46px] sm:text-[68px]">
                    {hh}
                    <span className="text-white/60">:</span>
                    {mm}
                  </span>
                  <span className="ml-1 align-top text-sm font-semibold text-white/55 sm:ml-1.5 sm:text-xl">{ss}</span>
                </time>
              </p>
              {climaAgora ? (
                <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:pr-10">
                  <span aria-hidden="true" className="text-[34px] leading-none sm:text-5xl">
                    {climaAgora.emoji}
                  </span>
                  <div>
                    <p className="text-2xl font-bold leading-none tabular-nums sm:text-4xl">{climaAgora.temperatura}°</p>
                    <p className="mt-1 text-xs text-white/70">sensação {climaAgora.sensacao}°</p>
                  </div>
                </div>
              ) : null}
            </div>

            {cidade ? (
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                <IconePino />
                <span className="truncate">
                  {cidade}
                  {climaAgora ? ` · ${climaAgora.descricao}` : ""}
                </span>
              </p>
            ) : null}

            {previsao && previsao.length > 0 ? (
              <ul className="grid grid-cols-4 gap-2" aria-label="Previsão dos próximos dias">
                {previsao.slice(0, 4).map((d, i) => (
                  <li
                    key={d.data}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center sm:gap-1.5 sm:py-3 ${i === 0 ? "bg-white/[0.14] ring-1 ring-inset ring-white/20" : "bg-white/[0.06]"}`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/70">{rotuloDia(d.data, i)}</span>
                    <span aria-hidden="true" className="text-2xl leading-none sm:text-[28px]">
                      {d.emoji}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {d.max}°<span className="ml-1 font-normal text-white/60">{d.min}°</span>
                    </span>
                    <span className="sr-only">{d.descricao}</span>
                  </li>
                ))}
              </ul>
            ) : cidade ? (
              <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[78px] animate-pulse sm:h-[92px] rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
