import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito do LOTE T — abas Serviços, Clientes e Prestadores do Administrador
 * e o botão "Limpar red flags" (pedidos do Leonardo em 11/09/2026, D-047).
 * Escrito pelo controller antes da implementação. Banco, actions e leituras
 * prontos: migration 0058, lib/actions/suspeitas.ts:limparRedFlagsAction,
 * lib/admin/praca-ativa.ts, lib/admin/financeiro.ts, components/admin/praca-abas.tsx.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const existe = (c: string) => existsSync(new URL(c, raiz));

const PAGINAS = {
  servicos: "app/(app)/praca/servicos/page.tsx",
  clientes: "app/(app)/praca/clientes/page.tsx",
  prestadores: "app/(app)/praca/prestadores/page.tsx",
} as const;

describe("Lote T · abas da praça", () => {
  it("as três abas existem", () => {
    for (const p of Object.values(PAGINAS)) expect(existe(p), p).toBe(true);
  });

  it("cada aba é só do Administrador, recortada pela praça ativa e com a faixa de abas", () => {
    for (const [nome, p] of Object.entries(PAGINAS)) {
      const src = ler(p);
      expect(src, nome).toContain("pracaAtivaDoAdmin");
      expect(src, nome).toContain("PracaAbas");
      expect(src, nome).toContain(`atual="/praca/${nome}"`);
      expect(src, nome).toMatch(/role !== "admin"/);
      expect(src, nome).toMatch(/redirect\(/);
      expect(src, nome).toContain("SemPraca");
    }
  });

  it("as leituras pela chave de serviço ficam num módulo de servidor, recortadas pelos prestadores/clientes da praça", () => {
    expect(existe("lib/admin/abas.ts")).toBe(true);
    const abas = ler("lib/admin/abas.ts");
    expect(abas).toMatch(/import\s+["']server-only["']/);
    expect(abas).toMatch(/\.in\("prestador_id"/);
    expect(abas).not.toMatch(/"use server"/);
  });

  it("Serviços: filtro por status pela URL, com o cliente, o tipo e a comissão de cada serviço", () => {
    const src = ler(PAGINAS.servicos);
    expect(src).toContain("StatusTabs");
    expect(src).toMatch(/searchParams/);
    expect(src).toMatch(/comiss/i);
    expect(src).toMatch(/listarTiposServico|nomeTipo/);
  });

  it("Clientes e Prestadores: red flags, suspensão e o botão de limpar", () => {
    for (const p of [PAGINAS.clientes, PAGINAS.prestadores]) {
      const src = ler(p);
      expect(src, p).toContain("FlagsPessoa");
      expect(src, p).toContain("LimparRedFlags");
      expect(src, p).toMatch(/SuspensaoControle|suspenderClienteAction|suspenderPrestadorAction/);
    }
  });

  it("Prestadores: saldo da comissão com o destaque de atraso e as suspeitas privadas", () => {
    const src = ler(PAGINAS.prestadores);
    expect(src).toMatch(/saldosPorPrestador|comissoesDaPraca/);
    expect(src).toContain("estaAtrasado");
    expect(src).toContain("SuspeitasDoPrestador");
  });

  it("Limpar red flags: action da sessão, confirmação em dois passos, explica que o registro fica", () => {
    const btn = ler("components/admin/limpar-red-flags.tsx");
    expect(btn).toMatch(/^"use client"/);
    expect(btn).toContain("limparRedFlagsAction");
    expect(btn).toMatch(/Limpar red flags/);
    expect(btn).toMatch(/continuam registradas/i);
    expect(btn).toMatch(/router\.refresh\(\)/);
    expect(btn).not.toMatch(/window\.confirm/);
  });

  it("nada fala em pilantragem nas abas", () => {
    for (const p of [...Object.values(PAGINAS), "components/admin/limpar-red-flags.tsx"]) {
      expect(ler(p), p).not.toMatch(/pilantr/i);
    }
  });
});
