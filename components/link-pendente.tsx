"use client";

import { useEffect, useState } from "react";
import { useLinkStatus } from "next/link";

/**
 * Sinal de "tocou, tá indo" dentro de um `<Link>`.
 *
 * Cobre a janela que o esqueleto NÃO cobre: entre o toque e o servidor começar
 * a responder, a tela antiga continua parada. É aí que o usuário toca de novo e
 * dispara duas navegações — o comportamento relatado em 4G de obra.
 *
 * Diferente do `loading.tsx`, isto é estado de cliente: não depende da
 * revelação de Suspense, então funciona (e dá para verificar) em qualquer lugar.
 *
 * O atraso de 140ms é `setTimeout`, não animação com `forwards`: a versão em CSS
 * deixava a opacidade em 0 para sempre — indicador invisível, pior que nenhum.
 */
const ATRASO_MS = 140;

export function LinkPendente({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (!pending) {
      setMostrar(false);
      return;
    }
    const id = setTimeout(() => setMostrar(true), ATRASO_MS);
    return () => clearTimeout(id);
  }, [pending]);

  if (!pending || !mostrar) return null;
  return (
    <span role="status" aria-label="Abrindo…" data-pendente="true" className={`link-pendente ${className}`} />
  );
}
