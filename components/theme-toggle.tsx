"use client";

import { useEffect, useState } from "react";

/**
 * Chave do localStorage onde a escolha de tema persiste entre visitas.
 * Precisa ser IGUAL à do script inline em app/layout.tsx (que reaplica o tema
 * antes da pintura). Se mudar aqui, mude lá.
 */
const CHAVE_TEMA = "maa-tema";

/**
 * Alternador de tema claro/escuro.
 *
 * O tema vale pelo atributo `data-theme` do <html> (as variáveis viram em
 * globals.css) e a escolha fica no localStorage. O padrão é claro: sem nada
 * salvo nenhum atributo é posto e o `:root` claro vale — inclusive para quem tem
 * o sistema no escuro. O script inline do layout raiz reaplica a escolha antes
 * da pintura (sem flash), então aqui só espelhamos o estado (para o rótulo) e
 * gravamos na troca. Os ícones trocam por CSS via [data-theme], não por este
 * estado, para acompanhar o tema sem piscar nem descasar na hidratação.
 */
export function ThemeToggle({
  className = "",
  mostrarRotulo = false,
}: {
  className?: string;
  /** Mostra o texto ao lado do ícone (para linhas de menu, como a folha de conta). */
  mostrarRotulo?: boolean;
}) {
  // Começa "claro" nos dois lados (servidor e 1ª pintura do cliente) e só
  // sincroniza depois de montar — quando o script inline já pôs o atributo.
  // Assim a hidratação bate e não há aviso de mismatch.
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.dataset.theme === "dark");
  }, []);

  function alternar() {
    const raiz = document.documentElement;
    const proximoEscuro = raiz.dataset.theme !== "dark";
    if (proximoEscuro) raiz.dataset.theme = "dark";
    else delete raiz.dataset.theme; // sem atributo = claro (o padrão)
    setEscuro(proximoEscuro);
    try {
      localStorage.setItem(CHAVE_TEMA, proximoEscuro ? "dark" : "light");
    } catch {
      // Armazenamento bloqueado (aba privada, cookies off): a troca vale só
      // para esta sessão, o que é o comportamento aceitável.
    }
  }

  const rotulo = escuro ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className={className}
    >
      {/* Lua: no tema claro, indica "ir para o escuro". */}
      <svg
        viewBox="0 0 24 24"
        className="tema-icone-lua h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      {/* Sol: no tema escuro, indica "ir para o claro". */}
      <svg
        viewBox="0 0 24 24"
        className="tema-icone-sol h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
      {mostrarRotulo ? <span>{rotulo}</span> : null}
    </button>
  );
}
