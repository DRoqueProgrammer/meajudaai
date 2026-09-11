import { describe, it, expect } from "vitest";
import {
  montarMatriz,
  estadoDaCelula,
  itemAtrasado,
  totais,
  totaisDaLinha,
  totaisDoMes,
  filtrarMatriz,
  anosDisponiveis,
  lerAno,
  lerSituacao,
  type ItemDaPessoa,
} from "@/lib/financeiro/matriz";
import { AVISO_SEM_VALOR_FISCAL, AVISO_MARKETPLACE, rotuloNotaFiscal } from "@/lib/financeiro/avisos";

/** A grade do Financeiro (D-048): pessoa × mês, estados, totais em centavos e filtros. */
const item = (p: string, nome: string, data: string, valor: number, estado: "ok" | "pendente" | "informado", id = `${p}-${data}`): ItemDaPessoa => ({
  id,
  pessoaId: p,
  pessoaNome: nome,
  data,
  titulo: "Serviço",
  valor,
  estado,
});

const ITENS: ItemDaPessoa[] = [
  item("m", "Marina", "2026-09-02", 180, "pendente"),
  item("m", "Marina", "2026-09-10", 170, "ok"),
  item("m", "Marina", "2026-08-06", 170, "ok"),
  item("a", "Ângela", "2026-09-09", 0.1, "pendente"),
  item("a", "Ângela", "2026-09-09", 0.2, "pendente", "a2"),
  item("z", "Zeca", "2025-12-20", 100, "pendente"),
];
const HOJE = "2026-09-11";

describe("financeiro · matriz", () => {
  it("uma linha por pessoa, só o ano pedido, em ordem alfabética, itens por data", () => {
    const m = montarMatriz(ITENS, 2026);
    expect(m.map((l) => l.nome)).toEqual(["Ângela", "Marina"]);
    const marina = m[1]!;
    expect(Object.keys(marina.meses).sort()).toEqual(["08", "09"]);
    expect(marina.meses["09"]!.map((i) => i.data)).toEqual(["2026-09-02", "2026-09-10"]);
    expect(montarMatriz(ITENS, 2025).map((l) => l.nome)).toEqual(["Zeca"]);
  });

  it("estado da célula: atraso (7 dias) vence, depois informada, parcial, pendente, ok", () => {
    const m = montarMatriz(ITENS, 2026);
    expect(estadoDaCelula(m[1]!.meses["09"], HOJE)).toBe("atrasada"); // 02/09 pendente há 9 dias
    expect(estadoDaCelula(m[1]!.meses["08"], HOJE)).toBe("ok");
    expect(estadoDaCelula(m[0]!.meses["09"], HOJE)).toBe("pendente"); // 09/09, só 2 dias
    expect(estadoDaCelula(undefined, HOJE)).toBe("vazia");
    const parcial = [item("x", "X", "2026-09-10", 10, "ok"), item("x", "X", "2026-09-10", 5, "pendente", "x2")];
    expect(estadoDaCelula(parcial, HOJE)).toBe("parcial");
    const informada = [item("x", "X", "2026-09-10", 10, "ok"), item("x", "X", "2026-09-10", 5, "informado", "x3")];
    expect(estadoDaCelula(informada, HOJE)).toBe("informada");
  });

  it("informado não conta como atraso; ok nunca atrasa", () => {
    expect(itemAtrasado({ estado: "informado", data: "2026-01-01" }, HOJE)).toBe(false);
    expect(itemAtrasado({ estado: "ok", data: "2026-01-01" }, HOJE)).toBe(false);
    expect(itemAtrasado({ estado: "pendente", data: "2026-09-04" }, HOJE)).toBe(true);
    expect(itemAtrasado({ estado: "pendente", data: "2026-09-05" }, HOJE)).toBe(false);
  });

  it("totais em centavos: célula, linha e coluna", () => {
    const m = montarMatriz(ITENS, 2026);
    expect(totais(m[0]!.meses["09"])).toEqual({ total: 0.3, recebido: 0, aReceber: 0.3 });
    expect(totaisDaLinha(m[1]!)).toEqual({ total: 520, recebido: 340, aReceber: 180 });
    expect(totaisDoMes(m, "09")).toEqual({ total: 350.3, recebido: 170, aReceber: 180.3 });
  });

  it("filtro por nome ignora acento e caixa", () => {
    const m = montarMatriz(ITENS, 2026);
    expect(filtrarMatriz(m, { busca: "angela" }, HOJE).map((l) => l.nome)).toEqual(["Ângela"]);
  });

  it("filtro por situação tira os itens de fora e as linhas vazias", () => {
    const m = montarMatriz(ITENS, 2026);
    const atrasadas = filtrarMatriz(m, { situacao: "atrasada" }, HOJE);
    expect(atrasadas.map((l) => l.nome)).toEqual(["Marina"]);
    expect(atrasadas[0]!.meses["09"]).toHaveLength(1);
    expect(atrasadas[0]!.meses["08"]).toBeUndefined();
    const ok = filtrarMatriz(m, { situacao: "ok" }, HOJE);
    expect(ok.map((l) => l.nome)).toEqual(["Marina"]);
    expect(filtrarMatriz(m, { situacao: "pendente" }, HOJE).map((l) => l.nome)).toEqual(["Ângela", "Marina"]);
  });

  it("anos e leitura da URL", () => {
    expect(anosDisponiveis(["2025-01-02", "2026-03-04"], 2026)).toEqual([2026, 2025]);
    expect(anosDisponiveis([], 2026)).toEqual([2026]);
    expect(lerAno("2025", 2026)).toBe(2025);
    expect(lerAno("abc", 2026)).toBe(2026);
    expect(lerAno("2099", 2026)).toBe(2026);
    expect(lerSituacao("atrasada")).toBe("atrasada");
    expect(lerSituacao("qualquer")).toBe("");
  });

  it("os avisos dos recibos dizem que não é nota fiscal e que a plataforma é marketplace", () => {
    expect(AVISO_SEM_VALOR_FISCAL).toMatch(/não tem valor fiscal/);
    expect(AVISO_SEM_VALOR_FISCAL).toMatch(/não substitui nota fiscal/);
    expect(AVISO_MARKETPLACE).toMatch(/marketplace/);
    expect(AVISO_MARKETPLACE).toMatch(/não se responsabiliza/);
    expect(rotuloNotaFiscal(true)).toBe("Emite nota fiscal: sim");
    expect(rotuloNotaFiscal(false)).toBe("Emite nota fiscal: não");
  });
});
