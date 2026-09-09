/** Saudação de boas-vindas respeitando o gênero cadastrado (ROADMAP.md §12). */
export function boasVindas(genero: string | null, nome: string): string {
  const prefixo = genero === "masculino" ? "Bem-vindo" : genero === "feminino" ? "Bem-vinda" : "Bem-vinde";
  return `${prefixo}, ${nome}!`;
}
