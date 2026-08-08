import { describe, it, expect } from "vitest";
import { agregarDemanda } from "../lib/demanda-agregada";

describe("agregarDemanda", () => {
  it("lista vazia → []", () => {
    expect(agregarDemanda([])).toEqual([]);
  });

  it("mesma categoria+cidade soma no total", () => {
    const r = agregarDemanda([
      { categoria: "ajudante_encanador", cidade: "Recife" },
      { categoria: "ajudante_encanador", cidade: "Recife" },
      { categoria: "ajudante_encanador", cidade: "Recife" },
    ]);
    expect(r).toEqual([{ categoria: "ajudante_encanador", cidade: "Recife", total: 3 }]);
  });

  it("mesma categoria em cidades diferentes conta separado", () => {
    const r = agregarDemanda([
      { categoria: "ajudante_pintor", cidade: "Recife" },
      { categoria: "ajudante_pintor", cidade: "Olinda" },
    ]);
    expect(r).toHaveLength(2);
    expect(r.every((d) => d.total === 1)).toBe(true);
  });

  it("ordena da maior demanda para a menor", () => {
    const r = agregarDemanda([
      { categoria: "ajudante_pedreiro", cidade: "Recife" },
      { categoria: "ajudante_encanador", cidade: "Recife" },
      { categoria: "ajudante_encanador", cidade: "Recife" },
    ]);
    expect(r[0]).toEqual({ categoria: "ajudante_encanador", cidade: "Recife", total: 2 });
    expect(r[1].total).toBe(1);
  });
});
