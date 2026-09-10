import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "./harness";

/**
 * Gabarito do achado da revisão da tarefa 1 da Fatia 1 — "o serviço só muda pelo fluxo"
 * (R-37/R-38, ADR 0010). Escrito pelo controller depois da tarefa 1, quando a revisão
 * mostrou que a política de atualização de `servicos` só conferia QUEM escreve: uma das
 * partes re-vinculava um serviço existente a outra pessoa — e, com isso, passava a "ter
 * serviço" com ela e abria o telefone dela (R-40).
 *
 * Contrato: depois do nascimento, o horário, o cliente, o prestador e o tipo de preço de
 * um serviço não mudam por sessão de usuário; a renegociação de valor segue funcionando.
 * Toda tentativa é feita fora da aplicação (chave pública + sessão real).
 */

describe.skipIf(!podeRodar)("Fatia 1 · o vínculo de um serviço não muda depois do nascimento", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let P = "";
  let P2 = "";
  let C = "";
  let V = "";
  let prestador: SupabaseClient;
  let cliente: SupabaseClient;
  let pedido = "";
  let horario2 = "";

  const linha = async () => (await servico!.from("servicos").select("*").eq("id", pedido).single()).data!;

  beforeAll(async () => {
    P = await criarPessoa(reg, `f1-vinculo-p-${s}@teste.dev`, "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" });
    P2 = await criarPessoa(reg, `f1-vinculo-p2-${s}@teste.dev`, "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, `f1-vinculo-c-${s}@teste.dev`, "cliente");
    V = await criarPessoa(reg, `f1-vinculo-v-${s}@teste.dev`, "cliente", {}, { telefone: "21999990000", is_whatsapp: true });
    const horario = await criarHorario(P);
    horario2 = await criarHorario(P);
    cliente = await entrar(`f1-vinculo-c-${s}@teste.dev`);
    prestador = await entrar(`f1-vinculo-p-${s}@teste.dev`);
    const { data, error } = await cliente
      .from("servicos")
      .insert({
        slot_id: horario,
        cliente_id: C,
        prestador_id: P,
        descricao: "Gabarito vínculo",
        preco_tipo: "hora",
        preco_valor: 80,
        endereco: "Rua do Gabarito, 1",
        lat: -22.9,
        lng: -43.1,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("serviço não criado");
    pedido = data.id as string;
    const confirmou = await prestador.from("servicos").update({ status: "confirmado" }).eq("id", pedido);
    if (confirmou.error) throw confirmou.error;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o prestador não troca o cliente do serviço — e não passa a ler o telefone de outra pessoa", async () => {
    await prestador.from("servicos").update({ cliente_id: V }).eq("id", pedido);
    expect((await linha()).cliente_id).toBe(C);
    expect((await prestador.from("profiles_pii").select("telefone").eq("user_id", V)).data ?? []).toHaveLength(0);
  });

  it("o cliente não troca o prestador do serviço", async () => {
    await cliente.from("servicos").update({ prestador_id: P2 }).eq("id", pedido);
    expect((await linha()).prestador_id).toBe(P);
  });

  it("o cliente não troca o horário do serviço", async () => {
    await cliente.from("servicos").update({ slot_id: horario2 }).eq("id", pedido);
    expect((await linha()).slot_id).not.toBe(horario2);
  });

  it("o cliente não troca o tipo de preço depois do nascimento", async () => {
    await cliente.from("servicos").update({ preco_tipo: "servico" }).eq("id", pedido);
    expect((await linha()).preco_tipo).toBe("hora");
  });

  it("a renegociação de valor segue funcionando", async () => {
    const proposta = await prestador.from("servicos").update({ preco_pendente: 100 }).eq("id", pedido);
    expect(proposta.error).toBeNull();
    const aceite = await cliente.from("servicos").update({ preco_valor: 100, preco_pendente: null }).eq("id", pedido);
    expect(aceite.error).toBeNull();
    expect(Number((await linha()).preco_valor)).toBe(100);
  });
});
