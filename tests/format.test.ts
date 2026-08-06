import { describe, it, expect } from "vitest";
import {
  formatBRL,
  formatData,
  formatHora,
  soDigitos,
  mascaraCPF,
  mascaraTelefone,
  iniciais,
} from "../lib/format";

describe("format", () => {
  it("formatBRL formata em reais", () => {
    const s = formatBRL(150).replace(/ /g, " ");
    expect(s).toContain("R$");
    expect(s).toContain("150,00");
  });

  it("formatData converte ISO -> dd/mm/aaaa", () => {
    expect(formatData("2026-05-22")).toBe("22/05/2026");
    expect(formatData(null)).toBe("");
  });

  it("formatHora corta segundos", () => {
    expect(formatHora("08:00:00")).toBe("08:00");
    expect(formatHora(null)).toBe("");
  });

  it("soDigitos remove não-dígitos", () => {
    expect(soDigitos("123.456-78")).toBe("12345678");
  });

  it("mascaraCPF aplica a máscara", () => {
    expect(mascaraCPF("12345678901")).toBe("123.456.789-01");
  });

  it("mascaraTelefone aplica a máscara", () => {
    expect(mascaraTelefone("21999998888")).toBe("(21) 99999-8888");
  });
});

describe("iniciais", () => {
  it("usa primeiro e último nome", () => {
    expect(iniciais("Ana Silva")).toBe("AS");
    expect(iniciais("João Carlos de Oliveira")).toBe("JO");
  });

  it("com um nome só, usa as duas primeiras letras", () => {
    expect(iniciais("Madonna")).toBe("MA");
  });

  it("aguenta espaço extra, string vazia e acento", () => {
    expect(iniciais("  Ana   Silva  ")).toBe("AS");
    expect(iniciais("")).toBe("?");
    expect(iniciais("   ")).toBe("?");
    expect(iniciais("Ángela Étienne")).toBe("ÁÉ");
  });
});
