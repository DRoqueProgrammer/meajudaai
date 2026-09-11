import { describe, it, expect } from "vitest";
import { destinoSeguro } from "@/lib/destino-seguro";

describe("destinoSeguro", () => {
  it("aceita caminho interno, com query", () => {
    expect(destinoSeguro("/perfil/abc")).toBe("/perfil/abc");
    expect(destinoSeguro("/agenda?dia=2026-09-10")).toBe("/agenda?dia=2026-09-10");
  });

  it("recusa o que levaria para fora do app", () => {
    for (const ruim of ["https://mal.example", "//mal.example", String.raw`/\mal.example`, "javascript:alert(1)", "/\njavascript:x", "perfil/abc"]) {
      expect(destinoSeguro(ruim)).toBe("/inicio");
    }
  });

  it("vazio ou tela de entrada cai no padrão", () => {
    expect(destinoSeguro(null)).toBe("/inicio");
    expect(destinoSeguro("")).toBe("/inicio");
    expect(destinoSeguro("/login")).toBe("/inicio");
    expect(destinoSeguro("/cadastro?x=1")).toBe("/inicio");
  });
});
