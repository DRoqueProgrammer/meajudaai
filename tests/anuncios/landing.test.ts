import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Gabarito do lote do mural público (escrito pelo controller antes da
 * implementação). Pedido do Leonardo em 10/09/2026: na página inicial, antes do
 * login, um carrossel "Necessita-se ajudante!" com a vaga, o prestador, o que ele
 * faz e o WhatsApp, e uma vitrine com os anúncios de serviço.
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

describe("Mural público · página inicial", () => {
  const landing = () => ler("app/page.tsx") + "\n" + arquivosDe("components/landing");

  it("a página inicial lê os anúncios pela função pública", () => {
    expect(landing()).toMatch(/anuncios_publicos/);
  });

  it("tem o carrossel de vagas com o chamado e o WhatsApp", () => {
    expect(landing()).toMatch(/Necessita-se ajudante!/);
    expect(landing()).toMatch(/waLink|wa\.me/);
  });

  it("a página pública nunca usa a chave de serviço", () => {
    expect(landing()).not.toMatch(/createAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("existe o script que semeia os anúncios de exemplo", () => {
    expect(existsSync(new URL("scripts/seed-anuncios.mjs", raiz))).toBe(true);
  });
});
