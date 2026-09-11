"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apagarRecebimentoAvulsoAction } from "@/lib/actions/recebimentos";
import { formatBRL, formatData } from "@/lib/format";
import { numeroDaNotaAvulsa } from "@/lib/comissao/regras";

/** Espelha as `FORMAS` de `lib/actions/recebimentos.ts` — os rótulos ficam aqui, a action não os exporta. */
const FORMA_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

export interface RecebimentoAvulso {
  id: string;
  numero: number;
  pagadorNome: string;
  descricao: string;
  valor: number;
  recebidoEm: string;
  forma: string;
}

/**
 * Lista de recebimentos avulsos do ano (D-048): número, pagador, descrição,
 * valor, data, forma, o recibo (aba nova) e "Apagar" em DOIS PASSOS — sem
 * `window.confirm` (pedido do controller), no molde de `ChavesPix`: o botão
 * vira "Confirmar" / "Voltar" antes de agir.
 */
export function RecebimentosAvulsosLista({ itens }: { itens: RecebimentoAvulso[] }) {
  const router = useRouter();
  const [apagando, setApagando] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apagar(id: string) {
    setErro(null);
    setEmAndamento(id);
    start(async () => {
      const r = await apagarRecebimentoAvulsoAction(id);
      setEmAndamento(null);
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível apagar.");
        return;
      }
      setApagando(null);
      router.refresh();
    });
  }

  if (itens.length === 0) {
    return <p className="card-vazio">Nenhum recebimento avulso este ano — lance um acima quando cobrar algo fora da agenda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((r) => (
        <div key={r.id} className="card flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              Nº P-{numeroDaNotaAvulsa(r.numero)} · {r.descricao}
            </p>
            <p className="truncate text-xs text-muted">
              {r.pagadorNome} · {formatData(r.recebidoEm)} · {formatBRL(r.valor)} · {FORMA_LABEL[r.forma] ?? r.forma}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/recibo/recebimento/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand underline"
            >
              Recibo
            </Link>
            {apagando === r.id ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => apagar(r.id)}
                  className="btn-danger h-11 px-3 text-sm"
                >
                  {pending && emAndamento === r.id ? "Apagando…" : "Confirmar"}
                </button>
                <button type="button" onClick={() => setApagando(null)} className="btn-ghost h-11 px-3 text-sm">
                  Voltar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setApagando(r.id)}
                className="btn-ghost h-11 border-danger px-3 text-sm text-danger"
              >
                Apagar
              </button>
            )}
          </div>
        </div>
      ))}
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  );
}
