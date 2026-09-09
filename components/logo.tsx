/**
 * Ícone escolhido (chave inglesa, navy + amarelo — ver ROADMAP.md §15): cores
 * fixas de propósito, não recolorável por tema — é o mesmo contraste alto
 * pensado para o favicon numa aba escura do navegador.
 */
function IconeChaveInglesa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#071B3D" />
      <g
        transform="translate(13.5,13.5) scale(1.546)"
        fill="none"
        stroke="#FFC107"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 3a5 5 0 0 0-4.5 7L3 17.5 6.5 21l7.5-7.5A5 5 0 1 0 15 3l-2.5 2.5L15 8l-2.5 2.5" />
      </g>
    </svg>
  );
}

/** Logomarca "MeAjuda Aí" (ícone + wordmark), com variação de tamanho e de fundo escuro. */
export function Logo({ onDark = false, size = "md" }: { onDark?: boolean; size?: "md" | "lg" }) {
  const badge = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-10 w-10 rounded-xl";
  const text = size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex shrink-0 items-center gap-3">
      {/* `shrink-0` no ícone: sem isso, num header apertado (zoom do navegador
          reduz a viewport em px CSS) o flexbox distribuía o aperto pro SVG —
          que não tem largura mínima de conteúdo — até ele sumir, e o texto
          "MeAjuda Aí" ficava sozinho ou cortado. */}
      <IconeChaveInglesa className={`${badge} shrink-0`} />
      <span className={`whitespace-nowrap font-bold ${text} ${onDark ? "text-white" : "text-brand"}`}>
        MeAjuda <span className="text-accent">Aí</span>
      </span>
    </div>
  );
}
