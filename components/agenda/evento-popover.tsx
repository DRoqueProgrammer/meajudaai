"use client";

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
  /** Sempre presente: horário livre não abre este card — não há serviço pra mostrar. */
  servico: { descricao: string; preco_tipo: string; preco_valor: number; status: string; clienteNome?: string | null };
}

/**
 * Card efêmero com o resumo de um serviço da agenda. Renderiza como overlay
 * centrado na tela (`fixed`, com fundo escurecido) em vez de ancorado dentro
 * da linha do tempo — pra um evento tarde no dia, ancorado ele nascia lá
 * embaixo, quebrando texto num espaço apertado e exigindo rolar a página pra
 * ver. Fecha ao clicar fora, no fundo escurecido — sem botão "Fechar", que só
 * repetiria o gesto que o overlay já oferece. Só o essencial pra decidir se
 * vale abrir o serviço; qualquer ação (aceitar, cancelar, log) fica na página
 * em `href`, não aqui.
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
  const { slot, servico } = evento;
  const status = servico.status;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onFechar}>
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-muted">
            {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[status] ?? "bg-surface text-muted"}`}>
            {status}
          </span>
        </div>
        {servico.clienteNome ? <p className="mt-2 text-sm font-semibold text-muted">{servico.clienteNome}</p> : null}
        <p className="mt-1 text-base font-semibold">{servico.descricao}</p>
        <p className="mt-1 text-base font-semibold text-brand">
          {formatBRL(servico.preco_valor)} {servico.preco_tipo === "hora" ? "/h" : ""}
        </p>
        <Link href={href} className="btn-brand mt-3 block w-full text-center text-xs">
          Ver serviço completo →
        </Link>
      </div>
    </div>
  );
}
