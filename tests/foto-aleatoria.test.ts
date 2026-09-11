import { describe, it, expect } from "vitest";
import { fotoAleatoria } from "@/lib/foto-aleatoria";

describe("fotoAleatoria", () => {
  const id = "7cda5408-834c-491b-98fc-e3b9c84b0ee4";

  it("respeita o gênero cadastrado", () => {
    expect(fotoAleatoria(id, "feminino")).toMatch(/^https:\/\/randomuser\.me\/api\/portraits\/women\/\d{1,2}\.jpg$/);
    expect(fotoAleatoria(id, "masculino")).toMatch(/^https:\/\/randomuser\.me\/api\/portraits\/men\/\d{1,2}\.jpg$/);
  });

  it("é a mesma foto para a mesma pessoa", () => {
    expect(fotoAleatoria(id, null)).toBe(fotoAleatoria(id, null));
    expect(fotoAleatoria(id, "outro")).toBe(fotoAleatoria(id, undefined));
  });

  it("espalha pessoas diferentes por fotos diferentes", () => {
    const fotos = new Set(Array.from({ length: 40 }, (_, i) => fotoAleatoria(`pessoa-${i}`, "feminino")));
    expect(fotos.size).toBeGreaterThan(25);
  });
});
