import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco da comissão da plataforma (migration 0057, D-044), escrito
 * pelo controller antes das telas: praça da cidade cobra; quatro níveis de
 * alíquota, o mais específico vence, sem nada é 0%; gera quando o serviço vira
 * realizado, com a alíquota congelada; cancelado não gera; o prestador lê as
 * próprias; paga na chave padrão do Administrador responsável pela praça.
 */
describe.skipIf(!podeRodar)("Comissão · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const UF = "ZZ";
  const cidade = `Cidade Comissão ${s}`;
  const cidadeSemPraca = `Cidade Sem Praça ${s}`;
  const email = (n: string) => `f1-comissao-${n}-${s}@teste.dev`;
  let A = "";
  let P = "";
  let Q = "";
  let C = "";
  let W = "";

  const prest = (c: string) => ({ preco_tipo: "hora", preco_valor: 200, categoria: "ajudante_eletricista", cidade: c, estado: UF });

  beforeAll(async () => {
    A = await criarPessoa(reg, email("a"), "admin", { nome: `Admin Comissão ${s}`, cidade, estado: UF });
    P = await criarPessoa(reg, email("p"), "prestador_servico", prest(cidade));
    Q = await criarPessoa(reg, email("q"), "prestador_servico", prest(cidadeSemPraca));
    C = await criarPessoa(reg, email("c"), "cliente", { cidade, estado: UF });
    const w = await servico!.from("workspaces").insert({ owner_id: A, nome: `Praça Comissão ${s}`, cidade, estado: UF }).select("id").single();
    if (w.error || !w.data) throw w.error ?? new Error("praça não criada");
    W = w.data.id as string;
    reg.pracas.push(W);
    const al = await servico!.from("aliquotas_comissao").insert([
      { workspace_id: W, percentual: 10 },
      { workspace_id: W, tipo_servico: "instalacao_eletrica", percentual: 8 },
      { workspace_id: W, prestador_id: P, percentual: 6 },
      { workspace_id: W, prestador_id: P, tipo_servico: "instalacao_eletrica", percentual: 1.5 },
    ]);
    if (al.error) throw al.error;
    const ch = await servico!.from("chaves_pix").insert({ user_id: A, apelido: "Praça", chave: `praca-${s}@teste.dev`, padrao: true });
    if (ch.error) throw ch.error;
  });

  afterAll(async () => {
    if (servico) {
      await servico.from("comissoes").delete().in("prestador_id", [P, Q]);
      await servico.from("aliquotas_comissao").delete().eq("workspace_id", W);
      await servico.from("chaves_pix").delete().eq("user_id", A);
    }
    await limpar(reg);
  });

  const aliquota = async (quem: string, tipo: string) => (await (await entrar(quem)).rpc("aliquota_de", { p_prestador: P, p_tipo: tipo })).data;

  it("o mais específico vence: prestador + tipo, depois prestador", async () => {
    expect(Number(await aliquota(email("p"), "instalacao_eletrica"))).toBe(1.5);
    expect(Number(await aliquota(email("p"), "instalacao_varal"))).toBe(6);
  });

  it("sem o do prestador, vale o do tipo na praça e depois o geral", async () => {
    await servico!.from("aliquotas_comissao").delete().eq("workspace_id", W).eq("prestador_id", P);
    expect(Number(await aliquota(email("p"), "instalacao_eletrica"))).toBe(8);
    expect(Number(await aliquota(email("p"), "instalacao_varal"))).toBe(10);
    // Volta a combinação prestador + tipo para os próximos casos.
    await servico!.from("aliquotas_comissao").insert({ workspace_id: W, prestador_id: P, tipo_servico: "instalacao_eletrica", percentual: 1.5 });
  });

  it("outra pessoa não vê a alíquota do prestador", async () => {
    expect(await aliquota(email("c"), "instalacao_eletrica")).toBeNull();
  });

  it("serviço realizado gera a comissão com a alíquota congelada; cancelado não gera", async () => {
    const h1 = await criarHorario(P);
    const s1 = await servico!
      .from("servicos")
      .insert({ slot_id: h1, cliente_id: C, prestador_id: P, descricao: `Realizado ${s}`, preco_tipo: "hora", preco_valor: 200, status: "confirmado", tipo: "instalacao_eletrica" })
      .select("id")
      .single();
    const h2 = await criarHorario(P);
    const s2 = await servico!
      .from("servicos")
      .insert({ slot_id: h2, cliente_id: C, prestador_id: P, descricao: `Cancelado ${s}`, preco_tipo: "hora", preco_valor: 200, status: "confirmado", tipo: "instalacao_eletrica" })
      .select("id")
      .single();
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("servicos").update({ status: "realizado" }).eq("id", s1.data!.id)).error).toBeNull();
    expect((await sessaoP.from("servicos").update({ status: "cancelado", cancelado_motivo: "Cliente desistiu" }).eq("id", s2.data!.id)).error).toBeNull();

    const { data } = await servico!.from("comissoes").select("servico_id, base, percentual, valor, status, workspace_id").eq("prestador_id", P);
    expect(data ?? []).toHaveLength(1);
    expect(data![0].servico_id).toBe(s1.data!.id);
    expect(Number(data![0].base)).toBe(200);
    expect(Number(data![0].percentual)).toBe(1.5);
    expect(Number(data![0].valor)).toBe(3);
    expect(data![0].status).toBe("em_aberto");
    expect(data![0].workspace_id).toBe(W);
  });

  it("prestador de cidade sem praça não gera comissão", async () => {
    const h = await criarHorario(Q);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: Q, descricao: `Sem praça ${s}`, preco_tipo: "hora", preco_valor: 200, status: "confirmado" })
      .select("id")
      .single();
    const sessaoQ = await entrar(email("q"));
    await sessaoQ.from("servicos").update({ status: "realizado" }).eq("id", sv.data!.id);
    expect((await servico!.from("comissoes").select("id").eq("prestador_id", Q)).data ?? []).toHaveLength(0);
  });

  it("o prestador lê as próprias comissões e não mexe nelas; o cliente não vê", async () => {
    const sessaoP = await entrar(email("p"));
    const minhas = await sessaoP.from("comissoes").select("id, valor");
    expect(minhas.data ?? []).toHaveLength(1);
    expect((await sessaoP.from("comissoes").update({ status: "paga" }).eq("prestador_id", P).select("id")).data ?? []).toHaveLength(0);
    const sessaoC = await entrar(email("c"));
    expect((await sessaoC.from("comissoes").select("id")).data ?? []).toHaveLength(0);
  });

  it("o prestador paga na chave padrão do Administrador responsável pela praça", async () => {
    const sessaoP = await entrar(email("p"));
    const { data } = await sessaoP.rpc("destino_da_comissao");
    expect(data?.[0]?.workspace_id).toBe(W);
    expect(data?.[0]?.chave).toBe(`praca-${s}@teste.dev`);
    expect(data?.[0]?.recebedor).toBe(`Admin Comissão ${s}`);
    const sessaoQ = await entrar(email("q"));
    expect((await sessaoQ.rpc("destino_da_comissao")).data ?? []).toHaveLength(0);
  });
});
