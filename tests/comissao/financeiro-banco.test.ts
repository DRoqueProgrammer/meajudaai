import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco do Financeiro da praça (migration 0058, D-047), escrito
 * pelo controller antes das telas. Pedidos do Leonardo em 11/09/2026:
 * "Limpar red flags" (a sinalização continua registrada, sai do perfil); notas
 * avulsas numeradas, que o prestador pagador lê e ninguém escreve pela sessão;
 * assinatura do Administrador nos recibos — só ele grava a dele, e a conta de
 * exemplo não grava.
 */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe.skipIf(!podeRodar)("Financeiro · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const UF = "ZZ";
  const cidade = `Cidade Financeiro ${s}`;
  const email = (n: string) => `f1-financeiro-${n}-${s}@teste.dev`;
  let A = "";
  let AX = "";
  let P = "";
  let P2 = "";
  let C = "";
  let W = "";
  let sinalizacaoId = "";

  beforeAll(async () => {
    A = await criarPessoa(reg, email("a"), "admin", { cidade, estado: UF });
    AX = await criarPessoa(reg, email("ax"), "admin", { cidade, estado: UF, exemplo: true });
    P = await criarPessoa(reg, email("p"), "prestador_servico", { preco_tipo: "hora", preco_valor: 100, categoria: "ajudante_eletricista", cidade, estado: UF });
    P2 = await criarPessoa(reg, email("p2"), "prestador_servico", { preco_tipo: "hora", preco_valor: 100, categoria: "ajudante_eletricista", cidade, estado: UF });
    C = await criarPessoa(reg, email("c"), "cliente", { cidade, estado: UF });
    const w = await servico!.from("workspaces").insert({ owner_id: A, nome: `Praça Financeiro ${s}`, cidade, estado: UF }).select("id").single();
    if (w.error || !w.data) throw w.error ?? new Error("praça não criada");
    W = w.data.id as string;
    reg.pracas.push(W);

    const h = await criarHorario(P);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Serviço ${s}`, preco_tipo: "hora", preco_valor: 100, status: "realizado" })
      .select("id")
      .single();
    if (sv.error || !sv.data) throw sv.error ?? new Error("serviço não criado");
    const si = await servico!
      .from("sinalizacoes")
      .insert({ autor_id: P, alvo_id: C, servico_id: sv.data.id, direcao: "prestador_para_cliente", motivo: "nao_pagou", justificativa: `Não pagou o combinado ${s}`, status: "aprovada", decidido_por: A, decidido_em: new Date().toISOString() })
      .select("id")
      .single();
    if (si.error || !si.data) throw si.error ?? new Error("sinalização não criada");
    sinalizacaoId = si.data.id as string;
  });

  afterAll(async () => {
    if (servico) {
      await servico.from("notas_avulsas").delete().eq("workspace_id", W);
      await servico.from("assinaturas").delete().in("user_id", [A, AX]);
    }
    await limpar(reg);
  });

  it("red flag limpa continua registrada, mas sai do perfil", async () => {
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.rpc("flags_da_pessoa", { p_alvo: C })).data ?? []).toHaveLength(1);

    const up = await servico!
      .from("sinalizacoes")
      .update({ status: "limpa", limpa_por: A, limpa_em: new Date().toISOString() })
      .eq("id", sinalizacaoId);
    expect(up.error).toBeNull();

    expect((await sessaoP.rpc("flags_da_pessoa", { p_alvo: C })).data ?? []).toHaveLength(0);
    const { data } = await servico!.from("sinalizacoes").select("status, limpa_por").eq("id", sinalizacaoId).single();
    expect(data).toEqual({ status: "limpa", limpa_por: A });
  });

  it("status desconhecido continua barrado", async () => {
    const { error } = await servico!.from("sinalizacoes").update({ status: "apagada" }).eq("id", sinalizacaoId);
    expect(error).not.toBeNull();
  });

  it("nota avulsa ganha número sequencial; o prestador pagador lê a dele e não a dos outros", async () => {
    const n1 = await servico!
      .from("notas_avulsas")
      .insert({ workspace_id: W, prestador_id: P, pagador_nome: "Prestador P", descricao: "Taxa de cadastro", valor: 49.9, recebido_em: "2026-09-10", emitido_por: A })
      .select("id, numero")
      .single();
    const n2 = await servico!
      .from("notas_avulsas")
      .insert({ workspace_id: W, prestador_id: P2, pagador_nome: "Prestador P2", descricao: "Material de obra", valor: 6.99, recebido_em: "2026-09-10", forma: "dinheiro", emitido_por: A })
      .select("id, numero")
      .single();
    expect(n1.error).toBeNull();
    expect(n2.error).toBeNull();
    expect(Number(n2.data!.numero)).toBeGreaterThan(Number(n1.data!.numero));

    const sessaoP = await entrar(email("p"));
    const minhas = await sessaoP.from("notas_avulsas").select("id");
    expect((minhas.data ?? []).map((n) => n.id)).toEqual([n1.data!.id]);
  });

  it("ninguém cria nota avulsa pela sessão, nem o Administrador", async () => {
    const sessaoA = await entrar(email("a"));
    const { error } = await sessaoA
      .from("notas_avulsas")
      .insert({ workspace_id: W, pagador_nome: "Alguém", descricao: "Tentativa", valor: 10, recebido_em: "2026-09-10" });
    expect(error).not.toBeNull();
  });

  it("valor e descrição da nota avulsa são conferidos", async () => {
    const zero = await servico!.from("notas_avulsas").insert({ workspace_id: W, pagador_nome: "Alguém", descricao: "Zero", valor: 0, recebido_em: "2026-09-10" });
    expect(zero.error).not.toBeNull();
    const semTexto = await servico!.from("notas_avulsas").insert({ workspace_id: W, pagador_nome: "Alguém", descricao: "  ", valor: 5, recebido_em: "2026-09-10" });
    expect(semTexto.error).not.toBeNull();
  });

  it("o Administrador grava a própria assinatura; os outros não leem", async () => {
    const sessaoA = await entrar(email("a"));
    expect((await sessaoA.from("assinaturas").upsert({ user_id: A, imagem: PNG })).error).toBeNull();
    expect((await sessaoA.from("assinaturas").select("user_id")).data ?? []).toHaveLength(1);
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("assinaturas").select("user_id")).data ?? []).toHaveLength(0);
  });

  it("a conta de exemplo e quem não é da administração não gravam assinatura", async () => {
    const sessaoAX = await entrar(email("ax"));
    expect((await sessaoAX.from("assinaturas").insert({ user_id: AX, imagem: PNG })).error).not.toBeNull();
    const sessaoP = await entrar(email("p"));
    expect((await sessaoP.from("assinaturas").insert({ user_id: P, imagem: PNG })).error).not.toBeNull();
  });

  it("assinatura só aceita PNG em data URL", async () => {
    const sessaoA = await entrar(email("a"));
    const { error } = await sessaoA.from("assinaturas").upsert({ user_id: A, imagem: "https://exemplo.dev/assinatura.png" });
    expect(error).not.toBeNull();
  });
});
