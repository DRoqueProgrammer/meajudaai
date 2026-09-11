import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { podeRodar, servico, url, anon, sufixo, novoRegistro, criarPessoa, criarHorario, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco da página pública do prestador (migration 0049, Fatia 5),
 * escrito pelo controller antes da tela: quem não fez login vê o perfil, os
 * horários livres e as avaliações de um prestador ATIVO — nunca contato,
 * endereço, id de horário nem o nome completo de quem avaliou.
 */
describe.skipIf(!podeRodar)("Página pública do prestador · banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  let publico: SupabaseClient;
  let P = "";
  let C = "";
  let cliente = "";

  beforeAll(async () => {
    publico = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    P = await criarPessoa(reg, `f1-publico-p-${s}@teste.dev`, "prestador_servico",
      { preco_tipo: "hora", preco_valor: 90, categoria: "ajudante_eletricista", bio: `Bio pública ${s}` },
      { telefone: "21988887777" });
    cliente = `Cliente Sobrenome ${s}`;
    C = await criarPessoa(reg, `f1-publico-c-${s}@teste.dev`, "cliente", { nome: cliente });
    await criarHorario(P);
    const aval = await servico!.from("avaliacoes").insert({ avaliado_id: P, avaliador_id: C, nota: 5, comentario: `Ótimo trabalho ${s}` });
    if (aval.error) throw aval.error;
  });

  afterAll(async () => {
    if (servico) await servico.from("avaliacoes").delete().eq("avaliado_id", P);
    await limpar(reg);
  });

  it("sem login, o perfil do prestador ativo aparece, sem contato", async () => {
    const { data, error } = await publico.rpc("perfil_publico_prestador", { p_id: P });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].bio).toBe(`Bio pública ${s}`);
    const json = JSON.stringify(data);
    expect(json).not.toContain("21988887777");
    expect(json).not.toContain("@teste.dev");
  });

  it("horários livres futuros aparecem, sem o id do horário", async () => {
    const { data, error } = await publico.rpc("horarios_livres_publicos", { p_prestador: P });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
    expect(Object.keys(data![0])).not.toContain("id");
  });

  it("avaliação mostra só o primeiro nome de quem avaliou", async () => {
    const { data } = await publico.rpc("avaliacoes_publicas", { p_prestador: P });
    expect(data?.[0]?.comentario).toBe(`Ótimo trabalho ${s}`);
    expect(data?.[0]?.avaliador_primeiro_nome).toBe("Cliente");
    expect(JSON.stringify(data)).not.toContain("Sobrenome");
  });

  it("cliente e prestador inativo não têm página pública", async () => {
    expect((await publico.rpc("perfil_publico_prestador", { p_id: C })).data ?? []).toHaveLength(0);
    await servico!.from("profiles").update({ status: "inativo" }).eq("user_id", P);
    expect((await publico.rpc("perfil_publico_prestador", { p_id: P })).data ?? []).toHaveLength(0);
    expect((await publico.rpc("horarios_livres_publicos", { p_prestador: P })).data ?? []).toHaveLength(0);
    await servico!.from("profiles").update({ status: "ativo" }).eq("user_id", P);
  });
});
