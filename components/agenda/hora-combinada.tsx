"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { combinarHoraAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";

/**
 * Hora combinada da visita (migration 0051), no detalhe do serviço do
 * prestador: a agenda aberta é uma janela (ex.: 09:00–18:00); depois de
 * combinar com o cliente, o prestador marca a hora (ex.: 10:00) e, se quiser, o
 * fim — opcional (pedido do Leonardo). A agenda dos dois lados passa a mostrar
 * o serviço nessa hora. Vazio e Salvar desmarca.
 */
export function HoraCombinada({
  servicoId,
  janela,
  inicio: inicioAtual,
  fim: fimAtual,
}: {
  servicoId: string;
  janela: { inicio: string; fim: string };
  inicio: string;
  fim: string;
}) {
  const router = useRouter();
  const [inicio, setInicio] = useState(inicioAtual);
  const [fim, setFim] = useState(fimAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, start] = useTransition();
  const mudou = inicio !== inicioAtual || fim !== fimAtual;

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSalvo(false);
        start(async () => {
          const r = await combinarHoraAction({ servicoId, inicio, fim });
          if (r.ok) {
            setSalvo(true);
            router.refresh();
          } else setErro(r.erro ?? "Não foi possível salvar a hora combinada.");
        });
      }}
    >
      <p className="text-sm font-medium">Hora combinada da visita</p>
      <p className="-mt-1 text-xs text-muted">
        Dentro da agenda aberta ({janela.inicio}–{janela.fim}). O fim é opcional.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label text-xs" htmlFor={`hora-inicio-${servicoId}`}>
            Chego às
          </label>
          <input
            id={`hora-inicio-${servicoId}`}
            type="time"
            className="input w-32"
            min={janela.inicio}
            max={janela.fim}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs" htmlFor={`hora-fim-${servicoId}`}>
            Até (opcional)
          </label>
          <input
            id={`hora-fim-${servicoId}`}
            type="time"
            className="input w-32"
            min={inicio || janela.inicio}
            max={janela.fim}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
        <button type="submit" disabled={pending || !mudou} className="btn-brand h-11 px-4 text-sm">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
      {salvo && !mudou ? (
        <p role="status" className="text-xs text-ok">
          Hora combinada salva — já aparece na agenda de vocês dois.
        </p>
      ) : null}
    </form>
  );
}
