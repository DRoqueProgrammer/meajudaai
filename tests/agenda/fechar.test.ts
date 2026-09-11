import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco de "fechar agenda aberta" (migration 0046), escrito pelo
 * controller antes da tela. Pedido do Leonardo em 10/09/2026: o prestador fecha
 * uma agenda aberta, mas não se ela tiver serviço agendado.
 */
describe.skipIf(!podeRodar)("Agenda · fechar horário aberto", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-fechar-p-${s}@teste.dev`;
  const emailC = `f1-fechar-c-${s}@teste.dev`;
  let P = "";
  let C = "";
  let livre = "";
  let ocupado = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 50, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
    livre = await criarHorario(P);
    ocupado = await criarHorario(P, "confirmado");
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: ocupado, cliente_id: C, prestador_id: P, descricao: `Serviço ${s}`, preco_tipo: "hora", preco_valor: 50, status: "confirmado" });
    if (sv.error) throw sv.error;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o prestador fecha um horário livre, e ele some para o cliente e não aceita reserva", async () => {
    const prest = await entrar(emailP);
    const fechar = await prest.from("agenda_slots").update({ status: "fechado" }).eq("id", livre).select("status");
    expect(fechar.error).toBeNull();
    expect(fechar.data?.[0]?.status).toBe("fechado");

    const cli = await entrar(emailC);
    expect((await cli.from("agenda_slots").select("id").eq("id", livre)).data ?? []).toHaveLength(0);
    const reserva = await cli
      .from("servicos")
      .insert({ slot_id: livre, cliente_id: C, prestador_id: P, descricao: `Tentativa ${s}`, preco_tipo: "hora", preco_valor: 50 });
    expect(reserva.error).not.toBeNull();
  });

  it("horário fechado só volta a livre", async () => {
    const prest = await entrar(emailP);
    expect((await prest.from("agenda_slots").update({ status: "confirmado" }).eq("id", livre).select("id")).error).not.toBeNull();
    const reabrir = await prest.from("agenda_slots").update({ status: "livre" }).eq("id", livre).select("status");
    expect(reabrir.error).toBeNull();
    expect(reabrir.data?.[0]?.status).toBe("livre");
  });

  it("horário com serviço agendado não fecha nem volta a livre", async () => {
    const prest = await entrar(emailP);
    expect((await prest.from("agenda_slots").update({ status: "fechado" }).eq("id", ocupado).select("id")).error).not.toBeNull();
    expect((await prest.from("agenda_slots").update({ status: "livre" }).eq("id", ocupado).select("id")).error).not.toBeNull();
    const { data } = await servico!.from("agenda_slots").select("status").eq("id", ocupado).single();
    expect(data!.status).toBe("confirmado");
  });
});
