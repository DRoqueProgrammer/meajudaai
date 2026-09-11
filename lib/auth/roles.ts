import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export type AppRole = "sysadmin" | "admin" | "funcionario" | "prestador_servico" | "cliente";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: AppRole;
  /** Pessoa do mundo de exemplo (R-42, ADR 0012, D-015) — ver `lib/auth/exemplo.ts`. */
  exemplo: boolean;
}

const ROLES: readonly AppRole[] = ["sysadmin", "admin", "funcionario", "prestador_servico", "cliente"];

/** Type guard de `AppRole` para blindar o valor lido do banco. */
function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/**
 * Papel do usuário — vem de `profiles.tipo_base`. O JWT também carrega
 * `app_metadata.app_role` (hook da migration 0001), mas ele serve às policies
 * do banco (`current_app_role()`); aqui o perfil é a fonte da verdade.
 *
 * Memoizada por requisição (`cache` do React — Fatia 4, vistoria de 10/09): o
 * layout, a página e os componentes de servidor de uma mesma tela chamavam
 * isto cada um, e cada chamada era uma ida ao Auth mais uma ao banco.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: prof } = await sb
    .from("profiles")
    .select("tipo_base, exemplo")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = isAppRole(prof?.tipo_base) ? prof.tipo_base : "cliente";
  // Sem perfil, a pessoa não é de exemplo — o mesmo piso em que `role` cai em "cliente".
  return { id: user.id, email: user.email ?? null, role, exemplo: prof?.exemplo === true };
});

/** Como `getCurrentUser`, mas lança se não houver sessão. Use em rotas/actions protegidas. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Forbidden — não autenticado");
  return u;
}
