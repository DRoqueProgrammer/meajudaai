import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";
import { periodosDaJanela } from "@/lib/periodo-da-visita";

/**
 * Gabarito do período preferido da visita (migration 0050), escrito pelo
 * controller: a agenda aberta é uma janela (ex.: 09:00–18:00) e o cliente diz
 * se prefere manhã, tarde ou noite — só entre os períodos que a janela cobre.
 */
describe("periodosDaJanela", () => {
  it("janela do dia inteiro oferece manhã e tarde", () => {
    expect(periodosDaJanela("09:00", "18:00")).toEqual(["manha", "tarde"]);
  });

  it("janela só de manhã não oferece escolha", () => {
    expect(periodosDaJanela("09:00", "11:00")).toEqual(["manha"]);
  });

  it("janela que entra na noite oferece a noite", () => {
    expect(periodosDaJanela("16:00", "21:00")).toEqual(["tarde", "noite"]);
  });
});

describe.skipIf(!podeRodar)("Período preferido · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailC = `f1-periodo-c-${s}@teste.dev`;
  let P = "";
  let C = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, `f1-periodo-p-${s}@teste.dev`, "prestador_servico", { preco_tipo: "hora", preco_valor: 70, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o cliente pede dizendo que prefere a tarde", async () => {
    const h = await criarHorario(P);
    const cli = await entrar(emailC);
    const r = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Pedido ${s}`, preco_tipo: "hora", preco_valor: 70, periodo_preferido: "tarde" })
      .select("periodo_preferido")
      .single();
    expect(r.error).toBeNull();
    expect(r.data!.periodo_preferido).toBe("tarde");
  });

  it("sem escolha fica 'qualquer', e valor fora da lista é recusado", async () => {
    const h1 = await criarHorario(P);
    const cli = await entrar(emailC);
    const sem = await cli
      .from("servicos")
      .insert({ slot_id: h1, cliente_id: C, prestador_id: P, descricao: `Sem período ${s}`, preco_tipo: "hora", preco_valor: 70 })
      .select("periodo_preferido")
      .single();
    expect(sem.data?.periodo_preferido).toBe("qualquer");
    const h2 = await criarHorario(P);
    const ruim = await cli
      .from("servicos")
      .insert({ slot_id: h2, cliente_id: C, prestador_id: P, descricao: `Período ruim ${s}`, preco_tipo: "hora", preco_valor: 70, periodo_preferido: "madrugada" });
    expect(ruim.error).not.toBeNull();
  });
});

describe.skipIf(!podeRodar)("Hora combinada · banco (migration 0051)", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-hora-p-${s}@teste.dev`;
  const emailC = `f1-hora-c-${s}@teste.dev`;
  let P = "";
  let C = "";
  let pedido = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 70, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
    const h = await criarHorario(P); // janela 09:00–10:00 (harness)
    const cli = await entrar(emailC);
    const r = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Combinar ${s}`, preco_tipo: "hora", preco_valor: 70 })
      .select("id")
      .single();
    if (r.error || !r.data) throw r.error ?? new Error("pedido não criado");
    pedido = r.data.id as string;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o prestador marca a hora combinada, sem hora final", async () => {
    const prest = await entrar(emailP);
    const r = await prest.from("servicos").update({ hora_combinada_inicio: "09:30" }).eq("id", pedido).select("hora_combinada_inicio, hora_combinada_fim");
    expect(r.error).toBeNull();
    expect(String(r.data?.[0]?.hora_combinada_inicio)).toMatch(/^09:30/);
    expect(r.data?.[0]?.hora_combinada_fim).toBeNull();
  });

  it("fora da janela é recusado", async () => {
    const prest = await entrar(emailP);
    expect((await prest.from("servicos").update({ hora_combinada_inicio: "14:00" }).eq("id", pedido).select("id")).error).not.toBeNull();
  });

  it("o cliente não marca a hora combinada", async () => {
    const cli = await entrar(emailC);
    expect((await cli.from("servicos").update({ hora_combinada_inicio: "09:15" }).eq("id", pedido).select("id")).error).not.toBeNull();
  });
});
