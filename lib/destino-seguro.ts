/**
 * Para onde mandar a pessoa depois do login (`?next=`), sem virar redirecionamento
 * aberto: só caminho INTERNO — começa com "/", não com "//" nem "/\" (que o
 * navegador leria como outro domínio), sem esquema, sem quebra de linha e curto.
 * Qualquer outra coisa cai no padrão. Usado por `entrarAction` e pelo middleware.
 */
export function destinoSeguro(next: string | null | undefined, padrao = "/inicio"): string {
  if (!next) return padrao;
  const v = next.trim();
  if (v.length === 0 || v.length > 300) return padrao;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return padrao;
  if (/[\r\n\t]/.test(v) || /^\/+[a-z][a-z0-9+.-]*:/i.test(v)) return padrao;
  // Voltar para as telas de entrada depois de entrar não faz sentido.
  if (/^\/(login|cadastro|recuperar-senha)(\/|\?|$)/.test(v)) return padrao;
  return v;
}
