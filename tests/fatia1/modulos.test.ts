import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, limpar } from "./harness";
import * as modulos from "@/lib/auth/modules";
import * as workspace from "@/lib/auth/workspace";

/**
 * Gabarito da tarefa 7 da Fatia 1 — R-45 (ADR 0014).
 *
 * A liberação de módulo já é gravada por empresa; falta lê-la e concedê-la por
 * empresa. Contrato da tarefa:
 * - `lib/auth/modules.ts` exporta `modulosDoFuncionario(db, userId, workspaceId)`:
 *   os módulos liberados PARA AQUELA EMPRESA, ou o padrão do papel se não houver
 *   nenhuma linha nela; `getAllowedModules` passa a usá-la com a empresa ativa;
 * - `lib/auth/workspace.ts` exporta `ehMembroDaEmpresa(db, userId, workspaceId)`, e
 *   `setModuloFuncionarioAction` recusa liberar módulo para quem não é membro.
 */

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · módulos presos à empresa (código)", () => {
  it("as duas funções existem", () => {
    expect(typeof modulos.modulosDoFuncionario).toBe("function");
    expect(typeof workspace.ehMembroDaEmpresa).toBe("function");
  });

  it("a leitura e a concessão usam as regras novas", () => {
    expect(leitura("lib/auth/modules.ts")).toMatch(/modulosDoFuncionario\(/);
    expect(leitura("lib/actions/modules.ts")).toMatch(/ehMembroDaEmpresa/);
  });
});

describe.skipIf(!podeRodar)("Fatia 1 · liberação de módulo vale só na empresa que liberou", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let F = "";
  let A = "";
  let B = "";
  let C = "";

  async function empresa(dono: string, nome: string): Promise<string> {
    const { data, error } = await servico!.from("workspaces").insert({ owner_id: dono, nome, cidade: "Niterói", estado: "RJ" }).select("id").single();
    if (error || !data) throw error ?? new Error("empresa não criada");
    reg.pracas.push(data.id as string);
    const m = await servico!.from("workspace_members").insert({ workspace_id: data.id, user_id: dono, role: "owner" });
    if (m.error) throw m.error;
    return data.id as string;
  }

  beforeAll(async () => {
    const oA = await criarPessoa(reg, `f1-modulos-oa-${s}@teste.dev`, "admin");
    const oB = await criarPessoa(reg, `f1-modulos-ob-${s}@teste.dev`, "admin");
    F = await criarPessoa(reg, `f1-modulos-f-${s}@teste.dev`, "funcionario");
    A = await empresa(oA, `F1 Empresa A ${s}`);
    B = await empresa(oB, `F1 Empresa B ${s}`);
    C = await empresa(oA, `F1 Empresa C ${s}`);
    for (const ws of [A, C]) {
      const m = await servico!.from("workspace_members").insert({ workspace_id: ws, user_id: F, role: "membro" });
      if (m.error) throw m.error;
    }
    // A liberação na empresa B é o artefato do ataque: o dono de B "liberou" para F,
    // que não é membro de B.
    const um = await servico!.from("user_modules").insert([
      { user_id: F, workspace_id: B, module: "financeiro", allowed: true },
      { user_id: F, workspace_id: A, module: "relatorios", allowed: true },
    ]);
    if (um.error) throw um.error;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("na empresa A, vale só o que foi liberado na A", async () => {
    const m = await modulos.modulosDoFuncionario(servico!, F, A);
    expect(m.has("relatorios")).toBe(true);
    expect(m.has("financeiro")).toBe(false);
  });

  it("numa empresa sem liberação, vale o padrão do papel", async () => {
    const m = await modulos.modulosDoFuncionario(servico!, F, C);
    expect([...m].sort()).toEqual(["vagas"]);
  });

  it("ehMembroDaEmpresa confere o alvo da liberação", async () => {
    expect(await workspace.ehMembroDaEmpresa(servico!, F, A)).toBe(true);
    expect(await workspace.ehMembroDaEmpresa(servico!, F, B)).toBe(false);
  });
});
