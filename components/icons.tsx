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
