/**
 * Regra única de quem pode nascer/virar Administrador (R-44, ADR 0013, D-016).
 *
 * Hoje o cadastro público aceitava `tipo_base: "admin"` e a troca de papel
 * levava prestador a Administrador — qualquer pessoa virava Administrador.
 * Na v2, Administrador nasce só por ação do SysAdmin (vínculo a uma praça).
 * `lib/actions/auth.ts` (cadastro e troca de papel) e `components/trocar-papel.tsx`
 * consultam as funções daqui em vez de decidir cada um por conta própria —
 * esconder a opção só na tela e deixar a action aceitar é o anti-padrão que
 * abriu esse risco.
 */

/** Papéis que o cadastro público oferece sem convite: Cliente e Prestador de Serviço. */
export const PAPEIS_DO_CADASTRO_PUBLICO: readonly string[] = ["cliente", "prestador_servico"];

/**
 * Papéis que só um convite de equipe pode trazer ao cadastro — owner→admin,
 * membro→funcionario (ver `lib/actions/auth.ts`, `cadastrarAction`).
 */
const PAPEIS_SO_POR_CONVITE: readonly string[] = ["admin", "funcionario"];

/**
 * O cadastro aceita `tipo` como papel inicial da conta?
 *
 * Sem convite, só Cliente e Prestador de Serviço passam. Com convite, vale o
 * papel que o convite trouxe (admin ou funcionario). Qualquer outro valor —
 * inclusive um papel desconhecido — é recusado.
 */
export function papelPermitidoNoCadastro(tipo: string, temConvite: boolean): boolean {
  if (PAPEIS_DO_CADASTRO_PUBLICO.includes(tipo)) return true;
  return temConvite && PAPEIS_SO_POR_CONVITE.includes(tipo);
}

/**
 * Uma troca de papel de `atual` para `novo` é permitida?
 *
 * A única regra: nunca leva a Administrador (D-016) — Administrador nasce só
 * por ação do SysAdmin. Trocar para o próprio papel atual também não conta
 * como troca.
 */
export function podeTrocarPara(atual: string, novo: string): boolean {
  if (novo === atual) return false;
  return novo !== "admin";
}
