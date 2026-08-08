"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprovarConviteAction, recusarConviteAction } from "@/lib/actions/convite";

export interface ConvitePendente {
  id: string;
  nome: string;
  papel: string;
}

export function ConvitesPendentes({ convites }: { convites: ConvitePendente[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!convites.length) return null;

  function agir(fn: (id: string) => Promise<{ ok: boolean }>, id: string) {
    start(async () => {
      await fn(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Convites aguardando aprovação
      </p>
      {convites.map((c) => (
        <div key={c.id} className="card flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.nome}</p>
            <p className="text-xs text-muted">Entrando como {c.papel}</p>
          </div>
          <button
            type="button"
            onClick={() => agir(aprovarConviteAction, c.id)}
            disabled={pending}
            className="btn-action px-3 py-1.5 text-xs"
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => agir(recusarConviteAction, c.id)}
            disabled={pending}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Recusar
          </button>
        </div>
      ))}
    </div>
  );
}
