/** Link direto pro WhatsApp (wa.me) a partir de um telefone BR. Assume DDI 55 se não vier com ele. */
export function waLink(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}`;
}

/** Link do WhatsApp pra compartilhar um texto (ex.: localização) sem destinatário fixo — abre o seletor de contato. */
export function waShareLink(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
