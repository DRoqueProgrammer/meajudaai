import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito do LOTE P — Financeiro do prestador (D-048), escrito pelo controller
 * antes da implementação. Prontos: migration 0059 (recebimentos,
 * emite_nota_fiscal), lib/financeiro/{matriz,avisos}.ts,
 * components/financeiro/{matriz-financeira,filtros-financeiro}.tsx,
 * lib/actions/recebimentos.ts. Leonardo: "clientes × meses; cada serviço
 * realizado entra no mês; no hover uma linha por serviço e gerar recibo com o
 * nome e embaixo a função; não vale como nota fiscal; a Me Ajuda Aí não se
 * responsabiliza; gera e manda pelo WhatsApp; o cliente não vê no app; emite
 * nota fiscal sim/não no perfil".
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const existe = (c: string) => existsSync(new URL(c, raiz));
const PAGINA = "app/(app)/meu-financeiro/page.tsx";
const RECIBO = "app/(documento)/recibo/recebimento/[id]/page.tsx";

describe("Lote P · Financeiro do prestador", () => {
  it("a aba existe, é só do prestador e lê pela sessão", () => {
    expect(existe(PAGINA)).toBe(true);
    const src = ler(PAGINA);
    expect(src).toMatch(/role !== "prestador_servico"/);
    expect(src).toContain("createServerClient");
    expect(src).not.toContain("createAdminClient");
  });

  it("grade clientes × meses com o ✓/✗ de recebido e filtros na URL", () => {
    const src = ler(PAGINA);
    expect(src).toContain("MatrizFinanceira");
    expect(src).toContain("montarMatriz");
    expect(src).toContain("alternarRecebidoAction");
    expect(src).toMatch(/rotuloPessoa="Cliente"/);
    expect(src).toContain("FiltrosFinanceiro");
    expect(src).toContain("lerAno");
    expect(src).toContain("filtrarMatriz");
    expect(src).toContain('"recebimentos"');
  });

  it("recebimento avulso e a comissão da plataforma a um clique", () => {
    const tudo = [PAGINA, ...componentes()].map(ler).join("\n");
    expect(tudo).toContain("criarRecebimentoAvulsoAction");
    expect(tudo).toContain('href="/comissao"');
  });

  it("o recibo: sessão do próprio prestador, nome e função, sem valor fiscal, marketplace, WhatsApp", () => {
    expect(existe(RECIBO)).toBe(true);
    const src = ler(RECIBO);
    expect(src).toContain("createServerClient");
    expect(src).toContain("notFound");
    expect(src).toContain("AVISO_SEM_VALOR_FISCAL");
    expect(src).toContain("AVISO_MARKETPLACE");
    expect(src).toContain("valorPorExtenso");
    const tudo = src + componentesRecibo().map(ler).join("\n");
    expect(tudo).toMatch(/WhatsApp/);
    expect(tudo).toMatch(/navigator\.share/);
  });

  it("o menu do prestador tem Financeiro", () => {
    expect(ler("components/nav.tsx")).toContain('"/meu-financeiro"');
  });

  it("perfil: o prestador marca se emite nota fiscal e o cliente vê sim/não", () => {
    const tudo = ler("components/perfil-form.tsx") + ler("app/(app)/perfil/[id]/page.tsx");
    expect(tudo).toContain("emite_nota_fiscal");
    expect(ler("app/(app)/perfil/[id]/page.tsx")).toContain("rotuloNotaFiscal");
  });

  it("o cliente não vê recibo do prestador no app", () => {
    expect(ler("app/(app)/meus-servicos/page.tsx")).not.toContain("/recibo/recebimento/");
  });

  it("nada fala em pilantragem", () => {
    for (const f of [PAGINA, RECIBO]) expect(ler(f), f).not.toMatch(/pilantr/i);
  });
});

function listar(pasta: string): string[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  if (!existe(pasta)) return [];
  return readdirSync(new URL(pasta, raiz)).filter((f) => f.endsWith(".tsx")).map((f) => `${pasta}${f}`);
}
const componentes = () => listar("components/financeiro/");
const componentesRecibo = () => listar("components/recibo/");
