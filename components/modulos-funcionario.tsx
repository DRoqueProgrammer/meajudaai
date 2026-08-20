"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setModuloFuncionarioAction } from "@/lib/actions/modules";
import { CAPABILITIES, GRANTABLE_MODULES, capabilityLabel, moduleLabel } from "@/lib/modules";
import { FormError } from "@/components/ui";

/** Grade de toggles (admin) para liberar/revogar módulos de painel e capacidades de um funcionário na empresa. */
export function ModulosFuncionario({
  funcionarioId,
  workspaceId,
  allowed,
}: {
  funcionarioId: string;
  workspaceId: string;
  allowed: Record<string, boolean>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, boolean>>(allowed);

  function toggle(key: string) {
    const novo = !state[key];
    setState((s) => ({ ...s, [key]: novo }));
    setErro(null);
    start(async () => {
      const r = await setModuloFuncionarioAction(funcionarioId, workspaceId, key, novo);
      if (r.ok) router.refresh();
      else {
        setState((s) => ({ ...s, [key]: !novo }));
        setErro(r.erro ?? "Erro ao salvar.");
      }
    });
  }

  const grupos: { titulo: string; chaves: readonly string[]; rotulo: (k: string) => string }[] = [
    { titulo: "Módulos liberados", chaves: GRANTABLE_MODULES, rotulo: moduleLabel },
    { titulo: "Permissões", chaves: CAPABILITIES, rotulo: capabilityLabel },
  ];

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-line pt-2">
      {grupos.map((g) => (
        <div key={g.titulo} className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{g.titulo}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.chaves.map((k) => {
              const on = !!state[k];
              return (
                <button
                  key={k}
                  onClick={() => toggle(k)}
                  disabled={pending}
                  className={`chip font-medium ${on ? "chip-on" : "chip-off"}`}
                  aria-pressed={on}
                >
                  {g.rotulo(k)} {on ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
