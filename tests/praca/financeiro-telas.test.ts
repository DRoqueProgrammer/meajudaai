import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito do LOTE F — aba Financeiro do Administrador, recibo mensal da
 * comissão, nota avulsa e assinatura (pedidos do Leonardo em 11/09/2026,
 * D-044/D-047). Escrito pelo controller antes da implementação. Banco,
 * actions, leituras e regras prontos: migrations 0057/0058,
 * lib/actions/{comissao,financeiro}.ts, lib/admin/financeiro.ts,
 * lib/comissao/regras.ts. Padrão do recibo portado de
 * refs/careconnect/app/(print)/print/recibo/[id]/page.tsx.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const existe = (c: string) => existsSync(new URL(c, raiz));

const FINANCEIRO = "app/(app)/praca/financeiro/page.tsx";
const RECIBO_MENSAL = "app/(documento)/recibo/comissao/[prestadorId]/[mes]/page.tsx";
const RECIBO_NOTA = "app/(documento)/recibo/nota/[id]/page.tsx";
const LAYOUT_DOC = "app/(documento)/layout.tsx";

describe("Lote F · Financeiro", () => {
  it("a aba existe, é só do Administrador e recortada pela praça ativa", () => {
    const src = ler(FINANCEIRO);
    expect(src).toContain("pracaAtivaDoAdmin");
    expect(src).toContain('atual="/praca/financeiro"');
    expect(src).toMatch(/role !== "admin"/);
    expect(src).toContain("SemPraca");
  });

  it("lê comissões, pagamentos, alíquotas e notas pela praça", () => {
    const src = ler(FINANCEIRO);
    for (const f of ["comissoesDaPraca", "pagamentosDaPraca", "aliquotasDaPraca", "notasAvulsasDaPraca", "saldosPorPrestador", "estaAtrasado"]) {
      expect(src, f).toContain(f);
    }
  });

  it("tem as ações: confirmar/recusar, registrar recebimento, alíquotas, nota avulsa e assinatura", () => {
    // As actions podem estar na página ou nos componentes que ela usa.
    const tudo = [FINANCEIRO, ...listarComponentesFinanceiro()].map(ler).join("\n");
    for (const a of ["decidirPagamentoAction", "registrarRecebimentoAction", "definirAliquotaAction", "criarNotaAvulsaAction", "salvarAssinaturaAction"]) {
      expect(tudo, a).toContain(a);
    }
    expect(tudo).toContain("Criar nota avulsa");
    expect(tudo).toMatch(/toDataURL\("image\/png"\)/);
    expect(tudo).toMatch(/<canvas/);
  });

  it("os recibos ficam numa rota sem o menu do app, que exige sessão", () => {
    expect(existe(LAYOUT_DOC)).toBe(true);
    const layout = ler(LAYOUT_DOC);
    expect(layout).not.toMatch(/components\/nav/);
    expect(layout).toMatch(/redirect\("\/login"\)/);
  });

  it("recibo mensal: serviços do mês, taxa média, confirmado, valor por extenso e assinatura", () => {
    const src = ler(RECIBO_MENSAL);
    expect(src).toContain("reciboMensal");
    expect(src).toContain("mesValido");
    expect(src).toContain("numeroDoReciboMensal");
    expect(src).toContain("valorPorExtenso");
    expect(src).toMatch(/taxaMedia/);
    expect(src).toMatch(/confirmado/);
    expect(src).toMatch(/assinatura/i);
  });

  it("recibo mensal: só o próprio prestador ou a administração que alcança a praça", () => {
    const src = ler(RECIBO_MENSAL);
    expect(src).toMatch(/user\.id === prestadorId|prestadorId === user\.id/);
    expect(src).toMatch(/pracaAlcancada|atorAlcanca/);
    expect(src).toContain("notFound");
  });

  it("nota avulsa: numerada, por extenso, e só a praça dela ou o prestador pagador veem", () => {
    const src = ler(RECIBO_NOTA);
    expect(src).toContain("notaAvulsaPorId");
    expect(src).toContain("numeroDaNotaAvulsa");
    expect(src).toContain("valorPorExtenso");
    expect(src).toMatch(/pracaAlcancada|atorAlcanca/);
    expect(src).toMatch(/prestadorId === user\.id|user\.id === nota\.prestadorId/);
  });

  it("impressão: barra com Imprimir / Salvar PDF, escondida no papel", () => {
    const docs = listarComponentesRecibo().map(ler).join("\n") + ler(RECIBO_MENSAL) + ler(RECIBO_NOTA);
    expect(docs).toMatch(/window\.print\(\)/);
    expect(docs).toMatch(/@media print/);
    expect(docs).toMatch(/Salvar PDF/);
  });

  it("nada fala em pilantragem no Financeiro", () => {
    for (const p of [FINANCEIRO, RECIBO_MENSAL, RECIBO_NOTA, ...listarComponentesFinanceiro()]) {
      expect(ler(p), p).not.toMatch(/pilantr/i);
    }
  });
});

function listarComponentesFinanceiro(): string[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = new URL("components/financeiro/", raiz);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => `components/financeiro/${f}`);
}

function listarComponentesRecibo(): string[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = new URL("components/recibo/", raiz);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => `components/recibo/${f}`);
}
