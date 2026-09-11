import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, limpar } from "../fatia1/harness";
import { resumoDaPlataforma } from "@/lib/admin/consultas";

/**
 * Gabarito do painel do SysAdmin (Fatia 5), escrito pelo controller antes da
 * tela. O SysAdmin deixa de cair no Início genérico e ganha o "Painel da
 * plataforma" — números da plataforma inteira, sempre no recorte do mundo de
 * exemplo (a conta de exemplo, que qualquer visitante abre, só enxerga o mundo
 * de exemplo; D-015/D-030).
 *
 * Contrato: `resumoDaPlataforma(db, ator: { exemplo: boolean })` em
 * lib/admin/consultas.ts devolve pelo menos
 * `{ usuariosPorPapel: Record<string, number>, servicosPorStatus: Record<string, number>,
 *    anunciosAtivos: { servico: number; vaga_ajudante: number },
 *    pedidosDeExclusaoPendentes: number, denunciasAbertas: number, pracas: number }`.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

describe("Painel do SysAdmin · tela", () => {
  it("o Início do SysAdmin usa o painel da plataforma", () => {
    expect(ler("app/(app)/inicio/page.tsx")).toContain("PainelDaPlataforma");
    expect(ler("components/admin/painel-da-plataforma.tsx")).toContain("export function PainelDaPlataforma");
  });
});

describe.skipIf(!podeRodar)("Painel do SysAdmin · recorte do mundo de exemplo", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let real = "";

  beforeAll(async () => {
    real = await criarPessoa(reg, `f1-painel-real-${s}@teste.dev`, "prestador_servico", {
      preco_tipo: "hora",
      preco_valor: 50,
      categoria: "ajudante_eletricista",
    });
  });

  afterAll(async () => {
    await limpar(reg);
  });

  const soma = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  it("conta de exemplo só conta gente do mundo de exemplo", async () => {
    const { count } = await servico!.from("profiles").select("user_id", { count: "exact", head: true }).eq("exemplo", true);
    const r = await resumoDaPlataforma(servico!, { exemplo: true });
    expect(soma(r.usuariosPorPapel)).toBe(count);
  });

  it("conta real conta todo mundo, inclusive a pessoa nova", async () => {
    const { count } = await servico!.from("profiles").select("user_id", { count: "exact", head: true });
    const r = await resumoDaPlataforma(servico!, { exemplo: false });
    expect(soma(r.usuariosPorPapel)).toBe(count);
    expect(real).toBeTruthy();
  });

  it("traz os números que o painel mostra", async () => {
    const r = await resumoDaPlataforma(servico!, { exemplo: false });
    expect(typeof r.anunciosAtivos.servico).toBe("number");
    expect(typeof r.anunciosAtivos.vaga_ajudante).toBe("number");
    expect(typeof r.pedidosDeExclusaoPendentes).toBe("number");
    expect(typeof r.denunciasAbertas).toBe("number");
    expect(typeof r.pracas).toBe("number");
    expect(typeof soma(r.servicosPorStatus)).toBe("number");
  });
});
