import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALL_MODULES, CAPABILITIES, FUNCIONARIO_DEFAULT } from "../lib/modules";
import type { CurrentUser } from "../lib/auth/roles";

// A matriz de autorização por módulo. O ROADMAP §4 marca isto como requisito de
// segurança não-negociável — "não deixe essa breach passar" — e estava em 0% de
// cobertura. É a única parte do produto onde uma linha errada não gera um bug
// visível: gera acesso indevido, silencioso, que só aparece quando alguém abusa.
//
// O acesso ao banco é dublado de propósito. O que se prova aqui é a REGRA
// (quem recebe o quê), não a consulta — a consulta é assunto do teste de
// integração de permissão.

const redirectSpy = vi.fn((destino: string) => {
  throw new Error(`REDIRECT:${destino}`);
});
let linhasUserModules: { module: string; allowed: boolean }[] | null = [];
let usuarioAtual: CurrentUser;

vi.mock("next/navigation", () => ({ redirect: (d: string) => redirectSpy(d) }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: linhasUserModules }),
          then: (r: (v: { data: unknown }) => unknown) => r({ data: linhasUserModules }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/auth/roles", () => ({ requireUser: async () => usuarioAtual }));

const { getAllowedModules, getAllowedCapabilities, requireModule, guardModule, requireCapability } =
  await import("../lib/auth/modules");

function comoPapel(role: CurrentUser["role"]): CurrentUser {
  return { id: "u-1", role } as CurrentUser;
}

beforeEach(() => {
  redirectSpy.mockClear();
  linhasUserModules = [];
  usuarioAtual = comoPapel("funcionario");
});

describe("getAllowedModules", () => {
  it("dá todos os módulos a sysadmin e a admin", async () => {
    for (const role of ["sysadmin", "admin"] as const) {
      const permitidos = await getAllowedModules(comoPapel(role));
      expect([...permitidos].sort()).toEqual([...ALL_MODULES].sort());
    }
  });

  it("não dá módulo nenhum a prestador e a cliente — o painel é da empresa", async () => {
    for (const role of ["prestador_servico", "cliente"] as const) {
      expect((await getAllowedModules(comoPapel(role))).size).toBe(0);
    }
  });

  it("dá ao funcionário exatamente as linhas liberadas no banco", async () => {
    linhasUserModules = [
      { module: "vagas", allowed: true },
      { module: "equipe", allowed: true },
    ];
    const permitidos = await getAllowedModules(comoPapel("funcionario"));
    expect([...permitidos].sort()).toEqual(["equipe", "vagas"]);
  });

  it("ignora linha marcada como não permitida", async () => {
    linhasUserModules = [
      { module: "vagas", allowed: true },
      { module: "financeiro", allowed: false },
    ];
    const permitidos = await getAllowedModules(comoPapel("funcionario"));
    expect(permitidos.has("financeiro" as never)).toBe(false);
    expect(permitidos.has("vagas" as never)).toBe(true);
  });

  it("descarta módulo desconhecido vindo do banco", async () => {
    // Uma linha órfã de um módulo removido não pode virar acesso a nada.
    linhasUserModules = [{ module: "modulo_que_nao_existe", allowed: true }];
    expect((await getAllowedModules(comoPapel("funcionario"))).size).toBe(0);
  });

  it("cai no padrão do papel quando o funcionário não tem linha nenhuma", async () => {
    linhasUserModules = [];
    const permitidos = await getAllowedModules(comoPapel("funcionario"));
    expect([...permitidos].sort()).toEqual([...FUNCIONARIO_DEFAULT].sort());
  });

  it("cai no padrão também quando a consulta não devolve nada", async () => {
    linhasUserModules = null;
    const permitidos = await getAllowedModules(comoPapel("funcionario"));
    expect([...permitidos].sort()).toEqual([...FUNCIONARIO_DEFAULT].sort());
  });
});

describe("requireModule — guard de server action", () => {
  it("deixa passar quem tem o módulo", async () => {
    usuarioAtual = comoPapel("admin");
    await expect(requireModule("vagas")).resolves.toMatchObject({ role: "admin" });
  });

  it("lança para quem não tem, em vez de devolver o usuário", async () => {
    usuarioAtual = comoPapel("cliente");
    await expect(requireModule("vagas")).rejects.toThrow(/Forbidden/);
  });

  it("lança para funcionário sem aquele módulo específico", async () => {
    linhasUserModules = [{ module: "vagas", allowed: true }];
    await expect(requireModule("financeiro")).rejects.toThrow(/Forbidden/);
  });
});

describe("guardModule — guard de página", () => {
  it("deixa passar quem tem o módulo, sem redirecionar", async () => {
    usuarioAtual = comoPapel("sysadmin");
    await expect(guardModule("relatorios")).resolves.toMatchObject({ role: "sysadmin" });
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("redireciona para /inicio quem não tem — bloqueia no servidor, não esconde o menu", async () => {
    usuarioAtual = comoPapel("prestador_servico");
    await expect(guardModule("financeiro")).rejects.toThrow("REDIRECT:/inicio");
    expect(redirectSpy).toHaveBeenCalledWith("/inicio");
  });
});

describe("getAllowedCapabilities", () => {
  it("dá todas as capacidades a sysadmin e a admin", async () => {
    for (const role of ["sysadmin", "admin"] as const) {
      const caps = await getAllowedCapabilities(comoPapel(role), "ws-1");
      expect([...caps].sort()).toEqual([...CAPABILITIES].sort());
    }
  });

  it("não dá capacidade a prestador nem a cliente", async () => {
    for (const role of ["prestador_servico", "cliente"] as const) {
      expect((await getAllowedCapabilities(comoPapel(role), "ws-1")).size).toBe(0);
    }
  });

  it("para o funcionário, ausência de linha é OFF — mais estrito que módulo", async () => {
    // Módulo sem linha cai num padrão; capacidade sem linha não libera nada.
    linhasUserModules = [];
    expect((await getAllowedCapabilities(comoPapel("funcionario"), "ws-1")).size).toBe(0);
  });

  it("libera ao funcionário só a capacidade marcada como permitida", async () => {
    linhasUserModules = [
      { module: CAPABILITIES[0]!, allowed: true },
      { module: CAPABILITIES[1]!, allowed: false },
    ];
    const caps = await getAllowedCapabilities(comoPapel("funcionario"), "ws-1");
    expect(caps.has(CAPABILITIES[0]!)).toBe(true);
    expect(caps.has(CAPABILITIES[1]!)).toBe(false);
  });

  it("descarta capacidade desconhecida vinda do banco", async () => {
    linhasUserModules = [{ module: "capacidade_inventada", allowed: true }];
    expect((await getAllowedCapabilities(comoPapel("funcionario"), "ws-1")).size).toBe(0);
  });
});

describe("requireCapability", () => {
  it("deixa passar o sócio", async () => {
    usuarioAtual = comoPapel("admin");
    await expect(requireCapability(CAPABILITIES[0]!, "ws-1")).resolves.toBeTruthy();
  });

  it("lança para o funcionário sem a capacidade liberada", async () => {
    linhasUserModules = [];
    await expect(requireCapability(CAPABILITIES[0]!, "ws-1")).rejects.toThrow(/Forbidden/);
  });
});
