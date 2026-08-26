import { describe, it, expect } from "vitest";
import {
  resumoMarketplace,
  porGrupo,
  formatDuracaoHoras,
  pct,
  type VagaRow,
  type CandRow,
} from "../lib/metricas-marketplace";

// Duas vagas em Niterói (uma preenchida, uma cancelada) e uma em Cuiabá aberta
// sem candidato. Datas escolhidas para dar match de 24h na vaga preenchida.
const vagas: VagaRow[] = [
  { id: "v1", status: "finalizada", categoria: "ajudante_pedreiro", cidade: "Niterói", created_at: "2026-08-01T09:00:00Z" },
  { id: "v2", status: "cancelada", categoria: "ajudante_pintor", cidade: "Niterói", created_at: "2026-08-02T09:00:00Z" },
  { id: "v3", status: "aberta", categoria: "ajudante_pedreiro", cidade: "Cuiabá", created_at: "2026-08-03T09:00:00Z" },
];
const cands: CandRow[] = [
  { vaga_id: "v1", status: "recusado", created_at: "2026-08-01T20:00:00Z" },
  { vaga_id: "v1", status: "aceito", created_at: "2026-08-02T09:00:00Z" }, // +24h de v1
  { vaga_id: "v3", status: "aguardando", created_at: "2026-08-03T12:00:00Z" },
];

describe("resumoMarketplace", () => {
  it("conta preenchidas, canceladas e taxas", () => {
    const r = resumoMarketplace(vagas, cands);
    expect(r.totalVagas).toBe(3);
    expect(r.preenchidas).toBe(1); // só v1 tem candidatura aceita
    expect(r.canceladas).toBe(1); // v2
    expect(r.taxaPreenchimento).toBeCloseTo(1 / 3, 5);
    expect(r.taxaCancelamento).toBeCloseTo(1 / 3, 5);
  });

  it("calcula o tempo médio de match pela candidatura aceita mais antiga", () => {
    const r = resumoMarketplace(vagas, cands);
    expect(r.tempoMedioMatchHoras).toBeCloseTo(24, 5);
  });

  it("devolve tempo nulo quando ninguém foi aceito", () => {
    const r = resumoMarketplace([vagas[2]!], [cands[2]!]);
    expect(r.tempoMedioMatchHoras).toBeNull();
    expect(r.taxaPreenchimento).toBe(0);
  });

  it("não quebra com marketplace vazio", () => {
    const r = resumoMarketplace([], []);
    expect(r.taxaPreenchimento).toBe(0);
    expect(r.tempoMedioMatchHoras).toBeNull();
  });
});

describe("porGrupo", () => {
  it("agrupa por cidade ordenando por volume", () => {
    const g = porGrupo(vagas, cands, "cidade");
    expect(g.map((x) => x.chave)).toEqual(["Niterói", "Cuiabá"]);
    expect(g[0]).toMatchObject({ total: 2, preenchidas: 1 });
    expect(g[0]!.taxaPreenchimento).toBeCloseTo(0.5, 5);
  });

  it("agrupa por categoria", () => {
    const g = porGrupo(vagas, cands, "categoria");
    const pedreiro = g.find((x) => x.chave === "ajudante_pedreiro")!;
    expect(pedreiro.total).toBe(2); // v1 e v3
    expect(pedreiro.preenchidas).toBe(1); // só v1
  });
});

describe("formatadores", () => {
  it("formata duração em min/h/d", () => {
    expect(formatDuracaoHoras(null)).toBe("—");
    expect(formatDuracaoHoras(0.5)).toBe("30min");
    expect(formatDuracaoHoras(18)).toBe("18h");
    expect(formatDuracaoHoras(50)).toBe("2d 2h");
    expect(formatDuracaoHoras(48)).toBe("2d");
  });

  it("formata percentual inteiro", () => {
    expect(pct(0.427)).toBe("43%");
    expect(pct(0)).toBe("0%");
    expect(pct(1)).toBe("100%");
  });
});
