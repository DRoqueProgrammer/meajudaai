import { describe, it, expect } from "vitest";
import {
  PERIODOS,
  QUANDOS,
  isQuando,
  jaPassou,
  rangeDoPeriodo,
  rangeDoQuando,
  type Quando,
} from "../lib/periodo";

// Completa o que faltava em lib/periodo.ts. Todos os testes fixam "hoje" por
// parâmetro, nunca usam a data corrente: um teste de data que depende de quando
// roda quebra sozinho na virada do mês, e aí ninguém confia mais na suíte.

const HOJE = new Date(2026, 8, 9); // 09/09/2026 — meio do mês, meio do ano

describe("isQuando", () => {
  it("aceita os três valores válidos", () => {
    for (const v of ["hoje", "amanha", "semana"]) expect(isQuando(v)).toBe(true);
  });

  it("recusa qualquer outra coisa vinda da URL", () => {
    // O type guard existe para não confiar no query param.
    for (const v of ["ontem", "", "HOJE", undefined]) expect(isQuando(v)).toBe(false);
  });
});

describe("rangeDoQuando", () => {
  it("hoje é um intervalo de um dia só", () => {
    expect(rangeDoQuando("hoje", HOJE)).toEqual({ desde: "2026-09-09", ate: "2026-09-09" });
  });

  it("amanhã pula o dia corrente inteiro", () => {
    expect(rangeDoQuando("amanha", HOJE)).toEqual({ desde: "2026-09-10", ate: "2026-09-10" });
  });

  it("semana são os próximos 7 dias, não a semana do calendário", () => {
    // Quem procura diária na sexta quer saber do sábado, não que a semana acabou.
    expect(rangeDoQuando("semana", HOJE)).toEqual({ desde: "2026-09-09", ate: "2026-09-16" });
  });

  it("atravessa a virada de mês sem estourar o dia", () => {
    const fimDoMes = new Date(2026, 8, 30); // 30/09
    expect(rangeDoQuando("amanha", fimDoMes)).toEqual({ desde: "2026-10-01", ate: "2026-10-01" });
  });

  it("atravessa a virada de ano", () => {
    const reveillon = new Date(2026, 11, 31);
    expect(rangeDoQuando("amanha", reveillon).desde).toBe("2027-01-01");
  });

  it("cobre todos os valores do catálogo, sem sobrar nenhum sem intervalo", () => {
    for (const q of QUANDOS) {
      const r = rangeDoQuando(q.value as Quando, HOJE);
      expect(r.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.ate >= r.desde).toBe(true);
    }
  });
});

describe("rangeDoPeriodo", () => {
  it("mês é do dia 1 ao último dia do mês corrente", () => {
    expect(rangeDoPeriodo("mes", HOJE)).toEqual({ desde: "2026-09-01", ate: "2026-09-30" });
  });

  it("3 meses volta dois meses e fecha no fim do mês corrente", () => {
    expect(rangeDoPeriodo("3meses", HOJE)).toEqual({ desde: "2026-07-01", ate: "2026-09-30" });
  });

  it("3 meses atravessa a virada de ano para trás", () => {
    const janeiro = new Date(2026, 0, 15);
    expect(rangeDoPeriodo("3meses", janeiro)).toEqual({ desde: "2025-11-01", ate: "2026-01-31" });
  });

  it("ano é 1º de janeiro a 31 de dezembro", () => {
    expect(rangeDoPeriodo("ano", HOJE)).toEqual({ desde: "2026-01-01", ate: "2026-12-31" });
  });

  it("tudo não filtra nada", () => {
    expect(rangeDoPeriodo("tudo", HOJE)).toEqual({ desde: null, ate: null });
  });

  it("acerta o último dia de fevereiro em ano bissexto", () => {
    expect(rangeDoPeriodo("mes", new Date(2024, 1, 10)).ate).toBe("2024-02-29");
    expect(rangeDoPeriodo("mes", new Date(2026, 1, 10)).ate).toBe("2026-02-28");
  });

  it("cobre todos os valores do catálogo", () => {
    for (const p of PERIODOS) {
      const r = rangeDoPeriodo(p.value, HOJE);
      if (p.value === "tudo") expect(r.desde).toBeNull();
      else expect(r.ate! >= r.desde!).toBe(true);
    }
  });
});

describe("jaPassou", () => {
  it("libera quando não há data — vaga antiga do seed não tem o que esperar", () => {
    expect(jaPassou(null, HOJE)).toBe(true);
  });

  it("libera no próprio dia do serviço", () => {
    expect(jaPassou("2026-09-09", HOJE)).toBe(true);
  });

  it("libera para data passada e segura para data futura", () => {
    expect(jaPassou("2026-09-08", HOJE)).toBe(true);
    expect(jaPassou("2026-09-10", HOJE)).toBe(false);
  });

  it("usa data local, não UTC — à noite no Brasil o UTC já virou o dia seguinte", () => {
    // 23:30 de 09/09 em horário local: ainda é dia 9, e um serviço do dia 10
    // não pode liberar "Avaliar" só porque em Londres já amanheceu.
    const noiteBrasileira = new Date(2026, 8, 9, 23, 30);
    expect(jaPassou("2026-09-10", noiteBrasileira)).toBe(false);
    expect(jaPassou("2026-09-09", noiteBrasileira)).toBe(true);
  });
});
