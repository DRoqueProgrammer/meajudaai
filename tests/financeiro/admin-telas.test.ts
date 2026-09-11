import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * Gabarito do LOTE A — Financeiro do Administrador em grade (D-048), escrito
 * pelo controller antes da implementação. Prontos: migration 0059,
 * lib/financeiro/matriz.ts, components/financeiro/{matriz-financeira,
 * filtros-financeiro}.tsx, lib/actions/comissao.ts (alternarComissaoPagaAction,
 * marcarMesPagoAction). Leonardo: "prestadores × meses, quando devem de
 * comissão no mês tal; no hover, os serviços, valores e comissões % e valores,
 * com OK verdinho ou X vermelhinho; marcar o mês como pago; recibo de qualquer
 * serviço; só entradas; filtros".
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
const existe = (c: string) => existsSync(new URL(c, raiz));
const PAGINA = "app/(app)/praca/financeiro/page.tsx";
const RECIBO = "app/(documento)/recibo/comissao/[prestadorId]/[mes]/page.tsx";

describe("Lote A · Financeiro do Administrador", () => {
  it("continua só do Administrador, recortado pela praça ativa", () => {
    const src = ler(PAGINA);
    expect(src).toContain("pracaAtivaDoAdmin");
    expect(src).toMatch(/role !== "admin"/);
    expect(src).toContain('atual="/praca/financeiro"');
  });

  it("a grade prestadores × meses, com o OK por serviço e o mês pago", () => {
    const src = ler(PAGINA);
    expect(src).toContain("MatrizFinanceira");
    expect(src).toContain("montarMatriz");
    expect(src).toContain("alternarComissaoPagaAction");
    expect(src).toMatch(/marcarMesPagoAction\.bind\(null,/);
    expect(src).toMatch(/rotuloPessoa="Prestador"/);
  });

  it("filtros na URL: ano, situação, prestador, tipo e busca, aplicados no servidor", () => {
    const src = ler(PAGINA);
    expect(src).toContain("FiltrosFinanceiro");
    expect(src).toContain("lerAno");
    expect(src).toContain("lerSituacao");
    expect(src).toContain("filtrarMatriz");
    expect(src).toMatch(/searchParams/);
  });

  it("sub-abas pela URL: entradas, pendências, recibos e ajustes", () => {
    const src = ler(PAGINA);
    expect(src).toMatch(/aba/);
    for (const a of ["Entradas", "Pendências", "Recibos", "Ajustes"]) expect(src, a).toContain(a);
  });

  it("entradas do workspace: comissões pagas e notas avulsas, com total", () => {
    const tudo = [PAGINA, ...componentes()].map(ler).join("\n");
    expect(tudo).toContain("notasAvulsasDaPraca");
    expect(tudo).toMatch(/paga_em|pagaEm/);
    expect(tudo).toContain("Criar nota avulsa");
  });

  it("o recibo aceita um serviço só (?servico=) e diz que não tem valor fiscal", () => {
    const src = ler(RECIBO);
    expect(src).toMatch(/servico/);
    expect(src).toContain("AVISO_SEM_VALOR_FISCAL");
    expect(ler("app/(documento)/recibo/nota/[id]/page.tsx")).toContain("AVISO_SEM_VALOR_FISCAL");
  });

  it("as leituras novas da praça ficam em módulo server-only e o item da grade leva a comissão e a taxa", () => {
    const fin = ler("lib/admin/financeiro.ts");
    expect(fin).toMatch(/import\s+["']server-only["']/);
    expect(fin).toMatch(/pagaEm/);
  });

  it("nada fala em pilantragem", () => {
    for (const f of [PAGINA, ...componentes()]) expect(ler(f), f).not.toMatch(/pilantr/i);
  });
});

function componentes(): string[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = new URL("components/financeiro/", raiz);
  if (!existe("components/financeiro/")) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => `components/financeiro/${f}`);
}
