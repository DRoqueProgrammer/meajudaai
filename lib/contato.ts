// Canal de suporte, num só lugar — é isto que o error.tsx, a folha de conta e
// o rodapé da landing apontam. Nesta fase de protótipo é o mesmo e-mail do
// encarregado de dados (D-024, cvg/docs/tech-spec/_decisoes-travadas.md):
// Leonardo Chalhoub, citado por nome na Política de Privacidade.
export const SUPORTE_EMAIL = "leochalhoub@hotmail.com";

/** Monta um `mailto:` para o suporte, com assunto opcional já codificado. */
export function mailtoSuporte(assunto?: string) {
  return assunto
    ? `mailto:${SUPORTE_EMAIL}?subject=${encodeURIComponent(assunto)}`
    : `mailto:${SUPORTE_EMAIL}`;
}
