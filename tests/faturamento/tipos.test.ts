import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { podeRodar, servico, url, anon, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco dos tipos de serviço (migration 0047), escrito pelo
 * controller antes das telas. Decisão do Leonardo em 10/09/2026: todo serviço
 * tem um tipo, de um catálogo de seis, e é isso que empilha o faturamento.
 */
describe.skipIf(!podeRodar)("Tipos de serviço · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-tipo-p-${s}@teste.dev`;
  const emailC = `f1-tipo-c-${s}@teste.dev`;
  let P = "";
  let C = "";
  let realizado = "";

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 70, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
    const h = await criarHorario(P);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Troca de tomada ${s}`, preco_tipo: "hora", preco_valor: 70, status: "realizado" })
      .select("id, tipo")
      .single();
    if (sv.error || !sv.data) throw sv.error ?? new Error("serviço não criado");
    realizado = sv.data.id as string;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("o catálogo tem os seis tipos pedidos e é legível sem login", async () => {
    const publico = createClient(url!, anon!, { auth: { persistSession: false } });
    const { data, error } = await publico.from("tipos_servico").select("slug, nome").order("ordem");
    expect(error).toBeNull();
    expect((data ?? []).map((t) => t.nome)).toEqual([
      "Manutenção em madeira",
      "Instalação elétrica",
      "Instalação de varal",
      "Instalação de móveis",
      "Desmontagem/remontagem de móveis",
      "Outros",
    ]);
  });

  it("serviço nasce com tipo 'outros' quando ninguém escolhe", async () => {
    const { data } = await servico!.from("servicos").select("tipo").eq("id", realizado).single();
    expect(data!.tipo).toBe("outros");
  });

  it("o cliente escolhe o tipo ao agendar", async () => {
    const h = await criarHorario(P);
    const cli = await entrar(emailC);
    const ins = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Varal na área ${s}`, preco_tipo: "hora", preco_valor: 70, tipo: "instalacao_varal" })
      .select("tipo")
      .single();
    expect(ins.error).toBeNull();
    expect(ins.data!.tipo).toBe("instalacao_varal");
  });

  it("tipo fora do catálogo é recusado", async () => {
    const h = await criarHorario(P);
    const cli = await entrar(emailC);
    const ins = await cli
      .from("servicos")
      .insert({ slot_id: h, cliente_id: C, prestador_id: P, descricao: `Tipo inventado ${s}`, preco_tipo: "hora", preco_valor: 70, tipo: "tipo_inventado" });
    expect(ins.error).not.toBeNull();
  });

  it("o prestador recategoriza até serviço realizado — só o tipo", async () => {
    const prest = await entrar(emailP);
    const ok = await prest.from("servicos").update({ tipo: "instalacao_eletrica" }).eq("id", realizado).select("tipo");
    expect(ok.error).toBeNull();
    expect(ok.data?.[0]?.tipo).toBe("instalacao_eletrica");
    const junto = await prest.from("servicos").update({ tipo: "outros", preco_valor: 1 }).eq("id", realizado).select("id");
    expect(junto.error).not.toBeNull();
  });

  it("o cliente não recategoriza serviço que já saiu de pendente", async () => {
    const cli = await entrar(emailC);
    const r = await cli.from("servicos").update({ tipo: "outros" }).eq("id", realizado).select("id");
    expect(r.error).not.toBeNull();
  });
});
