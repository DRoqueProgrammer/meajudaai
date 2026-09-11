"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusAnuncioAction } from "@/lib/actions/anuncios";
import { FormError } from "@/components/ui";

/**
 * Botões de status de um anúncio próprio, em "Meus anúncios" (`/anuncios`):
 * Pausar/Reativar (reversível, sem confirmação) e Encerrar (com
 * confirmação — depois de encerrado não tem volta pela tela, o prestador
 * teria que publicar de novo). Anúncio `encerrado` ou `moderado` não mostra
 * nenhum botão: o primeiro é estado final, o segundo só volta pela mão do
 * Administrador.
 */
export function AnuncioStatusBotoes({ anuncioId, status }: { anuncioId: string; status: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (status !== "ativo" && status !== "pausado") return null;

  function mudar(novo: "ativo" | "pausado" | "encerrado") {
    setErro(null);
    start(async () => {
      const r = await mudarStatusAnuncioAction(anuncioId, novo);
      if (r.ok) {
        setConfirmando(false);
        router.refresh();
      } else {
        setErro(r.erro ?? "Não foi possível concluir.");
      }
    });
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-danger bg-tint-danger p-3">
        <p className="text-sm">
          Encerrar este anúncio? Não dá para reabrir depois — você teria que publicar de novo.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={pending}
            className="btn-ghost px-4 text-xs"
          >
            Manter anúncio
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => mudar("encerrado")}
            className="btn-ghost border-danger px-4 text-xs text-danger"
          >
            {pending ? "Encerrando…" : "Encerrar anúncio"}
          </button>
        </div>
        {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {status === "ativo" ? (
          <button type="button" disabled={pending} onClick={() => mudar("pausado")} className="btn-ghost px-4 text-xs">
            {pending ? "Pausando…" : "Pausar"}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => mudar("ativo")} className="btn-ghost px-4 text-xs">
            {pending ? "Reativando…" : "Reativar"}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmando(true)}
          className="btn-ghost px-4 text-xs text-danger"
        >
          Encerrar
        </button>
      </div>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
