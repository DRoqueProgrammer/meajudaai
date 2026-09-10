import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito da tarefa 5 da Fatia 1 — R-46 e R-47 (ADR 0013; decisão D-016, GAP-015).
 *
 * Só o SysAdmin cria praça e vincula Administrador a uma ou mais praças, com uma
 * praça padrão. Contrato da tarefa:
 * - `workspace_members.padrao` (booleano): no máximo uma padrão por pessoa; todo
 *   Administrador existente tem exatamente uma depois da migration;
 * - `lib/actions/pracas.ts` exporta `criarPracaAction(estado, formData)` (campos
 *   `nome`, `cidade`, `estado`) e `vincularAdministradorAction(adminId, pracaIds,
 *   padraoId)`, que SUBSTITUI o conjunto de praças do Administrador; as duas pegam o
 *   ator por `tryWriter()` (lib/auth/guard) e recusam quem não é SysAdmin antes de
 *   qualquer escrita;
 * - `criarConviteAction("owner")` (convite de Administrador) passa a ser só do
 *   SysAdmin, e é recusado antes de qualquer outra consulta;
 * - a área do SysAdmin ganha a página `/admin/pracas`, no menu dele;
 * - criar ou promover Administrador deixa de fabricar uma "Empresa de {nome}".
 *
 * A sessão é simulada: o teste troca quem é o ator. As escritas vão ao banco real.
 */

const sessao = vi.hoisted(() => ({ user: null as null | { id: string; email: string | null; role: string } }));

vi.mock("@/lib/auth/guard", () => ({
  tryWriter: async () => (sessao.user ? { user: sessao.user } : { erro: "Sessão expirada — entre novamente." }),
  requireWriter: async () => {
    if (!sessao.user) throw new Error("Forbidden");
    return sessao.user;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));

import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, limpar } from "./harness";
import * as pracas from "@/lib/actions/pracas";
import { criarConviteAction } from "@/lib/actions/convite";

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

function formulario(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("Fatia 1 · a área do SysAdmin governa as praças (código)", () => {
  it("existe a página /admin/pracas e ela usa as duas actions", () => {
    const caminho = "app/(app)/admin/pracas/page.tsx";
    expect(existsSync(new URL(`../../${caminho}`, import.meta.url))).toBe(true);
    const pagina = leitura(caminho);
    expect(pagina).toMatch(/criarPracaAction/);
    expect(pagina).toMatch(/vincularAdministradorAction/);
  });

  it("o menu do SysAdmin leva a /admin/pracas", () => {
    expect(leitura("components/nav.tsx")).toMatch(/\/admin\/pracas/);
  });

  it("criar ou promover Administrador não fabrica mais uma 'Empresa de'", () => {
    expect(leitura("lib/actions/admin-users.ts")).not.toMatch(/Empresa de/);
  });
});

describe.skipIf(!podeRodar)("Fatia 1 · só o SysAdmin cria praça e vincula Administrador", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let SYS = "";
  let A1 = "";
  let A2 = "";
  let pA = "";
  let pB = "";

  const membrosDe = async (userId: string) =>
    ((await servico!.from("workspace_members").select("workspace_id, padrao").eq("user_id", userId)).data ?? []) as {
      workspace_id: string;
      padrao: boolean;
    }[];
  const pracaPorNome = async (nome: string) =>
    ((await servico!.from("workspaces").select("id").eq("nome", nome)).data ?? []) as { id: string }[];

  beforeAll(async () => {
    SYS = await criarPessoa(reg, `f1-pracas-sys-${s}@teste.dev`, "sysadmin");
    A1 = await criarPessoa(reg, `f1-pracas-a1-${s}@teste.dev`, "admin");
    A2 = await criarPessoa(reg, `f1-pracas-a2-${s}@teste.dev`, "admin");
  });

  afterAll(async () => {
    sessao.user = null;
    for (const nome of [`F1 Praça ${s} A`, `F1 Praça ${s} B`, `F1 Praça ${s} negada`]) {
      for (const p of await pracaPorNome(nome)) reg.pracas.push(p.id);
    }
    await limpar(reg);
  });

  it("todo Administrador de fora deste teste tem exatamente uma praça padrão", async () => {
    const { data: admins, error } = await servico!.from("profiles").select("user_id").eq("tipo_base", "admin");
    expect(error).toBeNull();
    const deFora = (admins ?? []).map((a) => a.user_id as string).filter((id) => !reg.usuarios.includes(id));
    for (const id of deFora) {
      const padroes = (await membrosDe(id)).filter((m) => m.padrao);
      expect(padroes, `administrador ${id}`).toHaveLength(1);
    }
  });

  it("quem não é SysAdmin não cria praça", async () => {
    sessao.user = { id: A1, email: null, role: "admin" };
    const r = await pracas.criarPracaAction(null, formulario({ nome: `F1 Praça ${s} negada`, cidade: "Niterói", estado: "RJ" }));
    expect(r?.erro).toBeTruthy();
    expect(await pracaPorNome(`F1 Praça ${s} negada`)).toHaveLength(0);
  });

  it("o SysAdmin cria praça", async () => {
    sessao.user = { id: SYS, email: null, role: "sysadmin" };
    const rA = await pracas.criarPracaAction(null, formulario({ nome: `F1 Praça ${s} A`, cidade: "Niterói", estado: "RJ" }));
    const rB = await pracas.criarPracaAction(null, formulario({ nome: `F1 Praça ${s} B`, cidade: "Maceió", estado: "AL" }));
    expect(rA?.erro).toBeFalsy();
    expect(rB?.erro).toBeFalsy();
    const a = await pracaPorNome(`F1 Praça ${s} A`);
    const b = await pracaPorNome(`F1 Praça ${s} B`);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    pA = a[0]!.id;
    pB = b[0]!.id;
    reg.pracas.push(pA, pB);
  });

  it("quem não é SysAdmin não vincula Administrador", async () => {
    sessao.user = { id: A1, email: null, role: "admin" };
    const r = await pracas.vincularAdministradorAction(A2, [pA], pA);
    expect(r.ok).toBe(false);
    expect(await membrosDe(A2)).toHaveLength(0);
  });

  it("o SysAdmin vincula um Administrador a duas praças, com uma padrão", async () => {
    sessao.user = { id: SYS, email: null, role: "sysadmin" };
    const r = await pracas.vincularAdministradorAction(A2, [pA, pB], pB);
    expect(r.ok).toBe(true);
    const membros = await membrosDe(A2);
    expect(membros.map((m) => m.workspace_id).sort()).toEqual([pA, pB].sort());
    expect(membros.filter((m) => m.padrao).map((m) => m.workspace_id)).toEqual([pB]);
  });

  it("vincular de novo substitui o conjunto de praças", async () => {
    sessao.user = { id: SYS, email: null, role: "sysadmin" };
    const r = await pracas.vincularAdministradorAction(A2, [pA], pA);
    expect(r.ok).toBe(true);
    const membros = await membrosDe(A2);
    expect(membros.map((m) => m.workspace_id)).toEqual([pA]);
    expect(membros[0]?.padrao).toBe(true);
  });

  it("a praça padrão precisa estar entre as vinculadas", async () => {
    sessao.user = { id: SYS, email: null, role: "sysadmin" };
    const r = await pracas.vincularAdministradorAction(A2, [pA], pB);
    expect(r.ok).toBe(false);
  });

  it("convite de Administrador é só do SysAdmin", async () => {
    sessao.user = { id: A1, email: null, role: "admin" };
    const r = await criarConviteAction("owner");
    expect(r.ok).toBe(false);
  });
});
