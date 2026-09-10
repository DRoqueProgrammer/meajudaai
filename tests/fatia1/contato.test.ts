import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "./harness";

/**
 * Gabarito da tarefa 2 da Fatia 1 — R-40 e R-41 (ADR 0010 e 0015; decisão D-017).
 *
 * Contato (telefone, e-mail, chave de recebimento) e local exato de uma pessoa só
 * abrem para quem tem com ela um serviço pendente, confirmado ou realizado; cancelado
 * não abre. O endereço escrito deixa a tabela de leitura aberta (`profiles`) e passa
 * a morar junto do ponto exato, em `profile_local.endereco`, sob a mesma regra.
 *
 * Os estados do serviço são preparados com a chave de serviço (que a tarefa 1 não
 * barra); as leituras são feitas pelas sessões reais, de fora da aplicação.
 */

describe.skipIf(!podeRodar)("Fatia 1 · contato, chave e endereço só entre as partes", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-contato-p-${s}@teste.dev`;
  const emailC = `f1-contato-c-${s}@teste.dev`;
  const emailX = `f1-contato-x-${s}@teste.dev`;
  const ENDERECO = `Rua do Gabarito, ${s}`;

  let P = "";
  let C = "";
  let pedido = "";
  let cliente: SupabaseClient;
  let estranho: SupabaseClient;
  let prestador: SupabaseClient;

  const piiDe = (quem: SupabaseClient, id: string) =>
    quem.from("profiles_pii").select("user_id, email, chave_pix").eq("user_id", id);
  const localDe = (quem: SupabaseClient, id: string) => quem.from("profile_local").select("user_id").eq("user_id", id);
  const mudarEstado = async (status: string) => {
    const extra = status === "cancelado" ? { cancelado_motivo: "gabarito", cancelado_em: new Date().toISOString() } : {};
    const { error } = await servico!.from("servicos").update({ status, ...extra }).eq("id", pedido);
    if (error) throw error;
  };

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" }, { chave_pix: `pix-${s}` });
    C = await criarPessoa(reg, emailC, "cliente");
    await criarPessoa(reg, emailX, "cliente");

    // O endereço vai para onde o contrato manda. Enquanto a coluna não existir, o ponto
    // exato é gravado sem ele, para os outros testes falharem pelo motivo certo.
    const comEndereco = await servico!.from("profile_local").insert({ user_id: P, lat: -22.9, lng: -43.1, endereco: ENDERECO });
    if (comEndereco.error) {
      const semEndereco = await servico!.from("profile_local").insert({ user_id: P, lat: -22.9, lng: -43.1 });
      if (semEndereco.error) throw semEndereco.error;
    }
    const localC = await servico!.from("profile_local").insert({ user_id: C, lat: -22.91, lng: -43.11 });
    if (localC.error) throw localC.error;

    const horario = await criarHorario(P);
    const { data, error } = await servico!
      .from("servicos")
      .insert({ slot_id: horario, cliente_id: C, prestador_id: P, descricao: "Gabarito contato", preco_tipo: "hora", preco_valor: 80 })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("serviço não criado");
    pedido = data.id as string;

    cliente = await entrar(emailC);
    estranho = await entrar(emailX);
    prestador = await entrar(emailP);
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("sem serviço entre eles, um estranho não lê contato nem ponto exato do prestador", async () => {
    expect((await piiDe(estranho, P)).data ?? []).toHaveLength(0);
    expect((await localDe(estranho, P)).data ?? []).toHaveLength(0);
  });

  it("com serviço pendente, cliente e prestador leem o contato um do outro", async () => {
    await mudarEstado("pendente");
    expect((await piiDe(cliente, P)).data ?? []).toHaveLength(1);
    expect((await piiDe(prestador, C)).data ?? []).toHaveLength(1);
    expect((await localDe(cliente, P)).data ?? []).toHaveLength(1);
  });

  it("com serviço confirmado, o contato continua aberto", async () => {
    await mudarEstado("confirmado");
    expect((await piiDe(cliente, P)).data ?? []).toHaveLength(1);
  });

  it("com serviço realizado, o contato continua aberto", async () => {
    await mudarEstado("realizado");
    expect((await piiDe(cliente, P)).data ?? []).toHaveLength(1);
  });

  it("com o único serviço cancelado, o acesso cai dos dois lados", async () => {
    await mudarEstado("cancelado");
    expect((await piiDe(cliente, P)).data ?? []).toHaveLength(0);
    expect((await piiDe(prestador, C)).data ?? []).toHaveLength(0);
    expect((await localDe(cliente, P)).data ?? []).toHaveLength(0);
  });

  it("o endereço escrito saiu da tabela de leitura aberta", async () => {
    const { error } = await servico!.from("profiles").select("endereco").limit(1);
    expect(error).not.toBeNull();
  });

  it("o endereço escrito mora junto do ponto exato e segue a mesma regra", async () => {
    await mudarEstado("pendente");
    const doCliente = await cliente.from("profile_local").select("endereco").eq("user_id", P);
    expect(doCliente.error).toBeNull();
    expect(doCliente.data?.[0]?.endereco).toBe(ENDERECO);
    const doEstranho = await estranho.from("profile_local").select("endereco").eq("user_id", P);
    expect(doEstranho.data ?? []).toHaveLength(0);
  });

  it("a própria pessoa lê o próprio endereço", async () => {
    const { data, error } = await prestador.from("profile_local").select("endereco").eq("user_id", P);
    expect(error).toBeNull();
    expect(data?.[0]?.endereco).toBe(ENDERECO);
  });
});
