/**
 * Textos fixos dos recibos gerados pela Me Ajuda Aí (D-048, pedido do
 * Leonardo em 11/09/2026): recibo não é nota fiscal, e a plataforma é um
 * marketplace — não responde pelo serviço, pelo pagamento nem por obrigação
 * fiscal das partes. Ponto único para todos os recibos (do prestador ao
 * cliente, de comissão, avulsos) usarem a mesma redação.
 */

/** Vai em TODO recibo. */
export const AVISO_SEM_VALOR_FISCAL =
  "Este recibo não tem valor fiscal e não substitui nota fiscal: serve apenas como comprovante de referência entre as partes.";

/** Vai no recibo do prestador ao cliente. */
export const AVISO_MARKETPLACE =
  "A Me Ajuda Aí é um marketplace que aproxima clientes e prestadores de serviço e não se responsabiliza pelos serviços, pelos pagamentos nem pelas obrigações fiscais das partes. Nota fiscal, quando houver, é combinada diretamente com o prestador.";

/** Rótulo do perfil: se o prestador emite nota fiscal. */
export function rotuloNotaFiscal(emite: boolean): string {
  return emite ? "Emite nota fiscal: sim" : "Emite nota fiscal: não";
}
