/**
 * Módulos do painel da empresa (molde foco-contabil/careconnect).
 * Client-safe: sem imports de servidor — os guards ficam em lib/auth/modules.ts.
 */
export type AppModule = "vagas" | "equipe" | "financeiro" | "relatorios";

export const PANEL_MODULES: { key: AppModule; label: string; href: string; icon: string }[] = [
  { key: "vagas", label: "Minhas Vagas", href: "/minhas-vagas", icon: "clipboard" },
  { key: "equipe", label: "Equipe", href: "/equipe", icon: "users" },
  { key: "financeiro", label: "Financeiro", href: "/financeiro", icon: "coin" },
  { key: "relatorios", label: "Relatórios", href: "/relatorios", icon: "chart" },
];

export const ALL_MODULES: AppModule[] = PANEL_MODULES.map((m) => m.key);

/** Módulos que o funcionário recebe antes de o admin customizar. */
export const FUNCIONARIO_DEFAULT: AppModule[] = ["vagas"];

/** Módulos que o admin pode conceder/revogar de um funcionário. */
export const GRANTABLE_MODULES: AppModule[] = ["vagas", "equipe", "financeiro", "relatorios"];

export function isAppModule(v: string): v is AppModule {
  return (ALL_MODULES as string[]).includes(v);
}

export function moduleLabel(key: string): string {
  return PANEL_MODULES.find((m) => m.key === key)?.label ?? key;
}

/**
 * Capacidades de ação por funcionário — separadas dos módulos de painel e
 * guardadas na mesma tabela `user_modules`. Ausência de linha = OFF (menor
 * privilégio), diferente do default de papel dos módulos.
 */
export type AppCapability = "publicar_vagas" | "chat_ajudantes";

export const CAPABILITIES: AppCapability[] = ["publicar_vagas", "chat_ajudantes"];

const CAPABILITY_LABELS: Record<AppCapability, string> = {
  publicar_vagas: "Publicar vagas",
  chat_ajudantes: "Falar com ajudantes",
};

export function isCapability(v: string): v is AppCapability {
  return (CAPABILITIES as string[]).includes(v);
}

export function capabilityLabel(key: string): string {
  return CAPABILITY_LABELS[key as AppCapability] ?? key;
}
