import { describe, it, expect } from "vitest";
import { rangeDoQuando, isQuando, QUANDOS, jaPassou } from "../lib/periodo";

// Quarta-feira, 15/07/2026, meio-dia — data fixa para o range não depender de
// quando o teste roda.
const QUARTA = new Date(2026, 6, 15, 12, 0, 0);

describe("rangeDoQuando", () => {
  it("hoje é um único dia", () => {
    expect(rangeDoQuando("hoje", QUARTA)).toEqual({ desde: "2026-07-15", ate: "2026-07-15" });
  });

  it("amanhã é um único dia, o seguinte", () => {
    expect(rangeDoQuando("amanha", QUARTA)).toEqual({ desde: "2026-07-16", ate: "2026-07-16" });
  });

  // "Esta semana" são os próximos 7 dias, não a semana do calendário: quem
  // procura diária na sexta quer saber do sábado, não que a semana acabou.
  it("esta semana são os próximos 7 dias a partir de hoje", () => {
    expect(rangeDoQuando("semana", QUARTA)).toEqual({ desde: "2026-07-15", ate: "2026-07-22" });
  });

  it("atravessa a virada do mês sem quebrar", () => {
    const dia29 = new Date(2026, 6, 29, 12, 0, 0);
    expect(rangeDoQuando("semana", dia29)).toEqual({ desde: "2026-07-29", ate: "2026-08-05" });
    expect(rangeDoQuando("amanha", new Date(2026, 6, 31, 12, 0, 0))).toEqual({
      desde: "2026-08-01",
      ate: "2026-08-01",
    });
  });

  // Fuso: `toISOString()` de uma data local à noite volta o dia seguinte em
  // UTC-3. O range precisa ser sempre a data local.
  it("não escorrega de dia à noite (UTC-3)", () => {
    const quaseMeiaNoite = new Date(2026, 6, 15, 23, 30, 0);
    expect(rangeDoQuando("hoje", quaseMeiaNoite).desde).toBe("2026-07-15");
  });

  it("todo valor oferecido na UI é um Quando válido", () => {
    for (const q of QUANDOS) expect(isQuando(q.value)).toBe(true);
    expect(isQuando("mes")).toBe(false);
    expect(isQuando(undefined)).toBe(false);
  });
});

describe("jaPassou", () => {
  const hoje = new Date(2026, 6, 15, 12, 0, 0);

  // Decide quando "Avaliar" e "Concluir" aparecem. Liberar cedo demais deixa
  // alguém avaliar um serviço que não aconteceu — e nota é a moeda do produto.
  it("libera no dia do serviço e depois", () => {
    expect(jaPassou("2026-07-15", hoje)).toBe(true);
    expect(jaPassou("2026-07-14", hoje)).toBe(true);
  });

  it("bloqueia enquanto a diária é futura", () => {
    expect(jaPassou("2026-07-16", hoje)).toBe(false);
    expect(jaPassou("2026-12-01", hoje)).toBe(false);
  });

  it("sem data, libera (vagas antigas do seed)", () => {
    expect(jaPassou(null, hoje)).toBe(true);
  });

  // O bug que existia em /agenda: toISOString() às 23h30 em BRT devolve o dia
  // seguinte, e a diária de hoje seria tratada como passada.
  it("usa data local, não UTC, à noite", () => {
    const quaseMeiaNoite = new Date(2026, 6, 15, 23, 30, 0);
    expect(jaPassou("2026-07-16", quaseMeiaNoite)).toBe(false);
    expect(jaPassou("2026-07-15", quaseMeiaNoite)).toBe(true);
  });
});
