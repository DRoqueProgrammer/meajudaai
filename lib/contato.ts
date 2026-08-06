// Canal de suporte, num só lugar. Placeholder de protótipo — troque pelo e-mail
// real (ou um WhatsApp) antes do lançamento; é isto que o error.tsx, a folha de
// conta e o rodapé da landing apontam.
export const SUPORTE_EMAIL = "suporte@meajudaai.com.br";

export function mailtoSuporte(assunto?: string) {
  return assunto
    ? `mailto:${SUPORTE_EMAIL}?subject=${encodeURIComponent(assunto)}`
    : `mailto:${SUPORTE_EMAIL}`;
}
