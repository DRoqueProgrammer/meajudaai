import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fecha os últimos módulos de `lib/` que ainda estavam em 0%: quem é o usuário,
// em qual empresa ele está, o log estruturado e a origem canônica do app.
// Todos dependem de contexto de servidor, então o contexto é dublado — o que se
// prova é a decisão que cada um toma, não a consulta que ele faz.

// ── estado controlado pelos testes ──────────────────────────────────────────
let authUser: { id: string; email: string | null } | null = null;
let perfil: { tipo_base: unknown; exemplo?: boolean } | null = null;
let membros: { workspace_id: string; role: string; workspaces: { nome: string } | null }[] = [];
let membroUnico: { role: string } | null = null;
let cookieWs: string | undefined;
let cabecalhoOrigin: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: perfil }) }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          // lista de empresas do usuário
          then: (r: (v: { data: unknown }) => unknown) => r({ data: membros }),
          // consulta encadeada de papel numa empresa específica
          eq: () => ({ maybeSingle: async () => ({ data: membroUnico }) }),
        }),
      }),
    }),
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (k === "ws_ativo" && cookieWs ? { value: cookieWs } : undefined) }),
  headers: async () => ({ get: (k: string) => (k === "origin" ? cabecalhoOrigin : null) }),
}));

const { getCurrentUser, requireUser } = await import("../lib/auth/roles");
const { getMyWorkspaces, getActiveWorkspace, requireWorkspaceRole } = await import(
  "../lib/auth/workspace"
);
const { logAction } = await import("../lib/log");
const { getSiteUrl } = await import("../lib/site-url");

beforeEach(() => {
  authUser = { id: "u-1", email: "leo@meajudaai.app" };
  perfil = { tipo_base: "admin" };
  membros = [];
  membroUnico = null;
  cookieWs = undefined;
  cabecalhoOrigin = null;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("getCurrentUser", () => {
  it("devolve id, e-mail, papel e marca de exemplo lidos do perfil", async () => {
    expect(await getCurrentUser()).toEqual({ id: "u-1", email: "leo@meajudaai.app", role: "admin", exemplo: false });
    perfil = { tipo_base: "sysadmin", exemplo: true };
    expect((await getCurrentUser())!.exemplo).toBe(true);
  });

  it("sem perfil, a pessoa não é de exemplo (o piso é conta real sem privilégio)", async () => {
    perfil = null;
    expect(await getCurrentUser()).toMatchObject({ role: "cliente", exemplo: false });
  });

  it("devolve nulo sem sessão", async () => {
    authUser = null;
    expect(await getCurrentUser()).toBeNull();
  });

  it("blinda papel inválido vindo do banco, caindo no menos privilegiado", async () => {
    // Um valor estranho em `tipo_base` não pode virar acesso: o piso é cliente.
    for (const valor of ["papel_inventado", null, 42, undefined]) {
      perfil = { tipo_base: valor };
      expect((await getCurrentUser())!.role).toBe("cliente");
    }
  });

  it("cai em cliente quando o perfil nem existe", async () => {
    perfil = null;
    expect((await getCurrentUser())!.role).toBe("cliente");
  });

  it("aceita e-mail ausente sem quebrar", async () => {
    authUser = { id: "u-2", email: null };
    expect((await getCurrentUser())!.email).toBeNull();
  });

  it("aceita os 5 papéis do schema", async () => {
    for (const role of ["sysadmin", "admin", "funcionario", "prestador_servico", "cliente"]) {
      perfil = { tipo_base: role };
      expect((await getCurrentUser())!.role).toBe(role);
    }
  });
});

describe("requireUser", () => {
  it("devolve o usuário quando há sessão", async () => {
    await expect(requireUser()).resolves.toMatchObject({ id: "u-1" });
  });

  it("lança sem sessão, em vez de devolver nulo para o chamador esquecer de checar", async () => {
    authUser = null;
    await expect(requireUser()).rejects.toThrow(/Forbidden/);
  });
});

describe("getMyWorkspaces", () => {
  it("mapeia empresa, papel e nome", async () => {
    membros = [{ workspace_id: "ws-1", role: "admin", workspaces: { nome: "Construtora Lopes" } }];
    expect(await getMyWorkspaces()).toEqual([
      { workspace_id: "ws-1", role: "admin", nome: "Construtora Lopes" },
    ]);
  });

  it("aceita empresa sem nome carregado, sem quebrar a lista", async () => {
    membros = [{ workspace_id: "ws-1", role: "admin", workspaces: null }];
    expect((await getMyWorkspaces())[0]!.nome).toBe("");
  });

  it("devolve lista vazia quando o usuário não participa de nenhuma", async () => {
    membros = [];
    expect(await getMyWorkspaces()).toEqual([]);
  });
});

describe("getActiveWorkspace", () => {
  const duas = [
    { workspace_id: "ws-1", role: "admin", workspaces: { nome: "Primeira" } },
    { workspace_id: "ws-2", role: "admin", workspaces: { nome: "Segunda" } },
  ];

  it("devolve nulo quando não há empresa nenhuma", async () => {
    membros = [];
    expect(await getActiveWorkspace()).toBeNull();
  });

  it("respeita a escolha do seletor quando ela é legítima", async () => {
    membros = duas;
    cookieWs = "ws-2";
    expect((await getActiveWorkspace())!.workspace_id).toBe("ws-2");
  });

  it("ignora escolha de empresa que não é do usuário — o cookie é do cliente", async () => {
    // Sem essa validação, trocar o cookie no navegador daria acesso a outra empresa.
    membros = duas;
    cookieWs = "ws-de-outra-pessoa";
    expect((await getActiveWorkspace())!.workspace_id).toBe("ws-1");
  });

  it("cai na primeira quando não há escolha", async () => {
    membros = duas;
    expect((await getActiveWorkspace())!.workspace_id).toBe("ws-1");
  });
});

describe("requireWorkspaceRole", () => {
  it("deixa o sysadmin passar sem consultar vínculo", async () => {
    perfil = { tipo_base: "sysadmin" };
    membroUnico = null; // nem precisaria existir
    await expect(requireWorkspaceRole("ws-1", ["admin"])).resolves.toBeUndefined();
  });

  it("deixa passar quem tem um dos papéis exigidos", async () => {
    membroUnico = { role: "admin" };
    await expect(requireWorkspaceRole("ws-1", ["admin", "funcionario"])).resolves.toBeUndefined();
  });

  it("barra quem tem papel diferente do exigido", async () => {
    membroUnico = { role: "funcionario" };
    await expect(requireWorkspaceRole("ws-1", ["admin"])).rejects.toThrow(/Forbidden/);
  });

  it("barra quem não tem vínculo nenhum com a empresa", async () => {
    membroUnico = null;
    await expect(requireWorkspaceRole("ws-1", ["admin"])).rejects.toThrow(/Forbidden/);
  });
});

describe("logAction", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("emite uma linha JSON com carimbo de tempo, ação e campos", () => {
    logAction("publicar_vaga", { userId: "u-1", result: "ok", vagaId: "v-9" });
    const linha = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(linha).toMatchObject({ action: "publicar_vaga", userId: "u-1", result: "ok", vagaId: "v-9" });
    expect(Number.isNaN(Date.parse(linha.ts))).toBe(false);
  });

  it("manda erro para stderr e o resto para stdout — separa alerta de fluxo normal", () => {
    logAction("publicar_vaga", { result: "erro" });
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();

    for (const result of ["ok", "negado", "rate_limited"] as const) {
      logAction("acao", { result });
    }
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it("emite exatamente uma linha por evento, para o coletor indexar sem regex", () => {
    logAction("acao", { result: "ok" });
    expect((logSpy.mock.calls[0]![0] as string).includes("\n")).toBe(false);
  });
});

describe("getSiteUrl", () => {
  it("prefere a variável de ambiente — o link de recuperação precisa ser previsível", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://meajudaai.com.br";
    cabecalhoOrigin = "http://interno:3000";
    expect(await getSiteUrl()).toBe("https://meajudaai.com.br");
  });

  it("tira barra no fim para não gerar link com barra dupla", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://meajudaai.com.br///";
    expect(await getSiteUrl()).toBe("https://meajudaai.com.br");
  });

  it("usa o cabeçalho quando não há variável configurada", async () => {
    cabecalhoOrigin = "https://preview.vercel.app/";
    expect(await getSiteUrl()).toBe("https://preview.vercel.app");
  });

  it("ignora variável vazia ou só com espaço", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    cabecalhoOrigin = "https://origem.dev";
    expect(await getSiteUrl()).toBe("https://origem.dev");
  });

  it("cai em localhost quando não há nem variável nem cabeçalho", async () => {
    expect(await getSiteUrl()).toBe("http://localhost:3000");
  });
});
