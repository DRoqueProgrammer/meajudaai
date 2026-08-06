"use client";

import { useRef, useState, useTransition } from "react";
import { criarDenunciaAction } from "@/lib/actions/denuncias";
import { MOTIVOS_DENUNCIA, type AlvoDenuncia } from "@/lib/denuncias";
import { FormError } from "@/components/ui";

/**
 * Denunciar um usuário, uma vaga ou uma mensagem.
 *
 * `<dialog>` nativo em vez de um modal próprio: foco preso, resto da página
 * inerte e backdrop vêm de graça do navegador. Fechar no Esc também é do UA,
 * mas não consegui exercitá-lo por automação — a tecla chega à página e o
 * dialog não emite `cancel`/`close`. Vale conferir à mão num device real.
 * Clique no fundo NÃO fecha por padrão, daí o handler abaixo.
 *
 * O anonimato é dito em voz alta, não subentendido. Quem vai denunciar "não
 * pagou a diária" assume que o denunciado vai descobrir — e desiste. Se a
 * garantia não está escrita na tela, ela não existe para o usuário.
 */
export function Denunciar({
  alvoTipo,
  alvoId,
  alvoNome,
  className = "",
}: {
  alvoTipo: AlvoDenuncia;
  alvoId: string;
  alvoNome?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [pending, start] = useTransition();

  function abrir() {
    setErro(null);
    ref.current?.showModal();
  }

  function fechar() {
    ref.current?.close();
    // Só limpa quando não foi enviada: reabrir depois de enviar mostra o recibo.
    if (!enviada) {
      setMotivo("");
      setDetalhe("");
      setErro(null);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await criarDenunciaAction({ alvo_tipo: alvoTipo, alvo_id: alvoId, motivo, detalhe });
      if (r.ok) setEnviada(true);
      else setErro(r.erro ?? "Não foi possível enviar a denúncia.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`min-h-11 text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
      >
        Denunciar
      </button>

      <dialog
        ref={ref}
        onClose={fechar}
        onClick={(e) => {
          // O alvo do clique é o próprio <dialog> só quando cai no backdrop:
          // o conteúdo vive dentro de um filho, que captura o resto.
          if (e.target === ref.current) fechar();
        }}
        aria-labelledby="denunciar-titulo"
        className="w-[min(92vw,26rem)] rounded-2xl border border-line bg-white p-0 text-ink backdrop:bg-black/40"
      >
        {enviada ? (
          <div className="flex flex-col gap-3 p-5">
            <h2 id="denunciar-titulo" className="text-base font-semibold">
              Denúncia enviada
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              A moderação vai analisar. Você não precisa fazer mais nada — e{" "}
              <strong className="font-medium text-ink">
                {alvoNome ?? "a pessoa denunciada"} não fica sabendo que foi você
              </strong>
              .
            </p>
            <button type="button" onClick={fechar} className="btn-brand w-full">
              Fechar
            </button>
          </div>
        ) : (
          <form method="post" onSubmit={enviar} className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 id="denunciar-titulo" className="text-base font-semibold">
                Denunciar {alvoNome ? <span className="text-brand">{alvoNome}</span> : "conteúdo"}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Sua denúncia é <strong className="font-medium text-ink">anônima</strong>. Quem você
                denunciar nunca vê seu nome — só a moderação da plataforma.
              </p>
            </div>

            <fieldset className="flex flex-col gap-1">
              <legend className="label">O que aconteceu?</legend>
              {MOTIVOS_DENUNCIA.map((m) => (
                <label
                  key={m.slug}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-surface has-[:checked]:bg-surface"
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.slug}
                    checked={motivo === m.slug}
                    onChange={() => setMotivo(m.slug)}
                    className="h-5 w-5 shrink-0 accent-[#0D47A1]"
                    required
                  />
                  {m.label}
                </label>
              ))}
            </fieldset>

            <div>
              <label className="label" htmlFor="denuncia-detalhe">
                Quer contar o que houve? (opcional)
              </label>
              <textarea
                id="denuncia-detalhe"
                name="detalhe"
                className="input"
                rows={3}
                maxLength={1000}
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                placeholder="Ex.: combinamos R$ 150 pela diária de terça e não recebi."
              />
            </div>

            {erro ? <FormError>{erro}</FormError> : null}

            <div className="flex gap-3">
              <button type="button" onClick={fechar} disabled={pending} className="btn-ghost flex-1">
                Voltar
              </button>
              <button type="submit" disabled={pending || !motivo} className="btn-brand flex-1">
                {pending ? "Enviando…" : "Enviar denúncia"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
