import type { AppRole } from "@/lib/auth/roles";

type Genero = string | null | undefined;

interface Formas {
  masculino: string;
  feminino: string;
  neutro: string;
}

/** Mesma regra de `boasVindas` (ROADMAP.md §12): masculino/feminino/neutro (-e). */
const FORMAS: Record<AppRole, Formas> = {
  sysadmin: { masculino: "SysAdmin", feminino: "SysAdmin", neutro: "SysAdmin" },
  admin: { masculino: "Administrador", feminino: "Administradora", neutro: "Administradore" },
  funcionario: { masculino: "Funcionário", feminino: "Funcionária", neutro: "Funcionárie" },
  prestador_servico: {
    masculino: "Prestador de Serviço",
    feminino: "Prestadora de Serviço",
    neutro: "Prestadore de Serviço",
  },
  cliente: { masculino: "Cliente", feminino: "Cliente", neutro: "Cliente" },
};

/** Rótulo do papel respeitando o gênero cadastrado da própria pessoa. */
export function papelLabel(role: AppRole, genero?: Genero): string {
  const formas = FORMAS[role] ?? FORMAS.cliente;
  if (genero === "masculino") return formas.masculino;
  if (genero === "feminino") return formas.feminino;
  return formas.neutro;
}

/** Rótulo neutro — só para os poucos lugares que ainda não carregam o gênero da pessoa listada. */
export const PAPEL_LABEL: Record<AppRole, string> = {
  sysadmin: FORMAS.sysadmin.neutro,
  admin: FORMAS.admin.neutro,
  funcionario: FORMAS.funcionario.neutro,
  prestador_servico: FORMAS.prestador_servico.neutro,
  cliente: FORMAS.cliente.neutro,
};
