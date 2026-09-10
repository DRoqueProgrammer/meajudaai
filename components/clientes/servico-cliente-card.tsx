"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmarServicoAction,
  proporRenegociacaoAction,
  escreverLogServicoAction,
} from "@/lib/actions/agenda-v2";
import { CancelarServicoBotao } from "@/components/agenda/cancelar-servico-botao";
import { FormError } from "@/components/ui";
import { formatBRL, formatData, formatHora } from "@/lib/format";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

export interface ServicoClienteCardProps {
  servico: {
    id: string;
    descricao: string;
    preco_tipo: string;
    preco_valor: number;
    preco_pendente: number | null;
    status: string;
    cancelado_motivo: string | null;
    created_at: string;
  };
  slot: { data: string; hora_inicio: string; hora_fim: string } | null;
  logs: { id: string; texto: string; created_at: string }[];
}

/** Card de um serviço na aba "Serviços" de um cliente — renegociar, cancelar e log privado. */
export function ServicoClienteCard({ servico, slot, logs }: ServicoClienteCardProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [textoLog, setTextoLog] = useState("");

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-card px-3 py-2.5">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">
            {slot ? `${formatData(slot.data)} · ${formatHora(slot.hora_inicio)}–${formatHora(slot.hora_fim)}` : formatData(servico.created_at.slice(0, 10))}
          </p>
          <p className="truncate text-sm font-semibold">{servico.descricao}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-brand">{formatBRL(servico.preco_valor)}</p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[servico.status] ?? "bg-surface text-muted"}`}>
            {servico.status}
          </span>
        </div>
      </button>

      {/* `text-accent` (#FFC107 puro) como texto dava baixo contraste sobre
          --card; `tint-warn-ink` é a tinta pensada pra isso. */}
      {servico.preco_pendente != null ? (
        <p className="text-xs text-tint-warn-ink">Renegociação pendente: {formatBRL(servico.preco_pendente)} (aguardando cliente)</p>
      ) : null}

      {aberto ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {servico.cancelado_motivo ? <p className="text-xs text-danger">Cancelado: {servico.cancelado_motivo}</p> : null}

          {servico.status === "pendente" ? (
            <button
              type="button"
              disabled={pending}
              className="btn-action self-start px-4 text-xs"
              onClick={() =>
                start(async () => {
                  const r = await confirmarServicoAction(servico.id);
                  if (r.ok) router.refresh();
                  else setErro(r.erro ?? "Não foi possível confirmar.");
                })
              }
            >
              Aceitar serviço
            </button>
          ) : null}

          {servico.status !== "cancelado" && servico.status !== "realizado" && servico.preco_pendente == null ? (
            <button
              type="button"
              disabled={pending}
              className="btn-ghost self-start px-3 text-xs"
              onClick={() => {
                const valor = window.prompt("Novo valor (R$):", String(servico.preco_valor));
                if (!valor) return;
                const num = Number(valor.replace(",", "."));
                if (!(num > 0)) return;
                start(async () => {
                  const r = await proporRenegociacaoAction({ servicoId: servico.id, novoValor: num });
                  if (r.ok) router.refresh();
                  else setErro(r.erro ?? "Não foi possível propor.");
                });
              }}
            >
              Renegociar valor
            </button>
          ) : null}

          {servico.status === "pendente" || servico.status === "confirmado" ? (
            <CancelarServicoBotao servicoId={servico.id} />
          ) : null}

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase text-muted">Suas observações (só você vê)</p>
            {logs.map((l) => (
              <p key={l.id} className="text-xs text-muted">
                {new Date(l.created_at).toLocaleString("pt-BR")} — {l.texto}
              </p>
            ))}
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs"
                placeholder="Anotar algo sobre esse serviço…"
                value={textoLog}
                onChange={(e) => setTextoLog(e.target.value)}
              />
              <button
                type="button"
                disabled={pending || !textoLog.trim()}
                className="btn-ghost px-3 text-xs"
                onClick={() =>
                  start(async () => {
                    const r = await escreverLogServicoAction({ servicoId: servico.id, texto: textoLog });
                    if (r.ok) {
                      setTextoLog("");
                      router.refresh();
                    } else setErro(r.erro ?? "Não foi possível salvar.");
                  })
                }
              >
                Salvar
              </button>
            </div>
          </div>
          {erro ? <FormError>{erro}</FormError> : null}
        </div>
      ) : null}
    </div>
  );
}
