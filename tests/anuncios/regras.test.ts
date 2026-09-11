import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { adminAlcancaPrestador, limiteValido, LIMITE_PADRAO_PLATAFORMA, LIMITE_MAXIMO } from "@/lib/anuncios/regras";

/**
 * Gabarito do lote do painel do Administrador (escrito pelo controller antes da
 * implementação). A regra de alcance espelha a do banco (limite_de_anuncios,
 * migration 0044): o Administrador ajusta prestadores da cidade de uma das
 * praças dele, do mesmo mundo (exemplo ou real), e conta de exemplo só age no
 * mundo de exemplo (podeAgirSobre).
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

const pracaReal = { id: "w1", cidade: "Niterói", estado: "RJ", exemplo: false };
const pracaExemplo = { id: "w2", cidade: "Niterói", estado: "RJ", exemplo: true };
const prestador = (extra: Partial<{ tipo_base: string; cidade: string | null; estado: string | null; exemplo: boolean }> = {}) => ({
  tipo_base: "prestador_servico",
  cidade: "Niterói",
  estado: "RJ",
  exemplo: false,
  ...extra,
});

describe("Regras dos anúncios", () => {
  it("o padrão da plataforma é 3 e o teto é 50, como no banco", () => {
    expect(LIMITE_PADRAO_PLATAFORMA).toBe(3);
    expect(LIMITE_MAXIMO).toBe(50);
  });

  it("limite válido é inteiro de 0 a 50", () => {
    expect(limiteValido(0)).toBe(true);
    expect(limiteValido(50)).toBe(true);
    expect(limiteValido(51)).toBe(false);
    expect(limiteValido(-1)).toBe(false);
    expect(limiteValido(2.5)).toBe(false);
    expect(limiteValido(Number.NaN)).toBe(false);
    expect(limiteValido("3")).toBe(false);
  });

  it("Administrador real alcança prestador real da cidade da praça dele", () => {
    expect(adminAlcancaPrestador({ exemplo: false }, [pracaReal], prestador())).toBe(true);
  });

  it("não alcança prestador de outra cidade, nem quem não é prestador", () => {
    expect(adminAlcancaPrestador({ exemplo: false }, [pracaReal], prestador({ cidade: "São Gonçalo" }))).toBe(false);
    expect(adminAlcancaPrestador({ exemplo: false }, [pracaReal], prestador({ tipo_base: "cliente" }))).toBe(false);
    expect(adminAlcancaPrestador({ exemplo: false }, [], prestador())).toBe(false);
  });

  it("o mundo da praça precisa ser o do prestador", () => {
    expect(adminAlcancaPrestador({ exemplo: false }, [pracaReal], prestador({ exemplo: true }))).toBe(false);
    expect(adminAlcancaPrestador({ exemplo: true }, [pracaExemplo], prestador({ exemplo: true }))).toBe(true);
  });

  it("conta de exemplo nunca alcança prestador real", () => {
    expect(adminAlcancaPrestador({ exemplo: true }, [pracaReal, pracaExemplo], prestador())).toBe(false);
  });
});

describe("Painel do Administrador · código", () => {
  it("as actions do Administrador existem e conferem o alcance", () => {
    const acoes = ler("lib/actions/anuncios-admin.ts");
    for (const nome of ["definirLimitePadraoAction", "definirLimitePrestadorAction", "moderarAnuncioAction"]) {
      expect(acoes).toMatch(new RegExp(`export async function ${nome}\(`));
    }
    expect(acoes).toMatch(/adminAlcancaPrestador/);
  });

  it("o Início não oferece mais o mural de vagas da v1", () => {
    const inicio = ler("app/(app)/inicio/page.tsx");
    expect(inicio).not.toMatch(/Publique uma vaga/);
    expect(inicio).not.toMatch(/PRECISO DE AJUDANTE/i);
  });

  it("o menu leva o prestador aos anúncios dele", () => {
    expect(ler("components/nav.tsx")).toMatch(/"\/anuncios"/);
  });
});
