import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser, type CurrentUser } from "@/lib/auth/roles";
import {
  ALL_MODULES,
  CAPABILITIES,
  FUNCIONARIO_DEFAULT,
  isAppModule,
  isCapability,
  type AppCapability,
  type AppModule,
} from "@/lib/modules";

/**
 * Conjunto de módulos que o usuário pode acessar.
 * sysadmin/admin → todos. funcionário → linhas explícitas em user_modules
 * (autoritativas) ou o default do papel. Demais → nenhum (painel é da empresa).
 */
export async function getAllowedModules(user: CurrentUser): Promise<Set<AppModule>> {
  if (user.role === "sysadmin" || user.role === "admin") return new Set(ALL_MODULES);
  if (user.role !== "funcionario") return new Set<AppModule>();

  const sb = await createServerClient();
  const { data } = await sb.from("user_modules").select("module, allowed").eq("user_id", user.id);
  if (!data || data.length === 0) return new Set(FUNCIONARIO_DEFAULT);
  return new Set(
    data.filter((r) => r.allowed && isAppModule(r.module)).map((r) => r.module as AppModule),
  );
}

/** Guard de server action: lança se o módulo não é permitido. */
export async function requireModule(module: AppModule): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = await getAllowedModules(user);
  if (!allowed.has(module)) throw new Error("Forbidden — módulo não permitido para o seu perfil");
  return user;
}

/** Guard de página: redireciona para /inicio se o módulo não é permitido. */
export async function guardModule(module: AppModule): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = await getAllowedModules(user);
  if (!allowed.has(module)) redirect("/inicio");
  return user;
}

/**
 * Capacidades liberadas ao usuário nesta empresa. sysadmin/admin (sócio) →
 * todas. funcionário → linhas `allowed = true` em user_modules; ausência = OFF.
 * Demais papéis → nenhuma.
 */
export async function getAllowedCapabilities(
  user: CurrentUser,
  workspaceId: string,
): Promise<Set<AppCapability>> {
  if (user.role === "sysadmin" || user.role === "admin") return new Set(CAPABILITIES);
  if (user.role !== "funcionario") return new Set<AppCapability>();

  const sb = await createServerClient();
  const { data } = await sb
    .from("user_modules")
    .select("module, allowed")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId);
  return new Set(
    (data ?? [])
      .filter((r) => r.allowed && isCapability(r.module))
      .map((r) => r.module as AppCapability),
  );
}

/** Guard de server action: lança se a capacidade não é liberada nesta empresa. */
export async function requireCapability(
  cap: AppCapability,
  workspaceId: string,
): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = await getAllowedCapabilities(user, workspaceId);
  if (!allowed.has(cap)) throw new Error("Forbidden — capacidade não liberada para o seu perfil");
  return user;
}
