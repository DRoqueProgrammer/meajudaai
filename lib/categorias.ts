export interface Categoria {
  slug: string;
  nome: string;
}

// Slugs ficam com o prefixo antigo `ajudante_*` de propósito: são o valor
// gravado em `profiles.categoria` desde a v1, e trocar o slug órfãa os
// prestadores já cadastrados com essa categoria. Só o `nome` (o que aparece
// na tela) mudou de "Ajudante de X" pra a profissão real.
export const CATEGORIAS: Categoria[] = [
  { slug: "ajudante_eletricista", nome: "Eletricista" },
  { slug: "ajudante_pedreiro", nome: "Pedreiro" },
  { slug: "ajudante_pintor", nome: "Pintor" },
  { slug: "ajudante_encanador", nome: "Encanador" },
  { slug: "ajudante_gesseiro", nome: "Gesseiro" },
  { slug: "ajudante_azulejista", nome: "Azulejista" },
  { slug: "mestre_obras", nome: "Mestre de Obras" },
  { slug: "ajudante_geral", nome: "Serviços Gerais" },
];

/** Rótulo legível de uma categoria pelo slug; devolve o próprio slug se desconhecido. */
export function nomeCategoria(slug: string): string {
  return CATEGORIAS.find((c) => c.slug === slug)?.nome ?? slug;
}
