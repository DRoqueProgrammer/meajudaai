"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aceitarConviteAction } from "@/lib/actions/convite";

/** Botão para o usuário logado aceitar um convite de equipe (fica pendente de aprovação do dono). */
export function AceitarConvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aceitar() {
    setErro(null);
    start(async () => {
      const r = await aceitarConviteAction(token);
      if (r.ok) router.push("/inicio");
      else setErro(r.erro ?? "Não foi possível aceitar o convite.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={aceitar} disabled={pending} className="btn-brand">
        {pending ? "Enviando…" : "Aceitar convite"}
      </button>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
    </div>
  );
}
