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
 * Sinalizar a outra parte de um serviço (migration 0055, pedido do Leonardo):
 * justificativa obrigatória, vai para a administração decidir
 * (`sinalizarAction`). Só um ícone de bandeira em contorno, cinza, com rótulo
 * acessível — em 11/09/2026 o botão vermelho com texto em cada card parecia
 * bandeira RECEBIDA; vermelho cheio fica só para as aprovadas
 * (`components/flags-pessoa.tsx`). Já sinalizado este serviço (a RLS deixa o
 * autor ler a própria sinalização), o ícone dá lugar ao status dela.
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
    const status = STATUS_LABEL[jaSinalizado.status] ?? jaSinalizado.status;
    return (
      <span
        title={`Sinalização enviada em ${formatData(dataEmSaoPaulo(quando))} às ${horaEmSaoPaulo(quando)} — ${status}`}
        className="inline-flex min-h-11 items-center gap-1 text-xs text-muted"
      >
        <BandeiraIcon cheia /> Sinalizado · {status}
      </span>
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
        aria-label={`Sinalizar ${alvoNome}`}
        title="Sinalizar"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <BandeiraIcon />
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

/** Bandeira minimalista (mastro + flâmula) — em contorno para a ação; cheia para "já sinalizado". Mesmo desenho de `flags-pessoa.tsx`. */
function BandeiraIcon({ cheia = false }: { cheia?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cheia ? "h-3.5 w-3.5 shrink-0" : "h-[18px] w-[18px] shrink-0"}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21V4" />
      <path d="M5 4h12l-3 4.5 3 4.5H5" fill={cheia ? "currentColor" : "none"} />
    </svg>
  );
}
