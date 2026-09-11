import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, limpar } from "../fatia1/harness";
import { exportarDadosDoTitular } from "@/lib/titular/exportar";
import { anonimizarTitular } from "@/lib/titular/anonimizar";

/**
 * Gabarito do lote "Meus anúncios" do prestador (escrito pelo controller antes
 * da implementação). O banco já está pronto (migration 0044/0045,
 * tests/anuncios/banco.test.ts); este lote entrega as telas do prestador, o
 * anúncio no perfil e na busca, e os anúncios nos direitos do titular.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

describe("Anúncios do prestador · código", () => {
  it("as actions existem e usam a sessão, nunca a chave de serviço", () => {
    const acoes = ler("lib/actions/anuncios.ts");
    expect(acoes).toMatch(/export async function criarAnuncioAction\(/);
    expect(acoes).toMatch(/export async function mudarStatusAnuncioAction\(/);
    expect(acoes).not.toMatch(/createAdminClient/);
  });

  it("existe a tela Meus anúncios", () => {
    expect(existsSync(new URL("app/(app)/anuncios/page.tsx", raiz))).toBe(true);
  });

  it("o perfil e a busca mostram os anúncios pela leitura pública", () => {
    expect(ler("app/(app)/perfil/[id]/page.tsx")).toMatch(/anuncios_publicos/);
    expect(ler("app/(app)/buscar-prestador/page.tsx")).toMatch(/anuncios_publicos/);
  });
});

describe.skipIf(!podeRodar)("Anúncios do prestador · direitos do titular", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let P = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, `f1-anuncio-tit-${s}@teste.dev`, "prestador_servico", {
      preco_tipo: "hora",
      preco_valor: 60,
      categoria: "ajudante_eletricista",
      cidade: `Cidade Titular ${s}`,
      estado: "ZZ",
    });
    const ins = await servico!.from("anuncios").insert([
      { prestador_id: P, tipo: "servico", titulo: `Serviço do titular ${s}`, descricao: "Descrição longa o bastante do serviço." },
      { prestador_id: P, tipo: "vaga_ajudante", titulo: `Vaga do titular ${s}`, descricao: "Descrição longa o bastante da vaga.", whatsapp: "21999997777" },
    ]);
    if (ins.error) throw ins.error;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("baixar meus dados inclui os anúncios da pessoa", async () => {
    const json = JSON.stringify(await exportarDadosDoTitular(servico!, P));
    expect(json).toContain(`Serviço do titular ${s}`);
    expect(json).toContain(`Vaga do titular ${s}`);
  });

  it("anonimizar tira os anúncios da pessoa (e o WhatsApp da vaga)", async () => {
    await anonimizarTitular(servico!, P);
    const { data } = await servico!.from("anuncios").select("id, whatsapp, status").eq("prestador_id", P);
    for (const a of data ?? []) {
      expect(a.whatsapp).toBeNull();
      expect(a.status).not.toBe("ativo");
    }
  });
});
