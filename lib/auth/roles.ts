import { createServerClient } from "@/lib/supabase/server";

export type AppRole = "sysadmin" | "admin" | "funcionario" | "ajudante";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: AppRole;
}

const ROLES: readonly AppRole[] = ["sysadmin", "admin", "funcionario", "ajudante"];

/** Type guard de `AppRole` para blindar o valor lido do banco. */
function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/**
 * Papel do usuário — vem de `profiles.tipo_base`. O JWT também carrega
 * `app_metadata.app_role` (hook da migration 0001), mas ele serve às policies
 * do banco (`current_app_role()`); aqui o perfil é a fonte da verdade.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: prof } = await sb
    .from("profiles")
    .select("tipo_base")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = isAppRole(prof?.tipo_base) ? prof.tipo_base : "ajudante";
  return { id: user.id, email: user.email ?? null, role };
}

/** Como `getCurrentUser`, mas lança se não houver sessão. Use em rotas/actions protegidas. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Forbidden — não autenticado");
  return u;
}
