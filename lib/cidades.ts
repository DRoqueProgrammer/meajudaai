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
