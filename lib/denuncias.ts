/**
 * Motivos de denúncia. Os slugs são o check constraint da tabela `denuncias`
 * (migration 0007) e não podem mudar; os rótulos são escritos na língua de quem
 * denuncia — "não pagou o combinado", não "fraude".
 * `curto` é o que a moderação vê na lista; `label` é o que o denunciante lê.
 */
export const MOTIVOS_DENUNCIA = [
  { slug: "nao_compareceu", curto: "Não compareceu", label: "Combinou a diária e não apareceu" },
  { slug: "fraude", curto: "Fraude", label: "Não pagou o combinado" },
  { slug: "abuso", curto: "Abuso", label: "Desrespeito, ameaça ou assédio" },
  { slug: "conteudo_improprio", curto: "Conteúdo impróprio", label: "Conteúdo impróprio na vaga ou no chat" },
  { slug: "spam", curto: "Spam", label: "Vaga falsa ou propaganda" },
  { slug: "outro", curto: "Outro", label: "Outro motivo" },
] as const;

export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number]["slug"];

export const ALVOS_DENUNCIA = ["usuario", "vaga", "avaliacao", "mensagem"] as const;
export type AlvoDenuncia = (typeof ALVOS_DENUNCIA)[number];

export const ALVO_LABEL: Record<AlvoDenuncia, string> = {
  usuario: "Usuário",
  vaga: "Vaga",
  avaliacao: "Avaliação",
  mensagem: "Mensagem",
};

/** Rótulo curto do motivo (o que a moderação vê na lista); devolve o slug se desconhecido. */
export function motivoCurto(slug: string): string {
  return MOTIVOS_DENUNCIA.find((m) => m.slug === slug)?.curto ?? slug;
}
