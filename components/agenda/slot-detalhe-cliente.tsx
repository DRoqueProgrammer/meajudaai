"use client";

import { CancelarServicoBotao } from "@/components/agenda/cancelar-servico-botao";
import { ResponderRenegociacao } from "@/components/agenda/responder-renegociacao";
import { PerfilPopover, type PerfilResumo } from "@/components/perfil-popover";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import type { DiaTimelineEvento } from "@/components/agenda/dia-timeline";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

/** Detalhe do horário/serviço na agenda do cliente — sem ações de prestador (aceitar, log privado). */
export function SlotDetalheCliente({ evento, prestador }: { evento: DiaTimelineEvento; prestador: PerfilResumo }) {
  const { slot, servico } = evento;
  if (!servico) return <p className="text-sm text-muted">Horário livre — sem serviço agendado aqui.</p>;

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <PerfilPopover perfil={prestador} />
          <p className="text-xs text-muted">
            {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_ESTILO[servico.status] ?? "bg-surface text-muted"}`}>
          {servico.status}
        </span>
      </div>
      <p className="text-sm">{servico.descricao}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-brand">
          {formatBRL(servico.preco_valor)} {servico.preco_tipo === "hora" ? "/ hora" : "(fechado)"}
        </span>
        {servico.status === "pendente" || servico.status === "confirmado" ? (
          <CancelarServicoBotao servicoId={servico.id} />
        ) : null}
      </div>
      {servico.cancelado_motivo ? <p className="text-xs text-danger">Cancelado: {servico.cancelado_motivo}</p> : null}
    </div>
  );
}
