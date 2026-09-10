import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as ativa from "@/lib/auth/praca-ativa";

/**
 * Gabarito da tarefa 6 da Fatia 1 — R-48 e R-49 (ADR 0013; decisão D-016).
 *
 * O Administrador enxerga só as praças às quais o SysAdmin o vinculou, entra na praça
 * padrão, e só vê seletor com duas ou mais. Contrato da tarefa: `lib/auth/praca-ativa.ts`
 * exporta —
 * - `mostrarSeletorDePraca(quantidade)`: verdadeiro só com 2 ou mais;
 * - `escolherPracaAtiva(lista, cookie)`: a do cookie, se for uma das dele; senão a
 *   padrão; senão a primeira; lista vazia → null. Cada item traz `workspace_id` e
 *   `padrao`.
 * O layout usa a primeira; `getActiveWorkspace` usa a segunda; o seletor deixa de
 * criar e de excluir praça (isso passou a ser do SysAdmin).
 */

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · o Administrador vê só as praças dele", () => {
  it("com 0 ou 1 praça, nenhum seletor", () => {
    expect(ativa.mostrarSeletorDePraca(0)).toBe(false);
    expect(ativa.mostrarSeletorDePraca(1)).toBe(false);
  });

  it("com 2 ou mais, um seletor", () => {
    expect(ativa.mostrarSeletorDePraca(2)).toBe(true);
    expect(ativa.mostrarSeletorDePraca(7)).toBe(true);
  });

  const lista = [
    { workspace_id: "a", padrao: false },
    { workspace_id: "b", padrao: true },
    { workspace_id: "c", padrao: false },
  ];

  it("vale a praça do cookie quando ela é uma das dele", () => {
    expect(ativa.escolherPracaAtiva(lista, "c")?.workspace_id).toBe("c");
  });

  it("cookie de praça alheia cai na padrão", () => {
    expect(ativa.escolherPracaAtiva(lista, "z")?.workspace_id).toBe("b");
  });

  it("sem cookie, vale a padrão", () => {
    expect(ativa.escolherPracaAtiva(lista, undefined)?.workspace_id).toBe("b");
  });

  it("sem padrão marcada, vale a primeira", () => {
    const semPadrao = lista.map((p) => ({ ...p, padrao: false }));
    expect(ativa.escolherPracaAtiva(semPadrao, undefined)?.workspace_id).toBe("a");
  });

  it("sem praça nenhuma, nada", () => {
    expect(ativa.escolherPracaAtiva([], "a")).toBeNull();
  });

  it("o layout só mostra o seletor pela regra, e a praça ativa sai da regra", () => {
    expect(leitura("app/(app)/layout.tsx")).toMatch(/mostrarSeletorDePraca/);
    expect(leitura("lib/auth/workspace.ts")).toMatch(/escolherPracaAtiva/);
  });

  it("o seletor não cria nem exclui praça", () => {
    const seletor = leitura("components/workspace-switcher.tsx");
    expect(seletor).not.toMatch(/criarEmpresaAction/);
    expect(seletor).not.toMatch(/excluirEquipeAction/);
  });
});
