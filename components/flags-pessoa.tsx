"use client";

import { useEffect, useRef, useState } from "react";
import { bandeirinhas } from "@/lib/flags";
import { dataEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";
import { formatData } from "@/lib/format";

export interface FlagPessoa {
  /** Data/hora do registro (ISO) — vem de `flags_da_pessoa`/`sinalizacoes.created_at`. */
  quando: string;
  /** Nome de quem sinalizou. */
  sinalizado_por: string;
}

/**
 * Red flags da pessoa (migrations 0054/0055, pedido do Leonardo em
 * 10/09/2026): uma bandeirinha vermelha por sinalização aprovada, até 5; de 6
 * em diante, "N×" com uma bandeira só (`lib/flags.ts`). A lista SEMPRE
 * vem de `sb.rpc("flags_da_pessoa", { p_alvo })` com o client da sessão — a
 * função só devolve linha pra quem é do outro lado (cliente↔prestador) ou da
 * administração; pro próprio alvo, vem vazia, e este componente não desenha
 * nada.
 *
 * Hover (mouse), foco (teclado) e toque abrem um cartão com cada registro, do
 * mais recente para o mais antigo — "dd/mm/aaaa às HH:MM — por <nome>", no
 * fuso de São Paulo. Esc e clique fora fecham.
 */
export function FlagsPessoa({ flags }: { flags: FlagPessoa[] }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const aoClicar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicar);
    };
  }, [aberto]);

  if (flags.length === 0) return null;

  const { icones, contador } = bandeirinhas(flags.length);
  const rotulo = `${flags.length} ${flags.length === 1 ? "red flag" : "red flags"}`;

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onClick={() => setAberto((a) => !a)}
        className="inline-flex min-h-6 items-center gap-0.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {contador ? <span className="mr-0.5 text-xs font-semibold tabular-nums text-danger">{contador}</span> : null}
        {Array.from({ length: icones }).map((_, i) => (
          <BandeiraIcon key={i} />
        ))}
      </button>
      {aberto ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-[1002] mt-2 w-64 max-w-[80vw] rounded-2xl border border-line bg-card p-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">{rotulo}</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {flags.map((f, i) => {
              const d = new Date(f.quando);
              return (
                <li key={i} className="text-xs leading-relaxed text-muted">
                  {formatData(dataEmSaoPaulo(d))} às {horaEmSaoPaulo(d)} — por{" "}
                  <span className="font-medium text-ink">{f.sinalizado_por}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Red flag minimalista (mastro + flâmula cheia), em SVG — não emoji, pedido explícito do Leonardo. Mesmo desenho do ícone de sinalizar. */
function BandeiraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-danger"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21V4" />
      <path d="M5 4h12l-3 4.5 3 4.5H5" fill="currentColor" />
    </svg>
  );
}
