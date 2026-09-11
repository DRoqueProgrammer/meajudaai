"use client";

import { useRef, useState, useTransition } from "react";
import { sinalizarAction } from "@/lib/actions/suspeitas";
import { FormError } from "@/components/ui";
import { formatData } from "@/lib/format";
import { dataEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";

/** Espelha os `motivo` de `sinalizarAction` (migration 0055) — os rótulos ficam aqui, a ação não os exporta. */
const MOTIVOS = [
  { value: "nao_pagou", label: "Não pagou" },
  { value: "contato_por_fora", label: "Levou o contato para fora da plataforma" },
  { value: "nao_compareceu", label: "Não compareceu" },
  { value: "problema_no_servico", label: "Problema no serviço" },
  { value: "outro", label: "Outro" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pendente: "em análise",
  aprovada: "aprovada",
  recusada: "recusada",
};

export interface SinalizacaoExistente {
  status: string;
  criadoEm: string;
}

/**
 * "Flag Pilantra" (migration 0055, pedido do Leonardo): uma das partes de um
 * serviço sinaliza a outra, com justificativa obrigatória — vai para a
 * administração decidir (`sinalizarAction`). Já sinalizado este serviço (a
 * RLS deixa o autor ler a própria sinalização), o botão dá lugar ao status
 * dela, em vez de deixar a pessoa sinalizar de novo.
 */
export function SinalizarServico({
  servicoId,
  alvoNome,
  jaSinalizado,
}: {
  servicoId: string;
  alvoNome: string;
  jaSinalizado: SinalizacaoExistente | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [pending, start] = useTransition();

  if (jaSinalizado) {
    const quando = new Date(jaSinalizado.criadoEm);
    return (
      <p className="text-xs text-muted">
        Sinalização enviada em {formatData(dataEmSaoPaulo(quando))} às {horaEmSaoPaulo(quando)} —{" "}
        {STATUS_LABEL[jaSinalizado.status] ?? jaSinalizado.status}.
      </p>
    );
  }

  function abrir() {
    setErro(null);
    ref.current?.showModal();
  }

  function fechar() {
    ref.current?.close();
    if (!enviada) {
      setMotivo("");
      setJustificativa("");
      setErro(null);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (justificativa.trim().length < 10) {
      setErro("Conte o que aconteceu (pelo menos 10 caracteres).");
      return;
    }
    setErro(null);
    start(async () => {
      const r = await sinalizarAction({ servicoId, motivo, justificativa });
      if (r.ok) setEnviada(true);
      else setErro(r.erro ?? "Não foi possível enviar a sinalização.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-danger hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <BandeiraIcon /> Flag Pilantra
      </button>

      <dialog
        ref={ref}
        onClose={fechar}
        onClick={(e) => {
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby="sinalizar-titulo"
        className="w-[min(92vw,28rem)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40"
      >
        {enviada ? (
          <div className="flex flex-col gap-3 p-5">
            <h2 id="sinalizar-titulo" className="text-base font-semibold">
              Sinalização enviada para análise.
            </h2>
            <p className="text-sm text-muted">A outra pessoa não é avisada de quem sinalizou.</p>
            <button type="button" onClick={fechar} className="btn-brand w-full">
              Fechar
            </button>
          </div>
        ) : (
          <form method="post" onSubmit={enviar} className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 id="sinalizar-titulo" className="text-base font-semibold">
                Sinalizar <span className="text-danger">{alvoNome}</span>
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Vai para a administração analisar. A outra pessoa não é avisada de quem sinalizou.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="sinalizar-motivo">
                O que aconteceu?
              </label>
              <select
                id="sinalizar-motivo"
                className="input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              >
                <option value="" disabled>
                  Escolha um motivo…
                </option>
                {MOTIVOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="sinalizar-justificativa">
                Justificativa
              </label>
              <textarea
                id="sinalizar-justificativa"
                className="input"
                rows={4}
                minLength={10}
                maxLength={600}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Conte o que aconteceu…"
                required
              />
              <p className="mt-1 text-right text-xs text-muted">{justificativa.length}/600</p>
            </div>

            {erro ? <FormError>{erro}</FormError> : null}

            <div className="flex gap-3">
              <button type="button" onClick={fechar} disabled={pending} className="btn-ghost flex-1">
                Voltar
              </button>
              <button
                type="submit"
                disabled={pending || !motivo || justificativa.trim().length < 10}
                className="btn-brand flex-1"
              >
                {pending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

function BandeiraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M6 2.75a.75.75 0 0 0-.75.75v17.5a.75.75 0 0 0 1.5 0v-5.79l1.06-.27a7.75 7.75 0 0 1 5.02.32 7.75 7.75 0 0 0 5.92-.12.9.9 0 0 0 .5-.81V5.1a.9.9 0 0 0-1.28-.82 6.25 6.25 0 0 1-4.77.12 7.75 7.75 0 0 0-5.35-.22l-1.35.42v-.95a.75.75 0 0 0-.75-.75z" />
    </svg>
  );
}
