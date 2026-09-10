import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser, type CurrentUser } from "@/lib/auth/roles";
import { getActiveWorkspace } from "@/lib/auth/workspace";
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
 * Módulos liberados para o funcionário NAQUELA empresa (R-45, ADR 0014):
 * `user_modules` grava a liberação por `workspace_id`, então uma liberação
 * feita numa empresa não pode valer em outra. Só conta linha de MÓDULO (uma
 * linha de CAPACIDADE presente na mesma empresa não é liberação de módulo —
 * ver `lib/modules.ts`); sem nenhuma linha de módulo ali, vale o padrão do
 * papel (`FUNCIONARIO_DEFAULT`), mesmo que haja capacidade liberada.
 */
export async function modulosDoFuncionario(
  db: SupabaseClient<Database>,
  userId: string,
  workspaceId: string,
): Promise<Set<AppModule>> {
  const { data } = await db
    .from("user_modules")
    .select("module, allowed")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);
  const linhasDeModulo = (data ?? []).filter((r) => isAppModule(r.module));
  if (linhasDeModulo.length === 0) return new Set(FUNCIONARIO_DEFAULT);
  return new Set(linhasDeModulo.filter((r) => r.allowed).map((r) => r.module as AppModule));
}

/**
 * Conjunto de módulos que o usuário pode acessar.
 * sysadmin/admin → todos. funcionário → o que `modulosDoFuncionario` decide
 * para a empresa ativa dele (getActiveWorkspace); sem empresa ativa, o
 * padrão do papel — nunca a liberação de outra empresa. Demais → nenhum
 * (painel é da empresa).
 */
export async function getAllowedModules(user: CurrentUser): Promise<Set<AppModule>> {
  if (user.role === "sysadmin" || user.role === "admin") return new Set(ALL_MODULES);
  if (user.role !== "funcionario") return new Set<AppModule>();

  const ws = await getActiveWorkspace().catch(() => null);
  if (!ws) return new Set(FUNCIONARIO_DEFAULT);

  const sb = await createServerClient();
  return modulosDoFuncionario(sb, user.id, ws.workspace_id);
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
