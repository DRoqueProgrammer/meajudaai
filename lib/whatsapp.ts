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

/**
 * Link do WhatsApp de uma vaga do mural público, já com a mensagem de
 * interesse pronta (`?text=`) — quem clica só confirma o envio, sem digitar
 * nada. Usado pelo card de "Necessita-se ajudante!" (`components/landing/mural-vagas.tsx`).
 */
export function waLinkVaga(telefone: string, tituloVaga: string): string {
  const texto = `Olá! Vi sua vaga "${tituloVaga}" no Me Ajuda Aí e tenho interesse.`;
  return `${waLink(telefone)}?text=${encodeURIComponent(texto)}`;
}
