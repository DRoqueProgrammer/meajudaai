import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CadastroSchema } from "@/lib/validation";

/**
 * Gabarito do lote do cadastro (pedidos do Leonardo em 10/09/2026): confirmação
 * de senha com mostrar/ocultar, máscara do telefone à mostra, foto opcional,
 * endereço e pino obrigatórios. Escrito pelo controller antes da implementação.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");
function arquivosDe(pasta: string): string {
  const base = new URL(pasta, raiz);
  if (!existsSync(base)) return "";
  const saida: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const cheio = join(dir, nome);
      if (statSync(cheio).isDirectory()) andar(cheio);
      else if (/\.tsx?$/.test(nome)) saida.push(readFileSync(cheio, "utf8"));
    }
  };
  andar(fileURLToPath(base));
  return saida.join("\n");
}

const base = {
  nome: "Ana Souza",
  email: "ana@teste.dev",
  senha: "segredo123",
  confirmacao_senha: "segredo123",
  telefone: "21998884455",
  cidade: "Niterói",
  estado: "RJ",
  tipo_base: "cliente",
  genero: "feminino",
};

describe("Cadastro · confirmação de senha", () => {
  it("aceita senha e confirmação iguais", () => {
    expect(CadastroSchema.safeParse(base).success).toBe(true);
  });

  it("recusa confirmação diferente, com o erro no campo da confirmação", () => {
    const r = CadastroSchema.safeParse({ ...base, confirmacao_senha: "outra-senha" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path.includes("confirmacao_senha"))).toBe(true);
  });
});

describe("Cadastro · tela", () => {
  const telas = () => [ler("app/(auth)/cadastro/form.tsx"), arquivosDe("components")].join("\n");

  it("tem o campo de confirmação e o botão de mostrar/ocultar senha", () => {
    expect(ler("app/(auth)/cadastro/form.tsx")).toMatch(/confirmacao_senha/);
    expect(telas()).toMatch(/Mostrar senha/);
    expect(telas()).toMatch(/Ocultar senha/);
  });

  it("o login também tem mostrar/ocultar senha", () => {
    const login = arquivosDe("app/(auth)/login");
    expect(login + arquivosDe("components")).toMatch(/Mostrar senha/);
    expect(login).not.toMatch(/type="password"/);
  });

  it("o telefone mostra o exemplo da máscara", () => {
    expect(telas()).toMatch(/\(21\) 99888-4455/);
  });

  it("foto opcional: campo de arquivo no formulário e upload na action", () => {
    expect(telas()).toMatch(/name="foto"/);
    expect(ler("lib/actions/auth.ts")).toMatch(/avatares/);
  });

  it("endereço e pino não aparecem como opcionais", () => {
    expect(telas()).not.toMatch(/Opcional: marque o ponto/);
  });
});
