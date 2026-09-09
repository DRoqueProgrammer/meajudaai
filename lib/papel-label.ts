import type { AppRole } from "@/lib/auth/roles";

/** Rótulo legível de cada papel — usado no perfil e como "flag" na navegação. */
export const PAPEL_LABEL: Record<AppRole, string> = {
  sysadmin: "SysAdmin",
  admin: "Administrador",
  funcionario: "Funcionário",
  prestador_servico: "Prestador de Serviço",
  cliente: "Cliente",
};
