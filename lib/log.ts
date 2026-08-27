import "server-only";

/**
 * Log estruturado (uma linha JSON) para as ações críticas de escrita.
 *
 * Não é observabilidade completa — é o mínimo que o parecer cobra: quando "a
 * vaga não publicou em produção", que exista um rastro em stdout com QUEM, O QUÊ
 * e o RESULTADO, em vez de abrir o Supabase e caçar. Uma linha por evento, em
 * JSON, para o coletor de logs (Vercel/Datadog) indexar sem regex.
 *
 * Regra: nunca PII aqui — só `userId` (uuid) e ids. Nada de nome, e-mail, telefone.
 */
export type LogResult = "ok" | "erro" | "negado" | "rate_limited";

export function logAction(
  action: string,
  fields: { userId?: string; result: LogResult } & Record<string, unknown>,
): void {
  const linha = JSON.stringify({ ts: new Date().toISOString(), action, ...fields });
  // Erro vai para stderr (separa alertas do fluxo normal nos coletores); o resto
  // para stdout. Em dev os dois aparecem no terminal do mesmo jeito.
  if (fields.result === "erro") console.error(linha);
  else console.log(linha);
}
