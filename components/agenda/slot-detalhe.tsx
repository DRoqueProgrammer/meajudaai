"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmarServicoAction,
  marcarRealizadoAction,
  cancelarServicoAction,
  escreverLogServicoAction,
} from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatBRL, formatData, formatHora } from "@/lib/format";

export interface SlotDetalheProps {
  slot: {
    id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    status: string;
  };
  servico: {
    id: string;
    descricao: string;
    preco_tipo: string;
    preco_valor: number;
    status: string;
    cancelado_motivo: string | null;
  } | null;
  logs: { id: string; texto: string; created_at: string }[];
}

/**
 * Detalhe de um horário da agenda — descrição do serviço (se houver), log
 * privado e ações (aceitar / marcar como realizado / cancelar). Por padrão
 * expande/recolhe ao clicar no cabeçalho (usado dentro de um card efêmero);
 * `paginaCompleta` pula o cabeçalho clicável e mostra tudo aberto (usado em
 * /agenda/[slotId]).
 */
export function SlotDetalhe({ slot, servico, logs, paginaCompleta = false }: SlotDetalheProps & { paginaCompleta?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(paginaCompleta);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [textoLog, setTextoLog] = useState("");

  const corStatus: Record<string, string> = {
    livre: "text-muted",
    // `text-accent` (#FFC107 puro) como texto dava ~1,5:1 sobre --card — ilegível.
    // `tint-warn-ink` é a tinta pensada pra isso (ver tailwind.config.ts).
    pendente: "text-tint-warn-ink",
    confirmado: "text-action",
    cancelado: "text-danger",
    realizado: "text-brand",
  };

  const cabecalho = (
    <span className="flex items-center justify-between text-left">
      <span className="text-sm font-medium">
        {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
      </span>
      <span className={`text-xs font-semibold uppercase ${corStatus[servico?.status ?? slot.status] ?? ""}`}>
        {servico?.status ?? slot.status}
      </span>
    </span>
  );

  return (
    <div className={paginaCompleta ? "flex flex-col gap-2" : "card flex flex-col gap-2"}>
      {paginaCompleta ? (
        cabecalho
      ) : (
        <button type="button" onClick={() => setAberto((a) => !a)} className="flex items-center justify-between text-left">
          {cabecalho}
        </button>
      )}

      {aberto ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {servico ? (
            <>
              <p className="text-sm">{servico.descricao}</p>
              <p className="text-sm font-semibold text-brand">
                {formatBRL(servico.preco_valor)} {servico.preco_tipo === "hora" ? "/ hora" : "(fechado)"}
              </p>
              {servico.cancelado_motivo ? (
                <p className="text-xs text-danger">Cancelado: {servico.cancelado_motivo}</p>
              ) : null}

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

              {servico.status === "confirmado" ? (
                <button
                  type="button"
                  disabled={pending}
                  className="btn-action self-start px-4 text-xs"
                  onClick={() => {
                    if (!window.confirm("Marcar este serviço como realizado? Essa ação não pode ser desfeita.")) return;
                    start(async () => {
                      const r = await marcarRealizadoAction(servico.id);
                      if (r.ok) router.refresh();
                      else setErro(r.erro ?? "Não foi possível marcar como realizado.");
                    });
                  }}
                >
                  Marcar como realizado
                </button>
              ) : null}

              {servico.status === "pendente" || servico.status === "confirmado" ? (
                <button
                  type="button"
                  disabled={pending}
                  className="btn-ghost self-start px-4 text-xs text-danger"
                  onClick={() => {
                    const motivo = window.prompt("Justificativa do cancelamento:");
                    if (!motivo) return;
                    start(async () => {
                      const r = await cancelarServicoAction({ servicoId: servico.id, motivo });
                      if (r.ok) router.refresh();
                      else setErro(r.erro ?? "Não foi possível cancelar.");
                    });
                  }}
                >
                  Cancelar serviço
                </button>
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
            </>
          ) : (
            <p className="text-xs text-muted">Horário livre — ainda sem cliente.</p>
          )}
          {erro ? <FormError>{erro}</FormError> : null}
        </div>
      ) : null}
    </div>
  );
}
