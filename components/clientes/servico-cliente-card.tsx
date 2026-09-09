"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  proporRenegociacaoAction,
  escreverLogServicoAction,
} from "@/lib/actions/agenda-v2";
import { CancelarServicoBotao } from "@/components/agenda/cancelar-servico-botao";
import { FormError } from "@/components/ui";
import { formatBRL, formatData } from "@/lib/format";

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
  logs: { id: string; texto: string; created_at: string }[];
}

/** Card de um serviço na aba "Serviços" de um cliente — renegociar, cancelar e log privado. */
export function ServicoClienteCard({ servico, logs }: ServicoClienteCardProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [textoLog, setTextoLog] = useState("");

  return (
    <div className="card flex flex-col gap-2">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex items-center justify-between text-left">
        <div>
          <p className="text-xs text-muted">{formatData(servico.created_at.slice(0, 10))}</p>
          <p className="text-sm font-medium">{servico.descricao}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-brand">{formatBRL(servico.preco_valor)}</p>
          <p className="text-[11px] font-semibold uppercase text-muted">{servico.status}</p>
        </div>
      </button>

      {servico.preco_pendente != null ? (
        <p className="text-xs text-accent">Renegociação pendente: {formatBRL(servico.preco_pendente)} (aguardando cliente)</p>
      ) : null}

      {aberto ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {servico.cancelado_motivo ? <p className="text-xs text-danger">Cancelado: {servico.cancelado_motivo}</p> : null}

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
