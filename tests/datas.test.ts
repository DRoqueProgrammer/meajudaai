import { describe, it, expect } from "vitest";
import { dataEmSaoPaulo, horaEmSaoPaulo, somarDias, diaDaSemana } from "@/lib/datas";

describe("datas no fuso de São Paulo", () => {
  it("às 22h de Brasília ainda é o mesmo dia (em UTC já é o seguinte)", () => {
    const instante = new Date("2026-09-11T01:30:00Z"); // 22:30 de 10/09 em Brasília
    expect(dataEmSaoPaulo(instante)).toBe("2026-09-10");
    expect(horaEmSaoPaulo(instante)).toBe("22:30");
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-08-30", 3)).toBe("2026-09-02");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("dia da semana sem depender do fuso da máquina", () => {
    expect(diaDaSemana("2026-09-10")).toBe(4); // quinta
    expect(diaDaSemana("2026-09-06")).toBe(0); // domingo
  });
});
