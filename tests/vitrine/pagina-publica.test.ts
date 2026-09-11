import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito da página pública do prestador (Fatia 5), escrito pelo controller
 * antes da tela. O banco já está pronto e testado (migration 0049,
 * tests/anuncios/perfil-publico.test.ts). A vitrine da página inicial passa a
 * levar "Ver agenda" para /p/<id>, que abre sem login.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const PAGINA = "app/p/[id]/page.tsx";

describe("Página pública do prestador", () => {
  it("existe e lê só pelas funções públicas, sem chave de serviço", () => {
    expect(existsSync(new URL(PAGINA, raiz))).toBe(true);
    const pagina = ler(PAGINA);
    for (const fn of ["perfil_publico_prestador", "horarios_livres_publicos", "avaliacoes_publicas", "anuncios_publicos"]) {
      expect(pagina).toContain(fn);
    }
    expect(pagina).not.toMatch(/createAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("tem título e Open Graph próprios", () => {
    expect(ler(PAGINA)).toContain("generateMetadata");
  });

  it("abre sem login", () => {
    expect(ler("middleware.ts")).toContain('"/p/"');
  });

  it("a vitrine da página inicial leva para a página pública", () => {
    expect(ler("components/landing/vitrine-servicos.tsx")).toContain("/p/");
  });

  it("para agendar, leva ao login com volta para a agenda do prestador", () => {
    expect(ler(PAGINA)).toMatch(/\/login\?next=/);
  });
});
