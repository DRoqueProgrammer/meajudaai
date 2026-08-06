"use client";

import { useActionState, useState } from "react";
import { avaliarAction } from "@/lib/actions/avaliacoes";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/**
 * As estrelas são `<input type="radio">` de verdade, não `<button role="radio">`.
 *
 * Com rádio nativo a nota entra no POST sozinha, a navegação por setas do
 * teclado vem do navegador (o padrão ARIA estava pela metade: tinha
 * `aria-checked` mas não tinha roving tabindex nem handler de setas), e a
 * avaliação funciona sem JavaScript.
 *
 * O preenchimento das estrelas é CSS puro: cada estrela pinta se o rádio dela
 * ou algum posterior estiver marcado (`:has(~)` na direção inversa via
 * `flex-row-reverse`).
 */
export function AvaliarForm({
  vagaId,
  avaliadoId,
  nomeOutro,
}: {
  vagaId: string;
  avaliadoId: string;
  nomeOutro: string;
}) {
  const [estado, formAction] = useActionState(avaliarAction, null);
  // Começa em 0, não em 5. Nota pré-preenchida no máximo infla toda a média da
  // plataforma — e a reputação é a única moeda que o produto tem.
  const [nota, setNota] = useState(0);

  return (
    <form action={formAction} className="card flex flex-col items-center gap-4">
      <input type="hidden" name="vagaId" value={vagaId} />
      <input type="hidden" name="avaliadoId" value={avaliadoId} />

      <fieldset className="flex flex-col items-center gap-1">
        <legend className="mb-2 text-center text-sm text-muted">
          Como foi trabalhar com {nomeOutro}?
        </legend>
        {/* row-reverse + `~` deixa o CSS pintar da estrela marcada para trás,
            sem depender de JavaScript para o estado visual. */}
        <div className="flex flex-row-reverse justify-center gap-1 text-4xl">
          {[5, 4, 3, 2, 1].map((n) => (
            <label
              key={n}
              className="cursor-pointer text-line-strong transition-colors has-[:checked]:text-accent [&:has(~label_input:checked)]:text-accent"
            >
              <input
                type="radio"
                name="nota"
                value={n}
                checked={nota === n}
                onChange={() => setNota(n)}
                required
                className="sr-only"
                aria-label={n === 1 ? "1 estrela" : `${n} estrelas`}
              />
              <span className="grid min-h-11 min-w-11 place-items-center leading-none">★</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="-mt-2 text-xs text-muted">
        {nota === 0 ? "Toque nas estrelas para dar sua nota." : `Sua nota: ${nota} de 5.`}
      </p>

      <div className="w-full">
        <label className="label" htmlFor="comentario">
          Comentário (opcional)
        </label>
        <textarea
          id="comentario"
          name="comentario"
          className="input"
          rows={3}
          defaultValue={estado?.valores?.comentario ?? ""}
          placeholder="Ex.: chegou no horário, caprichoso no acabamento."
        />
      </div>

      {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
      <BotaoEnviar className="btn-action w-full" enviando="Enviando…">
        ENVIAR AVALIAÇÃO
      </BotaoEnviar>
    </form>
  );
}
