/** Link direto pro WhatsApp (wa.me) a partir de um telefone BR. Assume DDI 55 se não vier com ele. */
export function waLink(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}`;
}
