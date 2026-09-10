/**
 * Regra única de quem pode agir sobre quem, no recorte do mundo de exemplo
 * (R-42/R-43, ADR 0012, decisão D-015): as cinco contas de exemplo continuam
 * reais e editáveis, mas cada uma só enxerga e altera o próprio mundo de
 * exemplo. Uma conta real (que não é de exemplo) age sobre qualquer pessoa,
 * como sempre agiu.
 *
 * Este é o único lugar onde essa regra é decidida — nem a página, nem a
 * action, recalculam o critério; todas chamam `podeAgirSobre` (anti-padrão
 * registrado no ADR 0012: reconhecer "exemplo" pelo domínio do e-mail,
 * espalhado pelo código).
 */

/** Qualquer coisa com a marca `exemplo` — pessoa, ator ou alvo de uma ação administrativa. */
export interface MarcaDeExemplo {
  exemplo: boolean;
}

/**
 * `true` se `ator` pode agir sobre `alvo`: uma conta de exemplo só age sobre o
 * mundo de exemplo; uma conta real age sobre qualquer pessoa.
 */
export function podeAgirSobre(ator: MarcaDeExemplo, alvo: MarcaDeExemplo): boolean {
  return !ator.exemplo || alvo.exemplo;
}
