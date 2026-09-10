import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";
import { anonimizarTitular } from "@/lib/titular/anonimizar";

/**
 * Gabarito da revisão do controller sobre o lote 2B (migration 0043 e o
 * endurecimento de `anonimizarTitular`). Cobre o que a revisão achou aberto:
 * - a carência de 7 dias não pode ser pulada por uma sessão falando direto com
 *   a API (o pedido nasce sempre com +7 dias e só pode ser desistido);
 * - quem é anonimizado como prestador some da busca, perde os horários livres,
 *   não recebe reserva, e o agendamento futuro em aberto é cancelado com aviso
 *   para a outra parte.
 */
describe.skipIf(!podeRodar)("Fatia 2 · revisão do titular contra o banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailQ = `f1-titular-q-${s}@teste.dev`;
  const emailK = `f1-titular-k-${s}@teste.dev`;
  const emailP = `f1-titular-p-${s}@teste.dev`;
  const CATEGORIA = "ajudante_eletricista";
  let Q = "";
  let K = "";
  let P = "";
  let horarioLivre = "";
  let horarioComServico = "";
  let agendamento = "";

  beforeAll(async () => {
    Q = await criarPessoa(reg, emailQ, "cliente");
    K = await criarPessoa(reg, emailK, "cliente");
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 70, categoria: CATEGORIA });
    const locais = await servico!.from("profile_local").insert([
      { user_id: K, lat: -22.9, lng: -43.1, endereco: `Casa do K, ${s}` },
      { user_id: P, lat: -22.91, lng: -43.12, endereco: `Casa do P, ${s}` },
    ]);
    if (locais.error) throw locais.error;
    horarioLivre = await criarHorario(P);
    horarioComServico = await criarHorario(P, "confirmado");
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: horarioComServico, cliente_id: K, prestador_id: P, descricao: `Agendamento ${s}`, preco_tipo: "hora", preco_valor: 70, status: "confirmado" })
      .select("id")
      .single();
    if (sv.error || !sv.data) throw sv.error ?? new Error("serviço não criado");
    agendamento = sv.data.id as string;
  });

  afterAll(async () => {
    if (servico) await servico.from("pedidos_exclusao").delete().in("user_id", reg.usuarios);
    await limpar(reg);
  });

  it("o pedido nasce com 7 dias de carência mesmo se a sessão mandar outra data", async () => {
    const sessao = await entrar(emailQ);
    const ontem = new Date(Date.now() - 86_400_000).toISOString();
    const ins = await sessao
      .from("pedidos_exclusao")
      .insert({ user_id: Q, status: "concluido", pode_processar_em: ontem })
      .select("status, pode_processar_em")
      .single();
    expect(ins.error).toBeNull();
    expect(ins.data!.status).toBe("pendente");
    expect(new Date(ins.data!.pode_processar_em).getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  });

  it("a sessão só desiste do pedido — não conclui nem reabre", async () => {
    const sessao = await entrar(emailQ);
    const concluir = await sessao.from("pedidos_exclusao").update({ status: "concluido" }).eq("user_id", Q).select("id");
    expect(concluir.error ?? (concluir.data ?? []).length === 0).toBeTruthy();

    const desistir = await sessao.from("pedidos_exclusao").update({ status: "cancelado" }).eq("user_id", Q).select("status, cancelado_em");
    expect(desistir.error).toBeNull();
    expect(desistir.data?.[0]?.status).toBe("cancelado");
    expect(desistir.data?.[0]?.cancelado_em).toBeTruthy();

    const reabrir = await sessao.from("pedidos_exclusao").update({ status: "pendente" }).eq("user_id", Q).select("id");
    expect(reabrir.error ?? (reabrir.data ?? []).length === 0).toBeTruthy();
    const { data: final } = await servico!.from("pedidos_exclusao").select("status").eq("user_id", Q);
    expect((final ?? []).map((p) => p.status)).toEqual(["cancelado"]);
  });

  it("antes da anonimização, o prestador aparece na busca", async () => {
    const sessaoK = await entrar(emailK);
    const { data, error } = await sessaoK.rpc("buscar_prestadores_proximos", { p_categoria: CATEGORIA });
    expect(error).toBeNull();
    expect((data ?? []).map((r: { prestador_id: string }) => r.prestador_id)).toContain(P);
  });

  it("prestador anonimizado some da busca, perde os horários livres e o agendamento futuro é cancelado com aviso", async () => {
    await anonimizarTitular(servico!, P);

    const { data: perfil } = await servico!.from("profiles").select("status").eq("user_id", P).single();
    expect(perfil!.status).toBe("removido");

    const sessaoK = await entrar(emailK);
    const { data: busca } = await sessaoK.rpc("buscar_prestadores_proximos", { p_categoria: CATEGORIA });
    expect((busca ?? []).map((r: { prestador_id: string }) => r.prestador_id)).not.toContain(P);

    expect((await servico!.from("agenda_slots").select("id").eq("id", horarioLivre)).data ?? []).toHaveLength(0);

    const { data: sv } = await servico!.from("servicos").select("status, cancelado_motivo").eq("id", agendamento).single();
    expect(sv!.status).toBe("cancelado");
    expect(sv!.cancelado_motivo).toBeTruthy();

    const { data: avisos } = await servico!.from("notificacoes").select("tipo").eq("user_id", K);
    expect((avisos ?? []).map((a) => a.tipo)).toContain("servico_cancelado");
  });

  it("não dá para reservar horário de prestador removido", async () => {
    const novo = await criarHorario(P);
    const sessaoK = await entrar(emailK);
    const { error } = await sessaoK
      .from("servicos")
      .insert({ slot_id: novo, cliente_id: K, prestador_id: P, descricao: `Tentativa ${s}`, preco_tipo: "hora", preco_valor: 70 });
    expect(error).not.toBeNull();
  });
});
