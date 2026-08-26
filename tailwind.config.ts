import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Tokens semânticos apontam para CSS variables (ver app/globals.css): virar
      // o tema é trocar a variável, não a classe. Papéis separados por contraste —
      // `brand`/`ok`/`danger` são a TINTA sobre superfície (viram no escuro);
      // `*-fill` são o PREENCHIMENTO com texto branco (fixos nos dois temas).
      colors: {
        brand: {
          DEFAULT: "var(--brand-ink)", // text/border/outline da marca sobre superfície
          dark: "var(--brand-ink-strong)", // hover de texto/borda
          fill: "var(--brand-fill)", // fundo de botão/badge (texto branco por cima)
          fillhover: "var(--brand-fill-hover)",
        },
        // #FFC107 é o amarelo da identidade, só preenchimento decorativo (some no
        // contraste sobre branco). `strong` é a estrela que CARREGA a nota: amarelo
        // escuro no claro, brilhante no escuro (var --star).
        accent: { DEFAULT: "#FFC107", strong: "var(--star)" },
        // Preenchimentos verdes fixos (texto branco por cima passa nos dois temas).
        action: { DEFAULT: "#43A047", dark: "#2E7D32", deep: "#1B5E20" },
        // Verde como TINTA sobre superfície (texto/borda de sucesso) — vira no escuro.
        ok: "var(--ok-ink)",
        surface: "var(--surface)",
        // Fundo de card/input, em canais RGB para o `bg-card/90` dos headers.
        card: "rgb(var(--card-rgb) / <alpha-value>)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        // `line` é divisória decorativa; `line-strong` é o contorno de controle
        // interativo (mínimo do WCAG 1.4.11). Ambos viram no escuro.
        line: { DEFAULT: "var(--line)", strong: "var(--line-strong)" },
        // `danger` é a TINTA do erro (vira no escuro); `danger-fill` é o badge
        // vermelho com texto branco (fixo).
        danger: { DEFAULT: "var(--danger-ink)", fill: "var(--danger-fill)" },
        // Tints de status (fundo pastel). `warn-ink` é a tinta do amarelo, que não
        // reusa nenhum ink existente.
        tint: {
          info: "var(--tint-info)",
          ok: "var(--tint-ok)",
          warn: "var(--tint-warn)",
          "warn-ink": "var(--tint-warn-ink)",
          neutral: "var(--tint-neutral)",
          danger: "var(--tint-danger)",
        },
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
      // Sem sobrescrever `xl`: em 14px ele ficava a 2px do `rounded-2xl` (16px)
      // e o uso misto dos dois não comunicava nada. Com o padrão do Tailwind a
      // escala volta a ter degrau legível — 12px em controle, 16px em card.
    },
  },
  plugins: [],
};

export default config;
