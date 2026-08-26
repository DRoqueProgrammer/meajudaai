import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0D47A1", dark: "#0A3A85" },
        // DEFAULT é o amarelo da identidade (#FFC107) e só serve para preenchimento
        // decorativo — sobre branco dá 1,63:1 e reprova até em 1.4.11. `strong`
        // (#B8860B, ~3,4:1) é o amarelo escuro para quando a estrela precisa
        // CARREGAR informação sobre branco (nota no StarRating).
        accent: { DEFAULT: "#FFC107", strong: "#B8860B" },
        // DEFAULT é o verde da identidade (#43A047) e só vale para preenchimento
        // decorativo — sobre branco ele dá 3,3:1 e reprova em AA. Texto branco sobre
        // verde, ou verde sobre branco, usa `dark` (5,1:1); `deep` é o hover de `dark`.
        action: { DEFAULT: "#43A047", dark: "#2E7D32", deep: "#1B5E20" },
        surface: "#F5F7FA",
        ink: "#212121",
        muted: "#5B6472",
        // `line` é divisória decorativa (1,25:1). Contorno de controle interativo usa
        // `line-strong` (3,07:1), o mínimo do WCAG 1.4.11 para limite de componente.
        line: { DEFAULT: "#E2E6EC", strong: "#8A94A3" },
        // #E53935 dava 4,23:1 sobre branco e reprovava em AA — todo uso de `danger`
        // no app é texto de erro, então o token inteiro escureceu (5,6:1).
        danger: "#C62828",
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
