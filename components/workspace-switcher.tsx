"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveWorkspaceAction } from "@/lib/actions/workspace";
import { FormError } from "@/components/ui";

type Ws = { workspace_id: string; role: string; nome: string; padrao: boolean };

/**
 * Seletor da praça ativa do Administrador — só aparece com duas ou mais
 * (regra em lib/auth/praca-ativa.ts, mostrarSeletorDePraca). Desde a D-016 o
 * seletor não cria nem exclui praça: isso é só do SysAdmin, em /admin/pracas
 * (lib/actions/pracas.ts) — aqui é só a troca entre as praças já vinculadas.
 */
export function WorkspaceSwitcher({ workspaces, active }: { workspaces: Ws[]; active?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const idAtivo = active ?? workspaces[0]?.workspace_id;

  function trocar(id: string) {
    if (id === active) return;
    setErro(null);
    start(async () => {
      const r = await setActiveWorkspaceAction(id);
      if (r.ok) router.refresh();
      else setErro(r.erro ?? "Erro ao trocar de praça.");
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-line bg-card p-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="workspace-ativo"
          className="text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Praça
        </label>
        <select
          id="workspace-ativo"
          name="workspace-ativo"
          value={idAtivo ?? ""}
          onChange={(e) => trocar(e.target.value)}
          disabled={pending}
          className="input flex-1 text-sm"
        >
          {workspaces.map((w) => (
            <option key={w.workspace_id} value={w.workspace_id}>
              {w.nome}
            </option>
          ))}
        </select>
      </div>

      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
