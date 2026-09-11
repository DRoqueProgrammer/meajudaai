// Conjunto de ícones SVG inline do app (capacete, categorias, navegação…).
// Inline em vez de biblioteca: um traço só, herdam `currentColor` e não somam
// peso de dependência. Cada export é um ícone; todos aceitam `className`.
import type { ReactElement } from "react";

type IconProps = { className?: string };

const S = "h-6 w-6";
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * Ícone oficial do WhatsApp (balão verde). Cor fixa de marca, não
 * `currentColor`: o verde é o que faz ele ser reconhecido de relance.
 * Vivia dentro de `telefone-whatsapp.tsx`; virou export quando o rodapé
 * passou a precisar do mesmo ícone.
 */
export function WhatsAppIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M12 5.5a6.4 6.4 0 0 0-5.47 9.73L5.5 18.5l3.38-.99A6.4 6.4 0 1 0 12 5.5Zm0 1.2a5.2 5.2 0 1 1-2.68 9.65l-.19-.11-2 .58.6-1.94-.13-.2A5.2 5.2 0 0 1 12 6.7Zm-2.4 2.6c-.13 0-.34.05-.52.25-.18.2-.68.66-.68 1.6s.7 1.86.8 1.99c.1.13 1.37 2.2 3.42 2.99 1.7.65 1.7.43 2 .4.3-.03.98-.4 1.12-.79.14-.38.14-.71.1-.78-.04-.07-.14-.11-.3-.19-.16-.08-.98-.48-1.13-.54-.15-.05-.26-.08-.37.08-.11.16-.42.53-.52.64-.1.11-.19.12-.35.04-.16-.08-.68-.25-1.3-.8-.48-.43-.8-.95-.9-1.11-.09-.16-.01-.25.07-.33.07-.07.16-.19.24-.28.08-.1.1-.16.16-.27.05-.11.03-.2-.01-.28-.04-.08-.37-.9-.51-1.23-.13-.32-.27-.28-.37-.28h-.32Z"
      />
    </svg>
  );
}

/** Ícone do LinkedIn (monocromático, herda `currentColor` como os demais). */
export function LinkedInIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.9 9.9h4.2V21H2.9V9.9Zm6.5 0h4.02v1.52h.06c.56-1.02 1.93-2.1 3.97-2.1 4.25 0 5.03 2.66 5.03 6.12V21h-4.19v-4.9c0-1.17-.02-2.68-1.7-2.68-1.7 0-1.96 1.28-1.96 2.6V21H9.4V9.9Z" />
    </svg>
  );
}

/**
 * Alvo/GPS — botão "Marcar minha localização atual" do mapa de endereço
 * (components/maps/address-map-picker.tsx). Miolo preenchido pra ficar
 * reconhecível mesmo pequeno, ao lado do rótulo do botão.
 */
export function AlvoIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </svg>
  );
}

export function HardHat({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden="true">
      <rect x="21.5" y="15" width="5" height="14" rx="2.5" />
      <path d="M13 30v-2a11 11 0 0 1 22 0v2z" />
      <path d="M7 31a2 2 0 0 1 2-2h30a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function Hammer({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M14 6l4 4" />
      <path d="M4 20l7-7" />
      <path d="M13 7l4-4 4 4-4 4z" />
      <path d="M9 11l4 4" />
    </svg>
  );
}

function Bolt({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13 2L4 13h6l-1 9 9-12h-6l1-8z" />
    </svg>
  );
}

function Bricks({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9.5h18M3 14.5h18M9 4v5.5M15 9.5v5M9 14.5V20" />
    </svg>
  );
}

function Roller({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect x="3" y="4" width="12" height="6" rx="1.5" />
      <path d="M15 7h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-6v3" />
      <rect x="10" y="15" width="4" height="6" rx="1" />
    </svg>
  );
}

function Wrench({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M15 3a5 5 0 0 0-4.5 7L3 17.5 6.5 21l7.5-7.5A5 5 0 1 0 15 3l-2.5 2.5L15 8l-2.5 2.5" />
    </svg>
  );
}

function Trowel({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M14 10l6-6-2-1-8 3-6 6 4 4 6-6z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

function Tiles({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function Wheelbarrow({ className = S }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {/* caçamba fechada, cabo atrás, roda na frente, perna de apoio */}
      <path d="M6.5 7.5 L18 8.5 L16 13.5 L8.5 13.5 Z" />
      <path d="M6.5 7.5 L3 6" />
      <circle cx="14.5" cy="17" r="2" />
      <path d="M9 13.5 v3" />
    </svg>
  );
}

const MAP: Record<string, (p: IconProps) => ReactElement> = {
  ajudante_eletricista: Bolt,
  ajudante_pedreiro: Bricks,
  ajudante_pintor: Roller,
  ajudante_encanador: Wrench,
  ajudante_gesseiro: Trowel,
  ajudante_azulejista: Tiles,
  ajudante_geral: Wheelbarrow,
};

export function CategoriaIcon({ slug, className = S }: { slug: string; className?: string }) {
  const Icon = MAP[slug] ?? Hammer;
  return <Icon className={className} />;
}
