"use client";

import { useActionState } from "react";
import { convidarMembroAction } from "@/lib/actions/workspace";
import { BotaoEnviar } from "@/components/botao-enviar";

export function ConvidarForm() {
  const [estado, formAction] = useActionState(convidarMembroAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label className="label" htmlFor="convidar-email">
        Convidar por e-mail
      </label>
      <div className="flex gap-2">
        <input
          id="convidar-email"
          name="convidar-email"
          autoComplete="email"
          className="input"
          type="email"
          defaultValue={estado?.erro ? (estado.valores?.["convidar-email"] ?? "") : ""}
          placeholder="email@exemplo.com"
          required
        />
        <BotaoEnviar className="btn-action px-4" enviando="…">
          Convidar
        </BotaoEnviar>
      </div>
      {estado ? (
        <p
          role={estado.ok ? "status" : "alert"}
          className={`text-sm ${estado.ok ? "text-action-dark" : "text-danger"}`}
        >
          {estado.ok ? "Membro adicionado à equipe." : estado.erro}
        </p>
      ) : null}
    </form>
  );
}
