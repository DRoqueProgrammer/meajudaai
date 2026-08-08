import { describe, it, expect } from "vitest";
import { diasEmConflito } from "../lib/agenda-conflitos";

describe("diasEmConflito", () => {
  it("marca dia com 2+ diárias", () => {
    const c = diasEmConflito(
      [{ data: "2026-08-10" }, { data: "2026-08-10" }, { data: "2026-08-11" }],
      [],
    );
    expect(c.has("2026-08-10")).toBe(true);
    expect(c.has("2026-08-11")).toBe(false);
  });

  it("marca diária que cai em dia bloqueado", () => {
    const c = diasEmConflito([{ data: "2026-08-12" }], ["2026-08-12"]);
    expect(c.has("2026-08-12")).toBe(true);
  });

  it("bloqueio sem diária não é conflito", () => {
    const c = diasEmConflito([{ data: "2026-08-13" }], ["2026-08-20"]);
    expect(c.size).toBe(0);
  });

  it("uma diária num dia livre não é conflito", () => {
    const c = diasEmConflito([{ data: "2026-08-14" }], []);
    expect(c.size).toBe(0);
  });

  it("ignora diárias sem data", () => {
    const c = diasEmConflito([{ data: null }, { data: null }], []);
    expect(c.size).toBe(0);
  });
});
