"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CHAVE = "maa-cookies-aceitos";

/** Banner de consentimento de cookies (ROADMAP.md §13) — aparece até o visitante decidir; guarda a escolha em localStorage. */
export function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      // Sem localStorage (modo privado, etc.) — não bloqueia o uso, só não mostra o banner.
    }
  }, []);

  function decidir(valor: "aceito" | "recusado") {
    try {
      localStorage.setItem(CHAVE, valor);
    } catch {
      // segue sem salvar
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card px-4 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-muted">
          Usamos cookies essenciais para manter sua sessão e melhorar sua experiência. Veja nossa{" "}
          <Link href="/privacidade" className="text-brand underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => decidir("recusado")} className="btn-ghost px-3 py-1.5 text-xs">
            Recusar não essenciais
          </button>
          <button type="button" onClick={() => decidir("aceito")} className="btn-brand px-3 py-1.5 text-xs">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
