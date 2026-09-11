"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarRecebimentoAvulsoAction } from "@/lib/actions/recebimentos";
import { FormError } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/datas";

/** Espelha as `FORMAS` de `lib/actions/recebimentos.ts` — os rótulos ficam aqui, a action não os exporta. */
const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

/**
 * "Novo recebimento avulso" (D-048): dinheiro que o prestador recebeu sem
 * estar ligado a um serviço da agenda — material, visita técnica, um extra
 * cobrado por fora. Pagador é um cliente que ele já atendeu (nome vem do
 * perfil, pela lista `clientes`) ou alguém de fora ("Outra pessoa" + nome
 * digitado). No sucesso, abre o recibo numa aba nova e atualiza a lista da
 * página (`router.refresh`) — no molde de `NotaAvulsaDialog`, do
 * Administrador.
 */
export function NovoRecebimentoAvulsoDialog({ clientes }: { clientes: { id: string; nome: string }[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const [pagadorNome, setPagadorNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [recebidoEm, setRecebidoEm] = useState(() => hojeEmSaoPaulo());
  const [forma, setForma] = useState<string>("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function limpar() {
    setClienteId("");
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
      const r = await criarRecebimentoAvulsoAction({
        clienteId: clienteId || null,
        pagadorNome: clienteId ? null : pagadorNome,
        descricao,
        valor,
        forma,
        recebidoEm,
      });
      if (!r.ok || !r.id) {
        setErro(r.erro ?? "Não foi possível lançar o recebimento.");
        return;
      }
      fechar();
      limpar();
      window.open(`/recibo/recebimento/${r.id}`, "_blank");
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={abrir} className="btn-brand h-11 px-4 text-sm">
        Novo recebimento avulso
      </button>

      <dialog
        ref={ref}
        onClose={fechar}
        onClick={(e) => {
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby="recebimento-avulso-titulo"
        className="w-[min(92vw,32rem)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/40"
      >
        <form method="post" onSubmit={enviar} className="flex flex-col gap-4 p-5">
          <h2 id="recebimento-avulso-titulo" className="text-base font-semibold">
            Novo recebimento avulso
          </h2>

          <div>
            <label className="label" htmlFor="ra-cliente">
              Pagador
            </label>
            <select id="ra-cliente" className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Outra pessoa</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {!clienteId ? (
            <div>
              <label className="label" htmlFor="ra-pagador-nome">
                Nome de quem pagou
              </label>
              <input
                id="ra-pagador-nome"
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
            <label className="label" htmlFor="ra-descricao">
              Referente a
            </label>
            <input
              id="ra-descricao"
              className="input"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Material extra"
              minLength={3}
              maxLength={300}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ra-valor">
                Valor (R$)
              </label>
              <input
                id="ra-valor"
                className="input"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="6,99"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="ra-data">
                Data do recebimento
              </label>
              <input
                id="ra-data"
                type="date"
                className="input"
                value={recebidoEm}
                onChange={(e) => setRecebidoEm(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="ra-forma">
              Forma
            </label>
            <select id="ra-forma" className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
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
              {pending ? "Lançando…" : "Lançar recebimento"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
