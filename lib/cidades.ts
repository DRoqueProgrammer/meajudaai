// Catálogo curto de cidades atendidas no protótipo (autocomplete de cadastro e
// de publicação de vaga). Cresce conforme a operação; sem tabela no banco por ora.
export interface Cidade {
  nome: string;
  uf: string;
}

export const CIDADES: Cidade[] = [
  { nome: "Niterói", uf: "RJ" },
  { nome: "Rio de Janeiro", uf: "RJ" },
  { nome: "São Gonçalo", uf: "RJ" },
  { nome: "Maricá", uf: "RJ" },
  { nome: "São Paulo", uf: "SP" },
  { nome: "Guarulhos", uf: "SP" },
  { nome: "Campinas", uf: "SP" },
  { nome: "Belo Horizonte", uf: "MG" },
  { nome: "Curitiba", uf: "PR" },
  { nome: "Porto Alegre", uf: "RS" },
  { nome: "Salvador", uf: "BA" },
  { nome: "Recife", uf: "PE" },
  { nome: "Fortaleza", uf: "CE" },
  { nome: "Brasília", uf: "DF" },
];
