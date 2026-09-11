import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { podeRodar, servico, url, anon, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito das suspeitas e da suspensão do prestador (migration 0052), escrito
 * pelo controller antes das telas. Pedido do Leonardo em 10/09/2026: sinais
 * que só a administração vê; suspenso, o prestador some da busca, da vitrine e
 * da reserva, e lê um aviso formal na página dele.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

describe("Suspeitas · código", () => {
  it("as actions existem, conferem o alcance e a conta de exemplo não suspende", () => {
    const acoes = ler("lib/actions/suspeitas.ts");
    for (const nome of ["adicionarSuspeitaAction", "suspenderPrestadorAction", "encerrarSuspensaoAction"]) {
      expect(acoes).toContain(`export async function ${nome}(`);
    }
    // O alcance saiu de adminAlcancaPrestador para a regra geral (lib/admin/alcance.ts:atorAlcanca).
    expect(acoes).toContain("atorAlcanca");
    expect(acoes).toContain("sinalizarAction");
    expect(acoes).toMatch(/exemplo/);
  });

  it("o prestador suspenso lê o aviso formal com o princípio da plataforma", () => {
    const aviso = ler("components/aviso-suspensao.tsx");
    expect(aviso).toMatch(/suspensa/);
    expect(aviso).toMatch(/fora da plataforma/);
  });
});

describe.skipIf(!podeRodar)("Suspeitas · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-suspeita-p-${s}@teste.dev`;
  const emailC = `f1-suspeita-c-${s}@teste.dev`;
  let P = "";
  let C = "";
  let publico: SupabaseClient;

  beforeAll(async () => {
    publico = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 60, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
    const f = await servico!.from("suspeitas_prestador").insert({ prestador_id: P, motivo: "contato_por_fora", descricao: `Passou o WhatsApp ${s}` });
    if (f.error) throw f.error;
  });

  afterAll(async () => {
    if (servico) {
      await servico.from("suspeitas_prestador").delete().eq("prestador_id", P);
      await servico.from("suspensoes").delete().eq("user_id", P);
    }
    await limpar(reg);
  });

  it("nem o próprio prestador lê as suspeitas, e ninguém escreve pela sessão", async () => {
    const prest = await entrar(emailP);
    expect((await prest.from("suspeitas_prestador").select("id")).data ?? []).toHaveLength(0);
    const cli = await entrar(emailC);
    expect((await cli.from("suspeitas_prestador").insert({ prestador_id: P, motivo: "outro" })).error).not.toBeNull();
    expect((await prest.from("suspensoes").insert({ user_id: P, motivo_publico: "Tentativa de se auto-suspender" })).error).not.toBeNull();
  });

  it("suspenso, o prestador some da vitrine e não recebe reserva", async () => {
    const sus = await servico!.from("suspensoes").insert({ user_id: P, motivo_publico: `Contato por fora da plataforma ${s}` });
    expect(sus.error).toBeNull();
    expect((await servico!.from("profiles").update({ status: "suspenso" }).eq("user_id", P)).error).toBeNull();

    expect((await publico.rpc("perfil_publico_prestador", { p_id: P })).data ?? []).toHaveLength(0);
    const h = await criarHorario(P);
    const cli = await entrar(emailC);
    const r = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Tentativa ${s}`, preco_tipo: "hora", preco_valor: 60 });
    expect(r.error).not.toBeNull();
  });

  it("o prestador lê a própria suspensão, e só uma fica aberta", async () => {
    const prest = await entrar(emailP);
    const { data } = await prest.from("suspensoes").select("motivo_publico").is("encerrada_em", null);
    expect(data?.[0]?.motivo_publico).toBe(`Contato por fora da plataforma ${s}`);
    const segunda = await servico!.from("suspensoes").insert({ user_id: P, motivo_publico: "Outra suspensão aberta" });
    expect(segunda.error).not.toBeNull();
  });
});

describe.skipIf(!podeRodar)("Sinalizações nas duas direções · banco (migration 0055)", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-flag-p-${s}@teste.dev`;
  const emailOutro = `f1-flag-o-${s}@teste.dev`;
  const emailC = `f1-flag-c-${s}@teste.dev`;
  let P = "";
  let O = "";
  let C = "";
  let servicoPC = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { nome: `Prestador Flag ${s}`, preco_tipo: "hora", preco_valor: 60, categoria: "ajudante_eletricista" });
    O = await criarPessoa(reg, emailOutro, "prestador_servico", { preco_tipo: "hora", preco_valor: 60, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente", { nome: `Cliente Flag ${s}` });
    const h = await criarHorario(P);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Serviço ${s}`, preco_tipo: "hora", preco_valor: 60, status: "realizado" })
      .select("id")
      .single();
    if (sv.error || !sv.data) throw sv.error ?? new Error("serviço não criado");
    servicoPC = sv.data.id as string;
  });

  afterAll(async () => {
    if (servico) {
      await servico.from("sinalizacoes").delete().eq("servico_id", servicoPC);
      await servico.from("suspensoes").delete().eq("user_id", C);
    }
    await limpar(reg);
  });

  it("o prestador sinaliza o cliente no serviço, com justificativa, e nasce pendente", async () => {
    const prest = await entrar(emailP);
    const sem = await prest.from("sinalizacoes").insert({ autor_id: P, alvo_id: C, servico_id: servicoPC, direcao: "prestador_para_cliente", motivo: "nao_pagou", justificativa: "curta" });
    expect(sem.error).not.toBeNull();
    const r = await prest
      .from("sinalizacoes")
      .insert({ autor_id: P, alvo_id: C, servico_id: servicoPC, direcao: "prestador_para_cliente", motivo: "nao_pagou", justificativa: `Não pagou o serviço ${s}` })
      .select("status, created_at")
      .single();
    expect(r.error).toBeNull();
    expect(r.data!.status).toBe("pendente");
    expect(r.data!.created_at).toBeTruthy();
  });

  it("o cliente sinaliza o prestador no mesmo serviço", async () => {
    const cli = await entrar(emailC);
    const r = await cli
      .from("sinalizacoes")
      .insert({ autor_id: C, alvo_id: P, servico_id: servicoPC, direcao: "cliente_para_prestador", motivo: "contato_por_fora", justificativa: `Pediu para pagar por fora ${s}` });
    expect(r.error).toBeNull();
  });

  it("quem não é parte do serviço não sinaliza, nem a direção pode ser trocada, nem nasce aprovada", async () => {
    const outro = await entrar(emailOutro);
    expect((await outro.from("sinalizacoes").insert({ autor_id: O, alvo_id: C, servico_id: servicoPC, direcao: "prestador_para_cliente", motivo: "outro", justificativa: "Tentativa de quem não é parte" })).error).not.toBeNull();
    const cli = await entrar(emailC);
    expect((await cli.from("sinalizacoes").insert({ autor_id: C, alvo_id: P, servico_id: servicoPC, direcao: "prestador_para_cliente", motivo: "outro", justificativa: "Direção trocada de propósito" })).error).not.toBeNull();
    const prest = await entrar(emailP);
    expect((await prest.from("sinalizacoes").insert({ autor_id: P, alvo_id: C, servico_id: servicoPC, direcao: "prestador_para_cliente", motivo: "outro", justificativa: "Já nasce aprovada?", status: "aprovada" })).error).not.toBeNull();
  });

  it("aprovadas viram bandeira para o outro lado, nunca para o próprio alvo", async () => {
    await servico!.from("sinalizacoes").update({ status: "aprovada", decidido_em: new Date().toISOString() }).eq("servico_id", servicoPC);
    const prest = await entrar(emailP);
    const cli = await entrar(emailC);
    const doCliente = await prest.rpc("flags_da_pessoa", { p_alvo: C });
    expect(doCliente.data ?? []).toHaveLength(1);
    expect(doCliente.data?.[0]?.sinalizado_por).toBe(`Prestador Flag ${s}`);
    const doPrestador = await cli.rpc("flags_da_pessoa", { p_alvo: P });
    expect(doPrestador.data ?? []).toHaveLength(1);
    expect((await cli.rpc("flags_da_pessoa", { p_alvo: C })).data ?? []).toHaveLength(0);
    expect((await prest.rpc("flags_da_pessoa", { p_alvo: P })).data ?? []).toHaveLength(0);
    const outro = await entrar(emailOutro);
    expect((await outro.rpc("flags_da_pessoa", { p_alvo: P })).data ?? []).toHaveLength(0);
  });

  it("cliente suspenso não faz pedido novo", async () => {
    await servico!.from("suspensoes").insert({ user_id: C, motivo_publico: `Pagamentos não feitos ${s}` });
    await servico!.from("profiles").update({ status: "suspenso" }).eq("user_id", C);
    const h = await criarHorario(P);
    const cli = await entrar(emailC);
    const r = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Pedido suspenso ${s}`, preco_tipo: "hora", preco_valor: 60 });
    expect(r.error).not.toBeNull();
  });
});
