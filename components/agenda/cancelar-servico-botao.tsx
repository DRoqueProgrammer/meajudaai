"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarServicoAction } from "@/lib/actions/agenda-v2";

/** Tempo máximo esperando a resposta da action antes de recarregar a tela (D-031). */
const ESPERA_MAXIMA_MS = 10_000;

/**
 * Cancelar um serviço, com o motivo escrito ali mesmo (cliente e prestador).
 *
 * Antes era um `window.prompt` — feio no celular e sem espaço para escrever —
 * e o botão às vezes ficava preso em "Cancelando…" com o cancelamento já
 * salvo no banco (D-031: a resposta da server action era cancelada no
 * navegador). Agora: formulário inline com o motivo; ao confirmar, a tela
 * mostra "Serviço cancelado." assim que a action responde, antes mesmo da
 * lista atualizar; e se a resposta nunca chegar, depois de 10 s a página
 * recarrega sozinha — o banco é a verdade, então recarregar mostra o estado
 * certo em vez de deixar a pessoa olhando para um botão travado.
 */
export function CancelarServicoBotao({ servicoId }: { servicoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [pending, start] = useTransition();
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  // Rede de segurança do D-031: resposta perdida no navegador não pode travar a tela.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => window.location.reload(), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [pending]);

  if (feito) {
    return (
      <p role="status" className="text-sm font-medium text-muted">
        Serviço cancelado.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-11 items-center self-start rounded-xl px-3 text-sm font-medium text-danger hover:bg-tint-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        Cancelar serviço
      </button>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const texto = motivo.trim();
        if (!texto) {
          setErro("Escreva o motivo do cancelamento.");
          return;
        }
        setErro(null);
        start(async () => {
          const r = await cancelarServicoAction({ servicoId, motivo: texto });
          if (r.ok) {
            setFeito(true);
            router.refresh();
          } else {
            setErro(r.erro ?? "Não foi possível cancelar. Tente de novo.");
          }
        });
      }}
    >
      <label htmlFor={`motivo-${servicoId}`} className="text-sm font-medium">
        Motivo do cancelamento
      </label>
      <textarea
        ref={campo}
        id={`motivo-${servicoId}`}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        maxLength={300}
        className="input min-h-[72px] resize-y"
        placeholder="Ex.: surgiu um imprevisto, preciso remarcar."
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `motivo-erro-${servicoId}` : undefined}
      />
      {erro ? (
        <p id={`motivo-erro-${servicoId}`} className="text-sm text-danger">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-danger h-11 px-4 text-sm">
          {pending ? "Cancelando…" : "Confirmar cancelamento"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className="btn-ghost h-11 px-4 text-sm"
        >
          Voltar
        </button>
      </div>
    </form>
  );
}
