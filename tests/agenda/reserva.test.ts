import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito da reserva na Fatia 4 (migration 0048, supera o ADR 0017), escrito
 * pelo controller: o horário volta a aceitar reserva depois de um cancelamento
 * — inclusive quando quem cancela é o cliente — e a corrida de dois clientes
 * no mesmo horário deixa entrar só um.
 */
describe.skipIf(!podeRodar)("Agenda · reserva, cancelamento e corrida", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const email = (n: string) => `f1-reserva-${n}-${s}@teste.dev`;
  let P = "";
  let A = "";
  let B = "";

  const reservar = (sessao: Awaited<ReturnType<typeof entrar>>, cliente: string, slot: string, rotulo: string) =>
    sessao
      .from("servicos")
      .insert({ slot_id: slot, cliente_id: cliente, prestador_id: P, descricao: `${rotulo} ${s}`, preco_tipo: "hora", preco_valor: 80 })
      .select("id")
      .single();

  beforeAll(async () => {
    P = await criarPessoa(reg, email("p"), "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" });
    A = await criarPessoa(reg, email("a"), "cliente");
    B = await criarPessoa(reg, email("b"), "cliente");
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o cliente cancela e o horário volta a livre", async () => {
    const h = await criarHorario(P);
    const sessaoA = await entrar(email("a"));
    const r = await reservar(sessaoA, A, h, "Reserva A");
    expect(r.error).toBeNull();
    expect((await servico!.from("agenda_slots").select("status").eq("id", h).single()).data!.status).toBe("pendente");

    const cancel = await sessaoA
      .from("servicos")
      .update({ status: "cancelado", cancelado_motivo: "Mudei de ideia", cancelado_em: new Date().toISOString() })
      .eq("id", r.data!.id);
    expect(cancel.error).toBeNull();
    expect((await servico!.from("agenda_slots").select("status").eq("id", h).single()).data!.status).toBe("livre");

    const sessaoB = await entrar(email("b"));
    const nova = await reservar(sessaoB, B, h, "Reserva B no mesmo horário");
    expect(nova.error).toBeNull();
  });

  it("dois clientes no mesmo horário ao mesmo tempo: só um entra", async () => {
    const h = await criarHorario(P);
    const [sessaoA, sessaoB] = await Promise.all([entrar(email("a")), entrar(email("b"))]);
    const [ra, rb] = await Promise.all([reservar(sessaoA, A, h, "Corrida A"), reservar(sessaoB, B, h, "Corrida B")]);
    const ok = [ra, rb].filter((r) => !r.error).length;
    expect(ok).toBe(1);
    const { data } = await servico!.from("servicos").select("id").eq("slot_id", h).neq("status", "cancelado");
    expect(data ?? []).toHaveLength(1);
  });
});
