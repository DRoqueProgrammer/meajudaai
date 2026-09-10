import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ESTADOS_BR, normalizarBusca } from "../lib/ibge";

// O catálogo de municípios do IBGE: ~5.570 linhas buscadas uma vez e guardadas
// em cache no navegador. Estava em 0%. O que importa provar aqui não é o fetch
// em si — é o comportamento do cache, porque é ele que decide se o cadastro
// abre instantâneo ou espera a rede a cada navegação, e é onde mora a
// possibilidade de servir dado velho.
//
// `carregarCidadesIbge` memoiza num singleton de módulo, então cada caso
// reimporta o módulo com `vi.resetModules()` — sem isso o primeiro teste
// envenenaria todos os outros.

const RESPOSTA_IBGE = [
  { id: 3303302, nome: "Niterói", microrregiao: { mesorregiao: { UF: { sigla: "RJ" } } } },
  { id: 3550308, nome: "São Paulo", microrregiao: { mesorregiao: { UF: { sigla: "SP" } } } },
  { id: 9999999, nome: "Cidade Sem UF" }, // estrutura incompleta: acontece na API real
];

type Store = Record<string, string>;

function montarNavegador(store: Store = {}, opcoes: { escritaFalha?: boolean } = {}) {
  const localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      if (opcoes.escritaFalha) throw new Error("QuotaExceededError");
      store[k] = v;
    },
    removeItem: (k: string) => delete store[k],
  };
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  return store;
}

async function importarModulo() {
  vi.resetModules();
  return import("../lib/ibge");
}

function respostaOk(corpo: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => corpo });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("normalizarBusca", () => {
  it("tira acento, espaço em volta e caixa — é o que faz 'niteroi' achar 'Niterói'", () => {
    expect(normalizarBusca("  Niterói ")).toBe("niteroi");
    expect(normalizarBusca("SÃO GONÇALO")).toBe("sao goncalo");
  });

  it("deixa passar o que já está normalizado", () => {
    expect(normalizarBusca("campinas")).toBe("campinas");
    expect(normalizarBusca("")).toBe("");
  });
});

describe("ESTADOS_BR", () => {
  it("tem as 27 unidades federativas", () => {
    expect(ESTADOS_BR).toHaveLength(27);
  });

  it("não repete UF e usa sempre 2 letras maiúsculas", () => {
    const ufs = ESTADOS_BR.map((e) => e.uf);
    expect(new Set(ufs).size).toBe(27);
    expect(ufs.every((uf) => /^[A-Z]{2}$/.test(uf))).toBe(true);
  });

  it("nomeia todas — um select com UF sem nome é inútil", () => {
    expect(ESTADOS_BR.every((e) => e.nome.trim().length > 0)).toBe(true);
  });
});

describe("carregarCidadesIbge", () => {
  it("devolve lista vazia no servidor, sem tentar a rede", async () => {
    // Sem `window` o módulo nem tenta: chamar fetch no servidor derrubaria a
    // renderização por um catálogo que só o cliente usa.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { carregarCidadesIbge } = await importarModulo();
    expect(await carregarCidadesIbge()).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("busca na API quando não há cache e extrai a UF da estrutura aninhada", async () => {
    montarNavegador();
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();

    const cidades = await carregarCidadesIbge();
    expect(cidades).toHaveLength(3);
    expect(cidades[0]).toEqual({ id: 3303302, nome: "Niterói", uf: "RJ" });
  });

  it("aceita município sem UF na resposta em vez de quebrar a carga inteira", async () => {
    montarNavegador();
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();

    const semUf = (await carregarCidadesIbge()).find((c) => c.id === 9999999);
    expect(semUf?.uf).toBe("");
  });

  it("guarda o resultado em cache para a próxima navegação", async () => {
    const store = montarNavegador();
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();
    await carregarCidadesIbge();

    const gravado = Object.values(store)[0];
    expect(gravado).toBeTruthy();
    expect(JSON.parse(gravado!).cidades).toHaveLength(3);
  });

  it("usa o cache válido e não toca na rede", async () => {
    const store: Store = {
      "maa:ibge:cidades:v1": JSON.stringify({
        buscadoEm: Date.now(),
        cidades: [{ id: 1, nome: "Cacheada", uf: "RJ" }],
      }),
    };
    montarNavegador(store);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { carregarCidadesIbge } = await importarModulo();

    expect((await carregarCidadesIbge())[0]!.nome).toBe("Cacheada");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("descarta cache vencido — 30 dias é o teto", async () => {
    const trinta_e_um_dias = 31 * 24 * 60 * 60 * 1000;
    const store: Store = {
      "maa:ibge:cidades:v1": JSON.stringify({
        buscadoEm: Date.now() - trinta_e_um_dias,
        cidades: [{ id: 1, nome: "Velha", uf: "RJ" }],
      }),
    };
    montarNavegador(store);
    const fetchSpy = respostaOk(RESPOSTA_IBGE);
    vi.stubGlobal("fetch", fetchSpy);
    const { carregarCidadesIbge } = await importarModulo();

    expect((await carregarCidadesIbge())[0]!.nome).toBe("Niterói");
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("ignora cache corrompido em vez de quebrar o cadastro", async () => {
    montarNavegador({ "maa:ibge:cidades:v1": "{ isso não é json" });
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();
    expect(await carregarCidadesIbge()).toHaveLength(3);
  });

  it("ignora cache vazio", async () => {
    montarNavegador({ "maa:ibge:cidades:v1": JSON.stringify({ buscadoEm: Date.now(), cidades: [] }) });
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();
    expect(await carregarCidadesIbge()).toHaveLength(3);
  });

  it("propaga falha da API com o status, em vez de devolver lista vazia silenciosa", async () => {
    // Lista vazia silenciosa seria pior: o usuário veria um campo de cidade que
    // simplesmente não acha nada, sem saber por quê.
    montarNavegador();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => [] }));
    const { carregarCidadesIbge } = await importarModulo();
    await expect(carregarCidadesIbge()).rejects.toThrow(/503/);
  });

  it("carrega uma vez só, mesmo com chamadas simultâneas", async () => {
    montarNavegador();
    const fetchSpy = respostaOk(RESPOSTA_IBGE);
    vi.stubGlobal("fetch", fetchSpy);
    const { carregarCidadesIbge } = await importarModulo();

    await Promise.all([carregarCidadesIbge(), carregarCidadesIbge(), carregarCidadesIbge()]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("segue funcionando quando o cache não pode ser escrito", async () => {
    // localStorage cheio ou bloqueado: só não cacheia, a carga não pode falhar.
    montarNavegador({}, { escritaFalha: true });
    vi.stubGlobal("fetch", respostaOk(RESPOSTA_IBGE));
    const { carregarCidadesIbge } = await importarModulo();
    expect(await carregarCidadesIbge()).toHaveLength(3);
  });
});
