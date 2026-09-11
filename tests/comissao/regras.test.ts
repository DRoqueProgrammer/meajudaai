import { describe, it, expect } from "vitest";
import {
  mesValido,
  mesPorExtenso,
  intervaloDoMes,
  mesAnterior,
  numeroDoReciboMensal,
  numeroDaNotaAvulsa,
  lerPercentual,
  lerValorEmReais,
  valorDaComissao,
  resumoDoRecibo,
  diasDesde,
  estaAtrasado,
  valorPorExtenso,
} from "@/lib/comissao/regras";

/** Regras puras da comissão e dos recibos (D-044/D-047). */
describe("comissão · regras", () => {
  it("mês de referência", () => {
    expect(mesValido("2026-09")).toBe(true);
    expect(mesValido("2026-13")).toBe(false);
    expect(mesValido("2026-9")).toBe(false);
    expect(mesPorExtenso("2026-09")).toBe("setembro de 2026");
    expect(intervaloDoMes("2026-02")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
    expect(intervaloDoMes("2028-02").fim).toBe("2028-02-29");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesAnterior("2026-10")).toBe("2026-09");
  });

  it("números dos recibos", () => {
    expect(numeroDoReciboMensal("ab12cd34-0000-4000-8000-000000000000", "2026-09")).toBe("CM-202609-AB12CD34");
    expect(numeroDaNotaAvulsa(42)).toBe("000042");
  });

  it("lê a alíquota digitada, com teto de 50%", () => {
    expect(lerPercentual("8")).toBe(8);
    expect(lerPercentual("7,5")).toBe(7.5);
    expect(lerPercentual("10.25")).toBe(10.25);
    expect(lerPercentual("0")).toBe(0);
    expect(lerPercentual("50")).toBe(50);
    expect(lerPercentual("51")).toBeNull();
    expect(lerPercentual("-1")).toBeNull();
    expect(lerPercentual("")).toBeNull();
    expect(lerPercentual("abc")).toBeNull();
  });

  it("lê valor em reais, só positivo", () => {
    expect(lerValorEmReais("6,99")).toBe(6.99);
    expect(lerValorEmReais("1.250,50")).toBe(1250.5);
    expect(lerValorEmReais("R$ 49,90")).toBe(49.9);
    expect(lerValorEmReais("49.9")).toBe(49.9);
    expect(lerValorEmReais("0")).toBeNull();
    expect(lerValorEmReais("-5")).toBeNull();
    expect(lerValorEmReais("dez")).toBeNull();
  });

  it("comissão arredondada em centavos, como o gatilho do banco", () => {
    expect(valorDaComissao(200, 1.5)).toBe(3);
    expect(valorDaComissao(170, 8)).toBe(13.6);
    expect(valorDaComissao(85, 7.5)).toBe(6.38);
  });

  it("resumo do recibo: totais, taxa média ponderada, confirmado e pendente", () => {
    const r = resumoDoRecibo([
      { base: 200, percentual: 10, valor: 20, status: "paga" },
      { base: 100, percentual: 5, valor: 5, status: "em_aberto" },
      { base: 0.1, percentual: 10, valor: 0.01, status: "informada" },
    ]);
    expect(r.quantidade).toBe(3);
    expect(r.totalServicos).toBe(300.1);
    expect(r.totalComissao).toBe(25.01);
    expect(r.taxaMedia).toBe(8.33);
    expect(r.confirmado).toBe(20);
    expect(r.pendente).toBe(5.01);
    expect(resumoDoRecibo([])).toEqual({ quantidade: 0, totalServicos: 0, totalComissao: 0, taxaMedia: 0, confirmado: 0, pendente: 0 });
  });

  it("atraso de 7 dias só a partir do mais antigo em aberto", () => {
    expect(diasDesde("2026-09-01T12:00:00Z", "2026-09-08T12:00:00Z")).toBe(7);
    expect(diasDesde("2026-09-10T00:00:00Z", "2026-09-01T00:00:00Z")).toBe(0);
    expect(estaAtrasado("2026-09-01T12:00:00Z", "2026-09-08T12:00:00Z")).toBe(true);
    expect(estaAtrasado("2026-09-02T12:00:00Z", "2026-09-08T12:00:00Z")).toBe(false);
    expect(estaAtrasado(null)).toBe(false);
  });

  it("valor por extenso, com o 'e' onde o português pede", () => {
    expect(valorPorExtenso(1)).toBe("um real");
    expect(valorPorExtenso(6.99)).toBe("seis reais e noventa e nove centavos");
    expect(valorPorExtenso(0.01)).toBe("um centavo");
    expect(valorPorExtenso(1250.5)).toBe("mil duzentos e cinquenta reais e cinquenta centavos");
    expect(valorPorExtenso(1100)).toBe("mil e cem reais");
    expect(valorPorExtenso(1050)).toBe("mil e cinquenta reais");
    expect(valorPorExtenso(2345)).toBe("dois mil trezentos e quarenta e cinco reais");
    expect(valorPorExtenso(100)).toBe("cem reais");
    expect(valorPorExtenso(1000000)).toBe("um milhão de reais");
    expect(valorPorExtenso(0)).toBe("zero real");
  });
});
