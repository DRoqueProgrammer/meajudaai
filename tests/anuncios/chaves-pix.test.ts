import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, limpar } from "../fatia1/harness";

/**
 * Gabarito das várias chaves Pix (migration 0056), escrito pelo controller:
 * cada pessoa tem até 5 chaves com apelido, uma padrão; só o dono lê e
 * escreve; profiles_pii.chave_pix espelha a padrão.
 */
describe.skipIf(!podeRodar)("Chaves Pix · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const email = `f1-pix-${s}@teste.dev`;
  const emailOutro = `f1-pix-o-${s}@teste.dev`;
  let P = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, email, "prestador_servico", { preco_tipo: "hora", preco_valor: 60, categoria: "ajudante_eletricista" });
    await criarPessoa(reg, emailOutro, "cliente");
  });

  afterAll(async () => {
    if (servico) await servico.from("chaves_pix").delete().eq("user_id", P);
    await limpar(reg);
  });

  const piiChave = async () => (await servico!.from("profiles_pii").select("chave_pix").eq("user_id", P).single()).data?.chave_pix;

  it("o dono cadastra chaves; a padrão vai para profiles_pii", async () => {
    const sessao = await entrar(email);
    expect((await sessao.from("chaves_pix").insert({ user_id: P, apelido: "Nubank", chave: `nubank-${s}@teste.dev`, padrao: true })).error).toBeNull();
    expect((await sessao.from("chaves_pix").insert({ user_id: P, apelido: "Itaú", chave: `itau-${s}@teste.dev` })).error).toBeNull();
    expect(await piiChave()).toBe(`nubank-${s}@teste.dev`);
  });

  it("só uma padrão por vez, e trocar a padrão atualiza o espelho", async () => {
    const sessao = await entrar(email);
    const segunda = await sessao.from("chaves_pix").update({ padrao: true }).eq("apelido", "Itaú").select("id");
    expect(segunda.error).not.toBeNull();
    await sessao.from("chaves_pix").update({ padrao: false }).eq("apelido", "Nubank");
    expect((await sessao.from("chaves_pix").update({ padrao: true }).eq("apelido", "Itaú")).error).toBeNull();
    expect(await piiChave()).toBe(`itau-${s}@teste.dev`);
  });

  it("ninguém mais lê nem mexe nas chaves", async () => {
    const outro = await entrar(emailOutro);
    expect((await outro.from("chaves_pix").select("id").eq("user_id", P)).data ?? []).toHaveLength(0);
    expect((await outro.from("chaves_pix").insert({ user_id: P, apelido: "Intruso", chave: "intruso@teste.dev" })).error).not.toBeNull();
  });

  it("no máximo cinco chaves", async () => {
    const sessao = await entrar(email);
    for (let i = 3; i <= 5; i++) {
      expect((await sessao.from("chaves_pix").insert({ user_id: P, apelido: `Chave ${i}`, chave: `chave-${i}-${s}@teste.dev` })).error).toBeNull();
    }
    const sexta = await sessao.from("chaves_pix").insert({ user_id: P, apelido: "Sexta", chave: `sexta-${s}@teste.dev` });
    expect(sexta.error?.message ?? "").toMatch(/limite/i);
  });
});
