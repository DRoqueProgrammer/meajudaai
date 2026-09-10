import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Gabarito da tarefa 8 da Fatia 1 — R-50 (decisão D-018).
 *
 * O app não guarda senha no aparelho: "lembrar" guarda só o e-mail, e salvar senha
 * fica com o gerenciador do navegador (os `autoComplete` já estão certos). A página
 * de login é um componente de cliente; o gabarito lê o código dela.
 */

const pagina = () => readFileSync(new URL("../../app/(auth)/login/page.tsx", import.meta.url), "utf8");

describe("Fatia 1 · o login lembra só o e-mail", () => {
  it("nada que vai para o armazenamento do navegador carrega a senha", () => {
    const codigo = pagina();
    expect(codigo).not.toMatch(/localStorage\.setItem\([^;]*senha/);
    expect(codigo).not.toMatch(/JSON\.stringify\(\{[^}]*senha/);
  });

  it("a senha nunca é restaurada do armazenamento", () => {
    expect(pagina()).not.toMatch(/setSenha\(\s*s\b/);
  });

  it("o e-mail continua sendo lembrado", () => {
    expect(pagina()).toMatch(/localStorage\.setItem\([^;]*email/);
  });

  it("a opção diz o que faz", () => {
    const codigo = pagina();
    expect(codigo).toMatch(/Lembrar meu e-mail/);
    expect(codigo).not.toMatch(/Salvar credenciais/);
  });

  it("o gerenciador de senhas do navegador segue funcionando", () => {
    expect(pagina()).toMatch(/autoComplete="current-password"/);
  });
});
