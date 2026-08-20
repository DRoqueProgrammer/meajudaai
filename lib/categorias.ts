export interface Categoria {
  slug: string;
  nome: string;
}

export const CATEGORIAS: Categoria[] = [
  { slug: "ajudante_eletricista", nome: "Ajudante de Eletricista" },
  { slug: "ajudante_pedreiro", nome: "Ajudante de Pedreiro" },
  { slug: "ajudante_pintor", nome: "Ajudante de Pintor" },
  { slug: "ajudante_encanador", nome: "Ajudante de Encanador" },
  { slug: "ajudante_gesseiro", nome: "Ajudante de Gesseiro" },
  { slug: "ajudante_azulejista", nome: "Ajudante de Azulejista" },
  { slug: "ajudante_geral", nome: "Ajudante Geral" },
];

/** Rótulo legível de uma categoria pelo slug; devolve o próprio slug se desconhecido. */
export function nomeCategoria(slug: string): string {
  return CATEGORIAS.find((c) => c.slug === slug)?.nome ?? slug;
}
