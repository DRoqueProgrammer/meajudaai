"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarRecebimentoAction } from "@/lib/actions/recebimentos";
import { FormError } from "@/components/ui";

/** Espelha as `FORMAS` de `lib/actions/recebimentos.ts` — os rótulos ficam aqui, a action não os exporta. */
const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

/**
 * Painel "Ajustar" no topo do recibo (D-048, `no-print`): o prestador corrige
 * valor, forma ou data ANTES de mandar pelo WhatsApp — sem sair da página e
 * sem apagar/recriar o recebimento (`editarRecebimentoAction` grava na mesma
 * linha). `router.refresh()` atualiza o papel abaixo com o valor novo.
 */
export function AjustarRecebimento({
  id,
  valor,
  forma,
  recebidoEm,
}: {
  id: string;
  valor: number;
  forma: string;
  recebidoEm: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valorTexto, setValorTexto] = useState(() => valor.toFixed(2).replace(".", ","));
  const [formaEscolhida, setFormaEscolhida] = useState(forma);
  const [data, setData] = useState(recebidoEm);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, start] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    start(async () => {
      const r = await editarRecebimentoAction({ id, valor: valorTexto, forma: formaEscolhida, recebidoEm: data });
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-ghost h-11 w-fit px-4 text-sm">
        Ajustar valor, forma ou data
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
      <p className="text-sm font-semibold">Ajustar recebimento</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="aj-valor">
            Valor (R$)
          </label>
          <input
            id="aj-valor"
            className="input"
            inputMode="decimal"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="aj-forma">
            Forma
          </label>
          <select id="aj-forma" className="input" value={formaEscolhida} onChange={(e) => setFormaEscolhida(e.target.value)}>
            {FORMAS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="aj-data">
            Data
          </label>
          <input id="aj-data" type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
      {salvo && !pending ? <p className="text-sm text-ok">Ajuste salvo.</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-brand h-11 px-4 text-sm">
          {pending ? "Salvando…" : "Salvar ajuste"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="btn-ghost h-11 px-4 text-sm">
          Fechar
        </button>
      </div>
    </form>
  );
}
