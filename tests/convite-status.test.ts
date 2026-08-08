import { describe, it, expect } from "vitest";
import { podeAceitar } from "../lib/convite-status";

const futuro = "2999-01-01T00:00:00Z";
const passado = "2000-01-01T00:00:00Z";

describe("podeAceitar", () => {
  it("pendente e não expirado → true", () => {
    expect(podeAceitar({ status: "pendente", expires_at: futuro }, new Date())).toBe(true);
  });
  it("pendente mas expirado → false", () => {
    expect(podeAceitar({ status: "pendente", expires_at: passado }, new Date())).toBe(false);
  });
  it("já aceito → false (single-use)", () => {
    expect(podeAceitar({ status: "aceito", expires_at: futuro }, new Date())).toBe(false);
  });
  it("aprovado → false", () => {
    expect(podeAceitar({ status: "aprovado", expires_at: futuro }, new Date())).toBe(false);
  });
});
