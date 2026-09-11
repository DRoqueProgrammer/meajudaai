"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarChavePixAction,
  definirChavePadraoAction,
  editarChavePixAction,
  excluirChavePixAction,
} from "@/lib/actions/chaves-pix";
import { mascararChavePix } from "@/lib/pix/static-qr";
import { FormError } from "@/components/ui";
import { GeradorQrPix } from "@/components/pix/gerador-qr-pix";

export interface ChavePix {
  id: string;
  apelido: string;
  chave: string;
  padrao: boolean;
}

/**
 * "Minhas chaves Pix" no perfil do prestador (migration 0056; pedidos do
 * Leonardo em 10/09/2026): cada chave gera o próprio QR; uma é a PADRÃO da
 * cobrança dos serviços (na hora de cobrar dá para escolher outra). Aqui:
 * escolher a chave (chips), Editar, Excluir, Tornar padrão, Adicionar nova — e,
 * embaixo, o QR da chave escolhida com valor em aberto para testar ou cobrar
 * algo avulso. As regras (dono, limite de 5, uma padrão) ficam no banco e em
 * lib/actions/chaves-pix.ts.
 */
export function ChavesPix({ chaves, nome, cidade }: { chaves: ChavePix[]; nome: string; cidade: string | null }) {
  const router = useRouter();
  const padrao = chaves.find((c) => c.padrao) ?? chaves[0] ?? null;
  const [selecionadaId, setSelecionadaId] = useState<string | null>(padrao?.id ?? null);
  const selecionada = chaves.find((c) => c.id === selecionadaId) ?? padrao;
  const [modo, setModo] = useState<"ver" | "editar" | "adicionar">(chaves.length === 0 ? "adicionar" : "ver");
  const [apelido, setApelido] = useState("");
  const [chave, setChave] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function abrirFormulario(qual: "editar" | "adicionar") {
    setErro(null);
    setConfirmarExclusao(false);
    setModo(qual);
    setApelido(qual === "editar" && selecionada ? selecionada.apelido : "");
    setChave(qual === "editar" && selecionada ? selecionada.chave : "");
  }

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) {
    setErro(null);
    start(async () => {
      const r = await acao();
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível concluir.");
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  return (
    <section id="chaves-pix" className="card flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Minhas chaves Pix</h2>
          <p className="mt-0.5 text-sm text-muted">
            A chave <strong className="font-semibold text-ink">padrão</strong> é a que aparece quando você cobra um
            serviço — lá dá para escolher outra, se quiser.
          </p>
        </div>
        {modo !== "adicionar" && chaves.length < 5 ? (
          <button type="button" onClick={() => abrirFormulario("adicionar")} className="btn-ghost h-11 px-4 text-sm">
            + Adicionar chave Pix
          </button>
        ) : null}
      </div>

      {chaves.length > 0 ? (
        <div role="radiogroup" aria-label="Escolher a chave Pix" className="flex flex-wrap gap-2">
          {chaves.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selecionada?.id === c.id}
              onClick={() => {
                setSelecionadaId(c.id);
                setModo("ver");
                setConfirmarExclusao(false);
                setErro(null);
              }}
              className={`chip ${selecionada?.id === c.id ? "chip-on" : "chip-off"}`}
            >
              {c.apelido}
              {c.padrao ? <span className="ml-1.5 rounded-full bg-accent px-1.5 text-rotulo font-bold text-[#3a2f00]">padrão</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {modo === "ver" && selecionada ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{selecionada.apelido}</p>
            <p className="truncate text-xs text-muted">{mascararChavePix(selecionada.chave)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!selecionada.padrao ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => executar(() => definirChavePadraoAction(selecionada.id))}
                className="btn-ghost h-11 px-3 text-sm"
              >
                Tornar padrão
              </button>
            ) : null}
            <button type="button" disabled={pending} onClick={() => abrirFormulario("editar")} className="btn-ghost h-11 px-3 text-sm">
              Editar
            </button>
            {confirmarExclusao ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    executar(
                      () => excluirChavePixAction(selecionada.id),
                      () => {
                        setConfirmarExclusao(false);
                        setSelecionadaId(null);
                      },
                    )
                  }
                  className="btn-danger h-11 px-3 text-sm"
                >
                  {pending ? "Excluindo…" : "Confirmar exclusão"}
                </button>
                <button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-ghost h-11 px-3 text-sm">
                  Voltar
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmarExclusao(true)}
                className="btn-ghost h-11 border-danger px-3 text-sm text-danger"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      ) : null}

      {modo !== "ver" ? (
        <form
          className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            executar(
              () =>
                modo === "editar" && selecionada
                  ? editarChavePixAction({ id: selecionada.id, apelido, chave })
                  : adicionarChavePixAction({ apelido, chave }),
              () => setModo("ver"),
            );
          }}
        >
          <p className="text-sm font-semibold">{modo === "editar" ? "Editar chave Pix" : "Nova chave Pix"}</p>
          <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div>
              <label className="label" htmlFor="chave-apelido">
                Nome da chave
              </label>
              <input
                id="chave-apelido"
                className="input"
                maxLength={40}
                placeholder="Ex.: Nubank"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="chave-valor">
                Chave Pix
              </label>
              <input
                id="chave-valor"
                className="input"
                maxLength={77}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn-brand h-11 px-4 text-sm">
              {pending ? "Salvando…" : "Salvar chave"}
            </button>
            {chaves.length > 0 ? (
              <button type="button" onClick={() => setModo("ver")} className="btn-ghost h-11 px-4 text-sm">
                Cancelar
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted">Só você vê suas chaves. Até 5 chaves.</p>
        </form>
      ) : null}

      {erro ? <FormError>{erro}</FormError> : null}

      {modo === "ver" && selecionada ? <GeradorQrPix key={selecionada.id} chavePix={selecionada.chave} nome={nome} cidade={cidade} /> : null}
    </section>
  );
}
