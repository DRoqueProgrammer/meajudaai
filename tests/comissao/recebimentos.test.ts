import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco do Financeiro em grade (migration 0059, D-048), escrito
 * pelo controller antes das telas: o prestador marca "Recebido" só em serviço
 * DELE e realizado (um recebimento por serviço), lança avulso só para quem já
 * teve serviço com ele, e ninguém mais lê; o perfil ganha "emite nota fiscal";
 * a comissão guarda quem e quando deu o OK.
 */
describe.skipIf(!podeRodar)("Recebimentos · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const email = (n: string) => `f1-receb-${n}-${s}@teste.dev`;
  let P = "";
  let P2 = "";
  let C = "";
  let C2 = "";
  let realizado = "";
  let confirmado = "";
  let deOutro = "";

  const prest = { preco_tipo: "hora", preco_valor: 100, categoria: "ajudante_eletricista" };

  async function novoServico(prestador: string, cliente: string, status: string): Promise<string> {
    const h = await criarHorario(prestador);
    const r = await servico!
      .from("servicos")
      .insert({ slot_id: h, cliente_id: cliente, prestador_id: prestador, descricao: `Serviço ${status} ${s}`, preco_tipo: "hora", preco_valor: 150, status })
      .select("id")
      .single();
    if (r.error || !r.data) throw r.error ?? new Error("serviço não criado");
    return r.data.id as string;
  }

  beforeAll(async () => {
    P = await criarPessoa(reg, email("p"), "prestador_servico", prest);
    P2 = await criarPessoa(reg, email("p2"), "prestador_servico", prest);
    C = await criarPessoa(reg, email("c"), "cliente");
    C2 = await criarPessoa(reg, email("c2"), "cliente");
    realizado = await novoServico(P, C, "realizado");
    confirmado = await novoServico(P, C, "confirmado");
    deOutro = await novoServico(P2, C, "realizado");
  });

  afterAll(async () => {
    if (servico) await servico.from("recebimentos").delete().in("prestador_id", [P, P2]);
    await limpar(reg);
  });

  const linha = (extra: Record<string, unknown>) => ({
    prestador_id: P,
    pagador_nome: "Cliente C",
    descricao: "Instalação de tomadas",
    valor: 150,
    recebido_em: "2026-09-10",
    ...extra,
  });

  it("o prestador marca recebido num serviço dele e realizado — um por serviço", async () => {
    const sessaoP = await entrar(email("p"));
    const r1 = await sessaoP.from("recebimentos").insert(linha({ servico_id: realizado, cliente_id: C })).select("id, numero").single();
    expect(r1.error).toBeNull();
    expect(Number(r1.data?.numero)).toBeGreaterThan(0);
    const r2 = await sessaoP.from("recebimentos").insert(linha({ servico_id: realizado, cliente_id: C }));
    expect(r2.error).not.toBeNull();
  });

  it("serviço ainda não realizado, ou de outro prestador, não recebe", async () => {
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("recebimentos").insert(linha({ servico_id: confirmado, cliente_id: C }))).error).not.toBeNull();
    expect((await sessaoP.from("recebimentos").insert(linha({ servico_id: deOutro, cliente_id: C }))).error).not.toBeNull();
  });

  it("ligado a serviço, o cliente tem de ser o do serviço", async () => {
    const outro = await novoServico(P, C, "realizado");
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("recebimentos").insert(linha({ servico_id: outro, cliente_id: C2 }))).error).not.toBeNull();
  });

  it("avulso: sem cliente, ou com cliente que já teve serviço com ele", async () => {
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("recebimentos").insert(linha({ descricao: "Parafusos e buchas", valor: 6.99 }))).error).toBeNull();
    expect((await sessaoP.from("recebimentos").insert(linha({ descricao: "Material", cliente_id: C }))).error).toBeNull();
    expect((await sessaoP.from("recebimentos").insert(linha({ descricao: "Material", cliente_id: C2 }))).error).not.toBeNull();
  });

  it("ninguém grava em nome de outro prestador, e só o dono lê", async () => {
    const sessaoP2 = await entrar(email("p2"));
    expect((await sessaoP2.from("recebimentos").insert(linha({ descricao: "Forjado" }))).error).not.toBeNull();
    expect((await sessaoP2.from("recebimentos").select("id")).data ?? []).toHaveLength(0);
    const sessaoC = await entrar(email("c"));
    expect((await sessaoC.from("recebimentos").select("id")).data ?? []).toHaveLength(0);
    const sessaoP = await entrar(email("p"));
    expect(((await sessaoP.from("recebimentos").select("id")).data ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("cliente não se passa por prestador para lançar recebimento", async () => {
    const sessaoC = await entrar(email("c"));
    const { error } = await sessaoC.from("recebimentos").insert({ ...linha({}), prestador_id: C });
    expect(error).not.toBeNull();
  });

  it("o prestador desmarca (apaga) o próprio recebimento", async () => {
    const sessaoP = await entrar(email("p"));
    const { data } = await sessaoP.from("recebimentos").delete().eq("servico_id", realizado).select("id");
    expect(data ?? []).toHaveLength(1);
  });

  it("perfil: emite nota fiscal começa em não e o prestador liga no próprio perfil", async () => {
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("profiles").select("emite_nota_fiscal").eq("user_id", P).single()).data?.emite_nota_fiscal).toBe(false);
    expect((await sessaoP.from("profiles").update({ emite_nota_fiscal: true }).eq("user_id", P)).error).toBeNull();
    const sessaoC = await entrar(email("c"));
    expect((await sessaoC.from("profiles").select("emite_nota_fiscal").eq("user_id", P).single()).data?.emite_nota_fiscal).toBe(true);
  });

  it("a comissão guarda quem e quando deu o OK", async () => {
    const { error } = await servico!.from("comissoes").select("paga_em, confirmada_por").limit(1);
    expect(error).toBeNull();
  });
});
