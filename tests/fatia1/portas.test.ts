import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as seguranca from "@/lib/seguranca";

/**
 * Gabarito da tarefa 10 da Fatia 1 — R-52.
 *
 * As duas portas automáticas resistem a abuso barato. Contrato da tarefa:
 * - `lib/seguranca.ts` exporta `segredoConfere(cabecalho, segredo)`: verdadeiro só se
 *   o cabeçalho for exatamente `Bearer <segredo>` com segredo não vazio, comparando em
 *   tempo constante (`timingSafeEqual`); a rota do agendador passa a usá-la;
 * - a busca de endereço aceita no máximo 10 pedidos por pessoa a cada 60 segundos,
 *   pelo `rateLimit` que o projeto já tem.
 */

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · portas automáticas contra abuso barato", () => {
  it("o segredo certo passa", () => {
    expect(seguranca.segredoConfere("Bearer abc123", "abc123")).toBe(true);
  });

  it("segredo errado de mesmo tamanho não passa", () => {
    expect(seguranca.segredoConfere("Bearer abc124", "abc123")).toBe(false);
  });

  it("segredo de outro tamanho não passa (e não quebra)", () => {
    expect(seguranca.segredoConfere("Bearer abc", "abc123")).toBe(false);
    expect(seguranca.segredoConfere("Bearer abc1234567", "abc123")).toBe(false);
  });

  it("sem cabeçalho, ou sem segredo configurado, nunca passa", () => {
    expect(seguranca.segredoConfere(null, "abc123")).toBe(false);
    expect(seguranca.segredoConfere("Bearer ", "")).toBe(false);
    expect(seguranca.segredoConfere("Bearer undefined", undefined)).toBe(false);
  });

  it("a comparação é em tempo constante", () => {
    expect(leitura("lib/seguranca.ts")).toMatch(/timingSafeEqual/);
  });

  it("a rota do agendador usa a conferência nova", () => {
    const rota = leitura("app/api/cron/lembretes-avaliacao/route.ts");
    expect(rota).toMatch(/segredoConfere/);
    expect(rota).not.toMatch(/===\s*`Bearer/);
  });

  it("a busca de endereço tem limite de 10 por minuto por pessoa", () => {
    expect(leitura("lib/actions/geocode.ts")).toMatch(/rateLimit\([^)]*,\s*10\s*,\s*60[_]?000\s*\)/);
  });
});
