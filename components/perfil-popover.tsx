"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, StarRating, Verificado } from "@/components/ui";
import { papelLabel } from "@/lib/papel-label";
import type { AppRole } from "@/lib/auth/roles";

export interface PerfilResumo {
  userId: string;
  nome: string;
  fotoUrl: string | null;
  genero?: string | null;
  papel: AppRole;
  notaMedia: number;
  totalAvaliacoes: number;
  verificado?: boolean;
}

/** Nome clicável que abre um card efêmero com o resumo do perfil — fecha ao clicar fora. */
export function PerfilPopover({ perfil, className }: { perfil: PerfilResumo; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={className ?? "text-sm font-semibold hover:text-brand hover:underline"}
      >
        {perfil.nome}
      </button>
      {aberto ? (
        <div className="absolute left-0 top-full z-[1001] mt-2 w-64 rounded-2xl border border-line bg-card p-4 shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-3">
            <Avatar nome={perfil.nome} fotoUrl={perfil.fotoUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{perfil.nome}</p>
              <p className="text-xs text-muted">{papelLabel(perfil.papel, perfil.genero)}</p>
            </div>
          </div>
          <div className="mt-2">
            <StarRating nota={perfil.notaMedia} total={perfil.totalAvaliacoes} />
          </div>
          {perfil.verificado ? (
            <div className="mt-2">
              <Verificado />
            </div>
          ) : null}
          <Link
            href={`/perfil/${perfil.userId}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost mt-3 block w-full text-center text-xs"
          >
            Ver perfil completo →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
