"use client";

import { useActionState, useState, useTransition } from "react";
import { convidarMembroAction } from "@/lib/actions/workspace";
import { criarConviteAction } from "@/lib/actions/convite";
import { BotaoEnviar } from "@/components/botao-enviar";

export function ConvidarForm() {
  const [estado, formAction] = useActionState(convidarMembroAction, null);
  const [role, setRole] = useState<"membro" | "owner">("membro");
  const [link, setLink] = useState<string | null>(null);
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function gerar() {
    setErroLink(null);
    setLink(null);
    start(async () => {
      const r = await criarConviteAction(role);
      if (r.ok && r.link) setLink(r.link);
      else setErroLink(r.erro ?? "Não foi possível gerar o convite.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="label">Convidar por link</p>
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "membro" | "owner")}
            className="input"
            aria-label="Papel do convidado"
          >
            <option value="membro">Funcionário</option>
            <option value="owner">Sócio</option>
          </select>
          <button type="button" onClick={gerar} disabled={pending} className="btn-action shrink-0 px-4">
            {pending ? "…" : "Gerar link"}
          </button>
        </div>
        {link ? (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-muted">{link}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`${location.origin}${link}`)}
              className="btn-ghost shrink-0 px-2 py-1"
            >
              Copiar
            </button>
          </div>
        ) : null}
        {erroLink ? <p className="text-sm text-danger">{erroLink}</p> : null}
        <p className="text-xs text-muted">Quem abrir o link se cadastra e aguarda a sua aprovação.</p>
      </div>

      <form action={formAction} className="flex flex-col gap-2">
        <label className="label" htmlFor="convidar-email">
          Ou adicionar por e-mail (quem já tem conta)
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
    </div>
  );
}
