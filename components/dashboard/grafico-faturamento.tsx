"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";

export interface MesFaturamento {
  mes: string; // "2026-09"
  rotulo: string; // "set"
  faturamento: number;
  numServicos: number;
  numClientes: number;
}

/**
 * Gráfico de barras do faturamento mensal — sem lib de charts, só SVG (o
 * projeto não tinha nenhuma até agora, e 6-12 barras não justificam a
 * dependência). Hover numa barra mostra faturamento, nº de serviços e nº de
 * clientes distintos daquele mês.
 */
export function GraficoFaturamento({ meses }: { meses: MesFaturamento[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(1, ...meses.map((m) => m.faturamento));
  const W = 600;
  const H = 160;
  const padBottom = 24;
  const larguraBarra = W / meses.length;
  const ativo = hoverIdx != null ? meses[hoverIdx] : null;

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Faturamento por mês</p>
        {ativo ? (
          <p className="text-xs text-muted">
            {ativo.numServicos} {ativo.numServicos === 1 ? "serviço" : "serviços"} · {ativo.numClientes}{" "}
            {ativo.numClientes === 1 ? "cliente" : "clientes"}
          </p>
        ) : null}
      </div>
      <p className="text-2xl font-bold text-brand">{formatBRL(ativo?.faturamento ?? meses[meses.length - 1]?.faturamento ?? 0)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHoverIdx(null)}>
        {meses.map((m, i) => {
          const alturaMax = H - padBottom;
          const altura = m.faturamento > 0 ? Math.max(4, (m.faturamento / max) * alturaMax) : 2;
          const x = i * larguraBarra;
          const y = alturaMax - altura;
          const emHover = hoverIdx === i;
          return (
            <g key={m.mes} onMouseEnter={() => setHoverIdx(i)}>
              <rect x={x} y={0} width={larguraBarra} height={H} fill="transparent" />
              <rect
                x={x + larguraBarra * 0.2}
                y={y}
                width={larguraBarra * 0.6}
                height={altura}
                rx={4}
                className={emHover ? "fill-brand-fillhover" : "fill-brand-fill"}
              />
              <text x={x + larguraBarra / 2} y={H - 6} textAnchor="middle" className="fill-current text-rotulo text-muted" fontSize={11}>
                {m.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
