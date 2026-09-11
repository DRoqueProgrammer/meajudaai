import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito do LOTE C — a comissão do lado do prestador e a chave Pix do
 * Administrador (D-044: o prestador vê o saldo e a alíquota, abre o QR na
 * chave padrão do Administrador da praça com o valor do saldo, paga e clica
 * "Enviei o Pix"). Escrito pelo controller antes da implementação. Banco e
 * actions prontos: migration 0057, lib/actions/comissao.ts.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const existe = (c: string) => existsSync(new URL(c, raiz));

const PAGINA = "app/(app)/comissao/page.tsx";

describe("Lote C · comissão do prestador", () => {
  it("a tela existe e é só do prestador", () => {
    expect(existe(PAGINA)).toBe(true);
    const src = ler(PAGINA);
    expect(src).toMatch(/role !== "prestador_servico"/);
    expect(src).toMatch(/redirect\(/);
  });

  it("lê pela SESSÃO: as próprias comissões e pagamentos, a alíquota vigente e o destino do Pix", () => {
    const src = ler(PAGINA);
    expect(src).toContain("createServerClient");
    expect(src).not.toContain("createAdminClient");
    expect(src).toContain('"comissoes"');
    expect(src).toContain('"pagamentos_comissao"');
    expect(src).toContain("aliquota_de");
    expect(src).toContain("destino_da_comissao");
  });

  it("paga pelo QR na chave do Administrador, com o valor do saldo, e informa com Enviei o Pix", () => {
    const tudo = [PAGINA, ...componentesComissao()].map(ler).join("\n");
    expect(tudo).toContain("QrPix");
    expect(tudo).toContain("montarPixEstatico");
    expect(tudo).toContain("informarPagamentoAction");
    expect(tudo).toContain("Enviei o Pix");
    expect(tudo).toMatch(/aguardando/i);
  });

  it("sem praça ou sem chave do Administrador, explica em vez de mostrar QR quebrado", () => {
    const tudo = [PAGINA, ...componentesComissao()].map(ler).join("\n");
    expect(tudo).toMatch(/ainda não cadastrou a chave Pix/);
    expect(tudo).toMatch(/praça/);
  });

  it("lista as comissões por mês com o link do recibo mensal", () => {
    const tudo = [PAGINA, ...componentesComissao()].map(ler).join("\n");
    expect(tudo).toContain("/recibo/comissao/");
    expect(tudo).toContain("mesPorExtenso");
  });

  it("o Início do prestador leva à comissão quando há saldo", () => {
    const inicio = ler("app/(app)/inicio/page.tsx");
    expect(inicio).toContain('href="/comissao"');
  });

  it("o Administrador cadastra as chaves Pix no próprio perfil (é para onde vai a comissão)", () => {
    const perfil = ler("app/(app)/perfil/[id]/page.tsx");
    expect(perfil).toContain("ChavesPix");
    expect(perfil).toMatch(/"admin"/);
  });
});

function componentesComissao(): string[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = new URL("components/comissao/", raiz);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => `components/comissao/${f}`);
}
