"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarNotaAvulsaAction } from "@/lib/actions/financeiro";
import { FormError } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/datas";

/** Espelha `FORMAS` de `lib/actions/financeiro.ts` — os rótulos ficam aqui, a action não os exporta. */
const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

/**
 * "Criar nota avulsa" (pedido do Leonardo em 11/09/2026): recibo numerado de
 * um recebimento fora da comissão automática (taxa de cadastro, material,
 * comissão paga em dinheiro…). Pagador é um prestador da praça (o nome vem do
 * perfil) OU alguém de fora ("Outra pessoa" + nome digitado). No sucesso,
 * abre o recibo numa aba nova e atualiza a lista da página (`router.refresh`).
 */
export function NotaAvulsaDialog({
  workspaceId,
  prestadores,
}: {
  workspaceId: string;
  prestadores: { id: string; nome: string }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [prestadorId, setPrestadorId] = useState("");
  const [pagadorNome, setPagadorNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [recebidoEm, setRecebidoEm] = useState(() => hojeEmSaoPaulo());
  const [forma, setForma] = useState<string>("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function limpar() {
    setPrestadorId("");
    setPagadorNome("");
    setDescricao("");
    setValor("");
    setRecebidoEm(hojeEmSaoPaulo());
    setForma("pix");
    setErro(null);
  }

  function abrir() {
    setErro(null);
    ref.current?.showModal();
  }

  function fechar() {
    ref.current?.close();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await criarNotaAvulsaAction({
        workspaceId,
        prestadorId: prestadorId || null,
        pagadorNome: prestadorId ? null : pagadorNome,
        descricao,
        valor,
        recebidoEm,
        forma,
      });
      if (!r.ok || !r.id) {
        setErro(r.erro ?? "Não foi possível criar a nota avulsa.");
        return;
      }
      fechar();
      limpar();
      window.open(`/recibo/nota/${r.id}`, "_blank");
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={abrir} className="btn-brand">
        Criar nota avulsa
      </button>

      <dialog
        ref={ref}
        onClose={fechar}
        onClick={(e) => {
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby="nota-avulsa-titulo"
        className="w-[min(92vw,32rem)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40"
      >
        <form method="post" onSubmit={enviar} className="flex flex-col gap-4 p-5">
          <h2 id="nota-avulsa-titulo" className="text-base font-semibold">
            Nova nota avulsa
          </h2>

          <div>
            <label className="label" htmlFor="na-prestador">
              Pagador
            </label>
            <select
              id="na-prestador"
              className="input"
              value={prestadorId}
              onChange={(e) => setPrestadorId(e.target.value)}
            >
              <option value="">Outra pessoa</option>
              {prestadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {!prestadorId ? (
            <div>
              <label className="label" htmlFor="na-pagador-nome">
                Nome de quem pagou
              </label>
              <input
                id="na-pagador-nome"
                className="input"
                value={pagadorNome}
                onChange={(e) => setPagadorNome(e.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="na-descricao">
              Referente a
            </label>
            <input
              id="na-descricao"
              className="input"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Taxa de cadastro"
              minLength={3}
              maxLength={300}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="na-valor">
                Valor (R$)
              </label>
              <input
                id="na-valor"
                className="input"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="6,99"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="na-data">
                Data do recebimento
              </label>
              <input
                id="na-data"
                type="date"
                className="input"
                value={recebidoEm}
                onChange={(e) => setRecebidoEm(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="na-forma">
              Forma
            </label>
            <select id="na-forma" className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {erro ? <FormError>{erro}</FormError> : null}

          <div className="flex gap-3">
            <button type="button" onClick={fechar} disabled={pending} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="btn-brand flex-1">
              {pending ? "Criando…" : "Criar nota"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
