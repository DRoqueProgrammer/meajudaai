// Municípios do IBGE — buscados uma vez na API pública e cacheados em
// localStorage pra ficar rápido nas próximas navegações. O endpoint não exige
// autenticação, é servido por um CDN do governo e é a fonte canônica (5.570
// municípios). Portado de refs/foco-contabil/lib/ibge.ts (mesma origem do
// caixa-forte-app) — ver ROADMAP.md §7.

export interface IbgeCity {
  id: number;
  nome: string;
  uf: string;
}

const CACHE_KEY = "maa:ibge:cidades:v1";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";

type Cache = { buscadoEm: number; cidades: IbgeCity[] };

let emMemoria: Promise<IbgeCity[]> | null = null;

/** Carrega os ~5.570 municípios do IBGE (client-side, com cache em localStorage). */
export async function carregarCidadesIbge(): Promise<IbgeCity[]> {
  if (typeof window === "undefined") return [];
  if (emMemoria) return emMemoria;

  emMemoria = (async () => {
    const cache = lerCache();
    if (cache) return cache;

    const res = await fetch(IBGE_URL, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Falha ao buscar municípios do IBGE (${res.status})`);
    const bruto: Array<{
      id: number;
      nome: string;
      microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
    }> = await res.json();

    const cidades: IbgeCity[] = bruto.map((r) => ({
      id: r.id,
      nome: r.nome,
      uf: r.microrregiao?.mesorregiao?.UF?.sigla ?? "",
    }));

    escreverCache({ buscadoEm: Date.now(), cidades });
    return cidades;
  })();

  return emMemoria;
}

function lerCache(): IbgeCity[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    if (!parsed?.cidades?.length) return null;
    if (Date.now() - parsed.buscadoEm > CACHE_TTL_MS) return null;
    return parsed.cidades;
  } catch {
    return null;
  }
}

function escreverCache(valor: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(valor));
  } catch {
    // localStorage cheio ou indisponível — só não cacheia, próxima carga busca de novo.
  }
}

export function normalizarBusca(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export const ESTADOS_BR: ReadonlyArray<{ uf: string; nome: string }> = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];
