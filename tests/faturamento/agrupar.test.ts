import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { agruparFaturamento, type ServicoFaturado } from "@/lib/faturamento";

/**
 * Gabarito do gráfico de faturamento do prestador (escrito pelo controller
 * antes da implementação). Decisão do Leonardo em 10/09/2026: barras
 * empilhadas por tipo de serviço, filtro de período (padrão 15 dias; 30, 60,
 * 90, este ano, último ano), agrupado por semana por padrão, e um card no
 * hover com o total por tipo (ordem alfabética) e por dia.
 *
 * Regras: faturamento = soma de preco_valor dos serviços REALIZADOS, na data
 * do horário. Janela de N dias = hoje e os N-1 dias anteriores; "este ano" =
 * de 1º de janeiro até hoje; "último ano" = os últimos 365 dias. Semana começa
 * na segunda-feira e a primeira/última barra é cortada pela janela. Todo dia,
 * semana ou mês da janela vira uma barra, mesmo zerada.
 */
const HOJE = "2026-09-10"; // quinta-feira; 2026-09-07 é segunda
const servicos: ServicoFaturado[] = [
  { data: "2026-09-10", valor: 100, tipo: "instalacao_eletrica", clienteId: "a" },
  { data: "2026-09-08", valor: 50, tipo: "instalacao_varal", clienteId: "b" },
  { data: "2026-09-07", valor: 30, tipo: "instalacao_eletrica", clienteId: "a" },
  { data: "2026-08-27", valor: 999, tipo: "outros", clienteId: "c" },
  { data: "2026-08-26", valor: 7, tipo: "outros", clienteId: "c" },
];

describe("agruparFaturamento", () => {
  it("15 dias por semana: janela de hoje e 14 dias atrás, semanas de segunda cortadas", () => {
    const r = agruparFaturamento(servicos, { periodo: "15d", agrupamento: "semana", hoje: HOJE });
    expect(r.inicio).toBe("2026-08-27");
    expect(r.fim).toBe(HOJE);
    expect(r.total).toBe(1179);
    expect(r.numServicos).toBe(4);
    expect(r.barras.map((b) => [b.inicio, b.fim, b.total])).toEqual([
      ["2026-08-27", "2026-08-30", 999],
      ["2026-08-31", "2026-09-06", 0],
      ["2026-09-07", "2026-09-10", 180],
    ]);
    const ultima = r.barras[2]!;
    expect(ultima.porTipo).toEqual({ instalacao_eletrica: 130, instalacao_varal: 50 });
    expect(ultima.porDia).toEqual([
      { data: "2026-09-07", total: 30 },
      { data: "2026-09-08", total: 50 },
      { data: "2026-09-10", total: 100 },
    ]);
  });

  it("por dia: uma barra por dia da janela, mesmo zerada", () => {
    const r = agruparFaturamento(servicos, { periodo: "15d", agrupamento: "dia", hoje: HOJE });
    expect(r.barras).toHaveLength(15);
    expect(r.barras[14]!.total).toBe(100);
    expect(r.barras[1]!.total).toBe(0);
  });

  it("30 dias por mês: meses cortados pela janela", () => {
    const r = agruparFaturamento(servicos, { periodo: "30d", agrupamento: "mes", hoje: HOJE });
    expect(r.inicio).toBe("2026-08-12");
    expect(r.barras.map((b) => [b.inicio, b.fim, b.total])).toEqual([
      ["2026-08-12", "2026-08-31", 1006],
      ["2026-09-01", "2026-09-10", 180],
    ]);
  });

  it("este ano vai de 1º de janeiro; último ano são 365 dias", () => {
    expect(agruparFaturamento(servicos, { periodo: "ytd", agrupamento: "mes", hoje: HOJE }).inicio).toBe("2026-01-01");
    expect(agruparFaturamento(servicos, { periodo: "12m", agrupamento: "mes", hoje: HOJE }).inicio).toBe("2025-09-11");
    expect(agruparFaturamento(servicos, { periodo: "ytd", agrupamento: "mes", hoje: HOJE }).total).toBe(1186);
  });
});

describe("Gráfico de faturamento · tela", () => {
  const ler = (c: string) => readFileSync(new URL(`../../${c}`, import.meta.url), "utf8");

  it("tem os filtros de período pedidos", () => {
    const g = ler("components/dashboard/grafico-faturamento.tsx");
    for (const r of ["15 dias", "30 dias", "60 dias", "90 dias", "Este ano", "Último ano"]) expect(g).toContain(r);
  });

  it("o card do hover fecha ao clicar fora e com Esc", () => {
    const g = ler("components/dashboard/grafico-faturamento.tsx");
    expect(g).toMatch(/pointerdown|mousedown/);
    expect(g).toMatch(/Escape/);
  });

  it("o cliente escolhe o tipo ao agendar e o prestador recategoriza", () => {
    expect(ler("lib/actions/agenda-v2.ts")).toMatch(/tipo/);
    expect(ler("lib/actions/servico-tipo.ts")).toMatch(/export async function recategorizarServicoAction\(/);
  });
});
