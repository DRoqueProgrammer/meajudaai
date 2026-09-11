import { podeAgirSobre, type MarcaDeExemplo } from "@/lib/auth/exemplo";

/**
 * Regras dos anúncios do Prestador de Serviço (migration 0044, decisão do
 * Leonardo em 10/09/2026): puras, sem acesso a banco — espelham em código o
 * que `public.limite_de_anuncios` e o gatilho `anuncios_validar` já impõem no
 * Postgres, para a UI do Administrador recusar ANTES de escrever, com a
 * mesma mensagem de "por que não", em vez de só deixar o banco rejeitar.
 * `lib/actions/anuncios-admin.ts` é o único lugar que chama estas funções.
 */

/** Padrão da plataforma quando nem a praça nem o prestador têm ajuste (espelha `limite_de_anuncios`, migration 0044). */
export const LIMITE_PADRAO_PLATAFORMA = 3;

/** Teto absoluto de um limite (padrão de praça ou ajuste por prestador) — mesmo `check` da migration 0044. */
export const LIMITE_MAXIMO = 50;

/**
 * Type guard: `n` é um limite de anúncios válido — inteiro de 0 a
 * `LIMITE_MAXIMO`. `null`/vazio (volta ao padrão) é tratado por quem chama,
 * não aqui: esta função só valida um NÚMERO concreto.
 */
export function limiteValido(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= LIMITE_MAXIMO;
}

/** Praça, no recorte que `adminAlcancaPrestador` precisa: cidade/UF e se é do mundo de exemplo (`pracasDoMundoDeExemplo`). */
export interface PracaParaAlcance {
  id: string;
  cidade: string | null;
  estado: string | null;
  exemplo: boolean;
}

/** Prestador (ou qualquer alvo), no recorte que `adminAlcancaPrestador` precisa. */
export interface AlvoParaAlcance {
  tipo_base: string;
  cidade: string | null;
  estado: string | null;
  exemplo: boolean;
}

/**
 * `true` se o Administrador `ator` alcança o prestador `alvo` — espelho
 * exato de `public.limite_de_anuncios` (migration 0044): o alvo precisa ser
 * `prestador_servico`, o mundo de exemplo precisa bater (`podeAgirSobre`,
 * R-42/ADR 0012) e alguma das praças do ator precisa ter a MESMA cidade e UF
 * (não nulas) do alvo E ser do MESMO mundo dele (`praca.exemplo ===
 * alvo.exemplo`) — uma praça real nunca alcança um prestador de exemplo, e
 * vice-versa, mesmo que `podeAgirSobre` sozinho deixasse passar (ator real
 * sobre alvo de exemplo). Usada por `lib/actions/anuncios-admin.ts` antes de
 * qualquer escrita em `anuncio_limites` ou moderação de anúncio.
 */
export function adminAlcancaPrestador(
  ator: MarcaDeExemplo,
  pracas: readonly PracaParaAlcance[],
  alvo: AlvoParaAlcance,
): boolean {
  if (alvo.tipo_base !== "prestador_servico") return false;
  if (!podeAgirSobre(ator, alvo)) return false;
  if (alvo.cidade == null || alvo.estado == null) return false;
  return pracas.some(
    (p) => p.cidade === alvo.cidade && p.estado === alvo.estado && p.exemplo === alvo.exemplo,
  );
}

/**
 * Espelha o `coalesce` de `public.limite_de_anuncios` (migration 0044): o
 * ajuste do prestador (`anuncio_limites.limite`) vence o padrão da praça
 * (`workspaces.limite_anuncios_padrao`), que vence `LIMITE_PADRAO_PLATAFORMA`.
 * Usada pelo "Painel da praça" (`/inicio`) para mostrar o limite que cada
 * prestador tem de fato, sem repetir essa conta em cada tela.
 */
export function limiteEfetivo(ajustePrestador: number | null, padraoPraca: number | null): number {
  return ajustePrestador ?? padraoPraca ?? LIMITE_PADRAO_PLATAFORMA;
}
