import { requireUser, type CurrentUser } from "./roles";
import { isDemo, DEMO_READONLY_MESSAGE } from "./demo";

/** Lançada quando uma conta demo tenta uma operação de escrita. */
export class DemoReadOnlyError extends Error {
  constructor() {
    super(DEMO_READONLY_MESSAGE);
    this.name = "DemoReadOnlyError";
  }
}

/**
 * Usar em toda server action de ESCRITA: garante sessão e bloqueia contas demo.
 */
export async function requireWriter(): Promise<CurrentUser> {
  const user = await requireUser();
  if (isDemo(user)) throw new DemoReadOnlyError();
  return user;
}

/**
 * Versão para server actions: devolve o usuário ou a mensagem de erro pronta.
 * Erro que estoura numa server action chega ao cliente redigido ("algo deu
 * errado"), e todo componente daqui lê `r.erro` — então nunca estourar.
 */
export async function tryWriter(): Promise<{ user: CurrentUser } | { erro: string }> {
  try {
    return { user: await requireWriter() };
  } catch (e) {
    return {
      erro: e instanceof DemoReadOnlyError ? e.message : "Sessão expirada — entre novamente.",
    };
  }
}
