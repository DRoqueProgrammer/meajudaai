"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatBRL, formatData, formatHora } from "@/lib/format";

const STATUS_ESTILO: Record<string, string> = {
  livre: "bg-tint-info text-brand",
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

export interface EventoPopoverEvento {
  slot: { id: string; data: string; hora_inicio: string; hora_fim: string; status: string };
  servico: { descricao: string; preco_tipo: string; preco_valor: number; status: string } | null;
}

/**
 * Card efêmero com o resumo de um evento da agenda — abre ancorado logo
 * abaixo do bloco clicado na linha do tempo, fecha ao clicar fora. Só o
 * essencial pra decidir se vale abrir o serviço; qualquer ação (aceitar,
 * cancelar, log) fica na página em `href`, não aqui.
 */
export function EventoPopover({
  evento,
  href,
  onFechar,
}: {
  evento: EventoPopoverEvento;
  href: string;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onFechar();
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [onFechar]);

  const { slot, servico } = evento;
  const status = servico?.status ?? slot.status;

  return (
    <div
      ref={ref}
      className="w-64 rounded-xl border border-line bg-card p-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">
          {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_ESTILO[status] ?? "bg-surface text-muted"}`}>
          {status}
        </span>
      </div>
      {servico ? (
        <>
          <p className="mt-1.5 text-sm font-medium">{servico.descricao}</p>
          <p className="mt-1 text-sm font-semibold text-brand">
            {formatBRL(servico.preco_valor)} {servico.preco_tipo === "hora" ? "/h" : ""}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted">Horário livre — ainda sem cliente.</p>
      )}
      <Link href={href} className="btn-ghost mt-2.5 block w-full text-center text-xs">
        Ver serviço →
      </Link>
    </div>
  );
}
