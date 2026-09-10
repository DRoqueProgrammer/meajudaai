import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, criarHorario, limpar } from "./harness";
import { CONTAS_EXEMPLO } from "@/lib/auth/contas-exemplo";
import * as exemplo from "@/lib/auth/exemplo";
import * as consultas from "@/lib/admin/consultas";

/**
 * Gabarito da tarefa 3 da Fatia 1 — R-42 e R-43 (ADR 0012; decisão D-015).
 *
 * As cinco contas de exemplo continuam em um clique, mas cada uma só enxerga e altera
 * o mundo de exemplo. Contrato da tarefa:
 * - `profiles.exemplo` (booleano) marca as pessoas do mundo de exemplo — exatamente as
 *   cinco de `CONTAS_EXEMPLO` hoje;
 * - `lib/auth/exemplo.ts` exporta `podeAgirSobre(ator, alvo)`, a regra única das
 *   escritas administrativas: conta de exemplo não age sobre quem não é de exemplo;
 * - `lib/admin/consultas.ts` exporta as leituras das telas administrativas —
 *   `listarAcessos(db, ator)`, `listarServicosDaPlataforma(db, ator)` e
 *   `listarUsuarios(db, ator)` — que devolvem só o mundo de exemplo quando o ator é de
 *   exemplo; as telas `/admin/logs`, `/admin/servicos` e `/admin/usuarios` usam essas
 *   funções, e as actions administrativas de escrita usam `podeAgirSobre`;
 * - a senha das contas de exemplo só existe no servidor.
 */

type Ator = { exemplo: boolean };
type Linha = Record<string, unknown>;

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · regra única de quem age sobre quem (sem banco)", () => {
  it("podeAgirSobre existe", () => {
    expect(typeof exemplo.podeAgirSobre).toBe("function");
  });

  it("conta de exemplo não age sobre quem não é de exemplo", () => {
    expect(exemplo.podeAgirSobre({ exemplo: true }, { exemplo: false })).toBe(false);
  });

  it("conta de exemplo age sobre o mundo de exemplo; conta real age sobre qualquer um", () => {
    expect(exemplo.podeAgirSobre({ exemplo: true }, { exemplo: true })).toBe(true);
    expect(exemplo.podeAgirSobre({ exemplo: false }, { exemplo: false })).toBe(true);
    expect(exemplo.podeAgirSobre({ exemplo: false }, { exemplo: true })).toBe(true);
  });

  it("as telas administrativas leem pelas consultas com escopo", () => {
    expect(leitura("app/(app)/admin/logs/page.tsx")).toMatch(/listarAcessos/);
    expect(leitura("app/(app)/admin/servicos/page.tsx")).toMatch(/listarServicosDaPlataforma/);
    expect(leitura("app/(app)/admin/usuarios/page.tsx")).toMatch(/listarUsuarios/);
  });

  it("a action que muda o papel de alguém consulta a regra única", () => {
    expect(leitura("lib/actions/admin-users.ts")).toMatch(/podeAgirSobre/);
  });

  it("R-43 — a senha das contas de exemplo só existe no servidor", () => {
    expect(leitura("lib/auth/contas-exemplo.ts")).toMatch(/import\s+["']server-only["']/);
  });
});

describe.skipIf(!podeRodar)("Fatia 1 · o mundo de exemplo não enxerga o mundo real", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let R = "";
  let Q = "";

  beforeAll(async () => {
    R = await criarPessoa(reg, `f1-exemplo-r-${s}@teste.dev`, "cliente");
    Q = await criarPessoa(reg, `f1-exemplo-q-${s}@teste.dev`, "prestador_servico", { preco_tipo: "hora", preco_valor: 90 });
    const log = await servico!.from("login_logs").insert({ user_id: R, ip: "203.0.113.7", user_agent: "gabarito", cidade: "Niterói", pais: "BR" });
    if (log.error) throw log.error;
    const horario = await criarHorario(Q);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: horario, cliente_id: R, prestador_id: Q, descricao: "Gabarito exemplo", preco_tipo: "hora", preco_valor: 90 });
    if (sv.error) throw sv.error;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("exatamente as cinco contas de exemplo carregam a marca", async () => {
    const { data, error } = await servico!.from("profiles").select("user_id").eq("exemplo", true);
    expect(error).toBeNull();
    const ids = (data ?? []).map((l) => l.user_id as string);
    const { data: pii } = await servico!.from("profiles_pii").select("email").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const emails = new Set((pii ?? []).map((l) => String(l.email).toLowerCase()));
    const esperados = new Set(Object.values(CONTAS_EXEMPLO).map((c) => c.email.toLowerCase()));
    expect(emails).toEqual(esperados);
  });

  it("pessoa nova nasce fora do mundo de exemplo", async () => {
    const { data } = await servico!.from("profiles").select("exemplo").eq("user_id", R).single();
    expect(data?.exemplo).toBe(false);
  });

  const contem = (linhas: Linha[], id: string) =>
    linhas.some((l) => l.user_id === id || l.cliente_id === id || l.prestador_id === id);

  it("conta de exemplo não enxerga os acessos de quem não é de exemplo", async () => {
    const deExemplo: Ator = { exemplo: true };
    const real: Ator = { exemplo: false };
    expect(contem((await consultas.listarAcessos(servico!, deExemplo)) as Linha[], R)).toBe(false);
    expect(contem((await consultas.listarAcessos(servico!, real)) as Linha[], R)).toBe(true);
  });

  it("conta de exemplo não enxerga os serviços de quem não é de exemplo", async () => {
    expect(contem((await consultas.listarServicosDaPlataforma(servico!, { exemplo: true })) as Linha[], R)).toBe(false);
    expect(contem((await consultas.listarServicosDaPlataforma(servico!, { exemplo: false })) as Linha[], R)).toBe(true);
  });

  it("conta de exemplo não enxerga quem não é de exemplo na lista de usuários", async () => {
    expect(contem((await consultas.listarUsuarios(servico!, { exemplo: true })) as Linha[], R)).toBe(false);
    expect(contem((await consultas.listarUsuarios(servico!, { exemplo: false })) as Linha[], R)).toBe(true);
  });
});
