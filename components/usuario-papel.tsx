"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirPapelAction } from "@/lib/actions/admin-users";
import { FormError } from "@/components/ui";
import { papelLabel } from "@/lib/papel-label";
import type { AppRole } from "@/lib/auth/roles";

const PAPEIS: AppRole[] = ["cliente", "prestador_servico", "funcionario", "admin", "sysadmin"];

export function UsuarioPapel({
  userId,
  papel,
  genero,
  isSelf,
}: {
  userId: string;
  papel: string;
  genero?: string | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [val, setVal] = useState(papel);

  function change(novo: string) {
    setVal(novo);
    setErro(null);
    start(async () => {
      const r = await definirPapelAction(userId, novo);
      if (r.ok) router.refresh();
      else {
        setVal(papel);
        setErro(r.erro ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="sr-only" htmlFor={`papel-${userId}`}>
        Papel do usuário
      </label>
      <select
        id={`papel-${userId}`}
        name={`papel-${userId}`}
        value={val}
        onChange={(e) => change(e.target.value)}
        disabled={pending || isSelf}
        className="input text-sm"
      >
        {PAPEIS.map((p) => (
          <option key={p} value={p}>
            {papelLabel(p, genero)}
          </option>
        ))}
      </select>
      {isSelf ? <span className="text-rotulo text-muted">(você)</span> : null}
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
