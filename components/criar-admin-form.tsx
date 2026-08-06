"use client";

import { useActionState, useState } from "react";
import { criarAdminAction } from "@/lib/actions/admin-users";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

export function CriarAdminForm() {
  const [estado, formAction] = useActionState(criarAdminAction, null);
  const [open, setOpen] = useState(false);
  const v = estado?.valores ?? {};
  const ok = estado?.ok === true;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-brand self-start px-4 py-2 text-sm">
        ＋ Criar admin
      </button>
    );
  }

  return (
    <form action={formAction} className="card flex flex-col gap-2">
      {/* Os cinco campos tinham só placeholder — que some ao digitar e não é
          nome acessível. O leitor de tela anunciava "edit, blank" cinco vezes. */}
      <p className="text-sm font-medium">Novo admin</p>
      <div>
        <label className="label" htmlFor="admin-nome">
          Nome
        </label>
        <input
          id="admin-nome"
          name="admin-nome"
          className="input text-sm"
          defaultValue={v.nome ?? ""}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="admin-email">
          E-mail
        </label>
        <input
          id="admin-email"
          name="admin-email"
          className="input text-sm"
          type="email"
          defaultValue={v.email ?? ""}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="admin-senha">
          Senha (mín. 6)
        </label>
        <input
          id="admin-senha"
          name="admin-senha"
          className="input text-sm"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label" htmlFor="admin-cidade">
            Cidade
          </label>
          <input
            id="admin-cidade"
            name="admin-cidade"
            className="input text-sm"
          defaultValue={v.cidade ?? "Niterói"}
          />
        </div>
        <div className="w-20">
          <label className="label" htmlFor="admin-uf">
            UF
          </label>
          <input
            id="admin-uf"
            name="admin-uf"
            className="input text-sm"
            maxLength={2}
          defaultValue={v.estado ?? "RJ"}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <BotaoEnviar className="btn-action px-4 py-2 text-sm" enviando="Criando…">
          Criar
        </BotaoEnviar>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-3 py-2 text-sm">
          Cancelar
        </button>
        {ok ? <span className="text-xs text-action-dark">Admin criado <span aria-hidden="true">✓</span></span> : null}
        {estado?.erro ? <FormError className="text-xs">{estado.erro}</FormError> : null}
      </div>
    </form>
  );
}
