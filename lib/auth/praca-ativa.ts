/**
 * Regra pura de exibição e escolha da praça ativa do Administrador (R-48,
 * R-49; ADR 0013; decisão D-016). Sem I/O — decide a partir do que já foi
 * consultado (a lista de praças vinculadas pelo SysAdmin e o cookie do
 * seletor), para poder ser testada sem servidor nem banco.
 */

/** O mínimo que a regra de escolha precisa de cada praça: o id e se é a padrão dele. */
export interface PracaEscolhivel {
  workspace_id: string;
  padrao: boolean;
}

/** Só mostra o seletor com duas praças ou mais — com 0 ou 1 não há escolha a fazer (R-49). */
export function mostrarSeletorDePraca(quantidade: number): boolean {
  return quantidade >= 2;
}

/**
 * Escolhe a praça ativa entre as que o SysAdmin vinculou ao Administrador:
 * a do cookie, se for uma delas; senão a marcada como padrão; senão a
 * primeira da lista. Sem praça nenhuma, não há o que escolher (R-48).
 */
export function escolherPracaAtiva<T extends PracaEscolhivel>(
  lista: T[],
  cookie: string | undefined,
): T | null {
  if (lista.length === 0) return null;
  const doCookie = cookie ? lista.find((praca) => praca.workspace_id === cookie) : undefined;
  if (doCookie) return doCookie;
  const padrao = lista.find((praca) => praca.padrao);
  return padrao ?? lista[0]!;
}
