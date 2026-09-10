"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CHAVE = "maa-cookies-aceitos";

/**
 * Aviso de cookies (ROADMAP.md §13) — INFORMATIVO, não um opt-out: o app só usa
 * armazenamento essencial (sessão, tema, e-mail lembrado no login, e a própria
 * lembrança deste aviso). Um botão "Recusar não essenciais" que não desliga
 * nada é enganoso (parecer de proteção de dados, vistoria 10/09/2026) — por
 * isso só existe "Entendi". Guarda em localStorage com a MESMA chave de antes,
 * para quem já tinha dispensado o banner anterior (aceito ou recusado) não
 * ver o aviso de novo.
 */
export function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      // Sem localStorage (modo privado, etc.) — não bloqueia o uso, só não mostra o banner.
    }
  }, []);

  function entendi() {
    try {
      localStorage.setItem(CHAVE, "entendi");
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
          Usamos só cookies essenciais — para manter sua sessão, lembrar seu tema e não mostrar
          este aviso de novo. Veja nossa{" "}
          <Link href="/privacidade" className="text-brand underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <button type="button" onClick={entendi} className="btn-brand shrink-0 px-3 py-1.5 text-xs">
          Entendi
        </button>
      </div>
    </div>
  );
}
