import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as textos from "@/lib/convite-texto";

/**
 * Gabarito da tarefa 9 da Fatia 1 — R-51.
 *
 * Convidar alguém para a equipe não revela se um e-mail tem conta. Contrato da tarefa:
 * `lib/convite-texto.ts` exporta `MENSAGEM_CONVITE_NEUTRA`, e `convidarMembroAction`
 * devolve essa mesma mensagem tanto para e-mail cadastrado quanto para não cadastrado.
 * (A mensagem mora fora do arquivo "use server" porque ele só pode exportar funções.)
 */

const acao = () => readFileSync(new URL("../../lib/actions/workspace.ts", import.meta.url), "utf8");

describe("Fatia 1 · o convite não revela quem tem conta", () => {
  it("existe uma mensagem neutra", () => {
    expect(typeof textos.MENSAGEM_CONVITE_NEUTRA).toBe("string");
    expect(textos.MENSAGEM_CONVITE_NEUTRA.trim().length).toBeGreaterThan(10);
  });

  it("a mensagem neutra não afirma nem nega que a conta existe", () => {
    const m = textos.MENSAGEM_CONVITE_NEUTRA.toLowerCase();
    expect(m).not.toMatch(/nenhum usu[aá]rio|n[aã]o existe|j[aá] faz parte|n[aã]o encontrad/);
  });

  it("as respostas que revelavam a conta sumiram", () => {
    const codigo = acao();
    expect(codigo).not.toMatch(/Nenhum usuário com este e-mail/);
    expect(codigo).not.toMatch(/já faz parte da equipe/);
  });

  it("a action usa a mensagem neutra", () => {
    expect(acao()).toMatch(/MENSAGEM_CONVITE_NEUTRA/);
  });
});
