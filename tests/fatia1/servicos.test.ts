import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  podeRodar,
  servico,
  sufixo,
  novoRegistro,
  criarPessoa,
  entrar,
  criarHorario,
  contadorRealizados,
  limpar,
} from "./harness";

/**
 * Gabarito da tarefa 1 da Fatia 1 — R-37, R-38, R-39 (ADR 0010 e 0011).
 *
 * Toda tentativa aqui é feita FORA da aplicação: um usuário comum, com a própria
 * sessão, falando direto com o banco. Uma regra que só exista em `lib/actions/` não
 * passa neste arquivo — é o critério do spec.
 *
 * Contrato da tarefa (o que este gabarito supõe):
 * - a reserva continua sendo o cliente inserindo o próprio serviço; o banco é quem
 *   valida e quem marca o horário como pendente;
 * - "motivo" de cancelamento = texto não vazio depois de tirar os espaços;
 * - a chave de serviço (scripts de seed, código de servidor) não é barrada.
 */

describe.skipIf(!podeRodar)("Fatia 1 · o serviço só nasce e só muda pelo fluxo", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailP = `f1-servicos-p-${s}@teste.dev`;
  const emailP2 = `f1-servicos-p2-${s}@teste.dev`;
  const emailC = `f1-servicos-c-${s}@teste.dev`;
  const emailC2 = `f1-servicos-c2-${s}@teste.dev`;

  let P = "";
  let P2 = "";
  let C = "";
  let C2 = "";
  let cliente: SupabaseClient;
  let cliente2: SupabaseClient;
  let prestador: SupabaseClient;

  const h: Record<string, string> = {};
  let contadorAntes = 0;
  let pedido = "";
  let pedido2 = "";

  const campos = (horario: string, extra: Record<string, unknown> = {}) => ({
    slot_id: horario,
    cliente_id: C,
    prestador_id: P,
    descricao: "Gabarito da fatia 1",
    preco_tipo: "hora",
    preco_valor: 80,
    endereco: "Rua do Gabarito, 1",
    lat: -22.9,
    lng: -43.1,
    ...extra,
  });

  const estado = async (id: string) =>
    ((await servico!.from("servicos").select("status").eq("id", id).single()).data?.status as string) ?? "";

  const servicosNoHorario = async (horario: string) =>
    (await servico!.from("servicos").select("id").eq("slot_id", horario)).data ?? [];

  beforeAll(async () => {
    P = await criarPessoa(reg, emailP, "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" });
    P2 = await criarPessoa(reg, emailP2, "prestador_servico", { preco_tipo: "hora", preco_valor: 120, categoria: "ajudante_eletricista" });
    C = await criarPessoa(reg, emailC, "cliente");
    C2 = await criarPessoa(reg, emailC2, "cliente");
    for (const nome of ["realizado", "confirmado", "outroDono", "preco", "tipoPreco", "outroCliente", "legitimo", "legitimo2"]) {
      h[nome] = await criarHorario(P);
    }
    h.ocupado = await criarHorario(P, "confirmado");
    h.seed = await criarHorario(P, "confirmado");
    cliente = await entrar(emailC);
    cliente2 = await entrar(emailC2);
    prestador = await entrar(emailP);
    contadorAntes = await contadorRealizados(P);
  });

  afterAll(async () => {
    await limpar(reg);
  });

  describe("R-37 — nascimento só pelo fluxo de reserva", () => {
    it("cliente não cria um serviço já realizado", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.realizado!, { status: "realizado" }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.realizado!)).toHaveLength(0);
    });

    it("cliente não cria um serviço já confirmado", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.confirmado!, { status: "confirmado" }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.confirmado!)).toHaveLength(0);
    });

    it("cliente não reserva um horário que não está livre", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.ocupado!));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.ocupado!)).toHaveLength(0);
    });

    it("cliente não aponta um prestador que não é o dono do horário", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.outroDono!, { prestador_id: P2, preco_valor: 120 }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.outroDono!)).toHaveLength(0);
    });

    it("cliente não inventa o valor", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.preco!, { preco_valor: 1 }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.preco!)).toHaveLength(0);
    });

    it("cliente não inventa o tipo de preço", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.tipoPreco!, { preco_tipo: "servico" }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.tipoPreco!)).toHaveLength(0);
    });

    it("cliente não cria serviço em nome de outro cliente", async () => {
      const { error } = await cliente.from("servicos").insert(campos(h.outroCliente!, { cliente_id: C2 }));
      expect(error).not.toBeNull();
      expect(await servicosNoHorario(h.outroCliente!)).toHaveLength(0);
    });

    it("R-39 — o contador público não se move com as tentativas forjadas", async () => {
      expect(await contadorRealizados(P)).toBe(contadorAntes);
    });

    it("a reserva legítima funciona, nasce pendente e o banco marca o horário (ADR 0011)", async () => {
      const { data, error } = await cliente.from("servicos").insert(campos(h.legitimo!)).select("id, status").single();
      expect(error).toBeNull();
      expect(data?.status).toBe("pendente");
      pedido = data!.id as string;
      const { data: horario } = await servico!.from("agenda_slots").select("status").eq("id", h.legitimo!).single();
      expect(horario?.status).toBe("pendente");
    });
  });

  describe("R-38 — o estado só muda pela regra do papel", () => {
    it("cliente não confirma o próprio pedido", async () => {
      await cliente.from("servicos").update({ status: "confirmado" }).eq("id", pedido);
      expect(await estado(pedido)).toBe("pendente");
    });

    it("cliente não marca o próprio pedido como realizado", async () => {
      await cliente.from("servicos").update({ status: "realizado" }).eq("id", pedido);
      expect(await estado(pedido)).toBe("pendente");
    });

    it("prestador confirma o pedido", async () => {
      const { error } = await prestador.from("servicos").update({ status: "confirmado" }).eq("id", pedido);
      expect(error).toBeNull();
      expect(await estado(pedido)).toBe("confirmado");
    });

    it("a renegociação de valor continua funcionando", async () => {
      const proposta = await prestador.from("servicos").update({ preco_pendente: 100 }).eq("id", pedido);
      expect(proposta.error).toBeNull();
      const aceite = await cliente.from("servicos").update({ preco_valor: 100, preco_pendente: null }).eq("id", pedido);
      expect(aceite.error).toBeNull();
      const { data } = await servico!.from("servicos").select("preco_valor, preco_pendente, status").eq("id", pedido).single();
      expect(Number(data?.preco_valor)).toBe(100);
      expect(data?.preco_pendente).toBeNull();
      expect(data?.status).toBe("confirmado");
    });

    it("ninguém cancela sem motivo", async () => {
      await prestador.from("servicos").update({ status: "cancelado" }).eq("id", pedido);
      await cliente.from("servicos").update({ status: "cancelado", cancelado_motivo: "   " }).eq("id", pedido);
      expect(await estado(pedido)).toBe("confirmado");
    });

    it("prestador marca realizado, e o contador sobe exatamente 1", async () => {
      const { error } = await prestador.from("servicos").update({ status: "realizado" }).eq("id", pedido);
      expect(error).toBeNull();
      expect(await estado(pedido)).toBe("realizado");
      expect(await contadorRealizados(P)).toBe(contadorAntes + 1);
    });

    it("serviço realizado não muda mais de estado", async () => {
      await prestador.from("servicos").update({ status: "confirmado" }).eq("id", pedido);
      await prestador.from("servicos").update({ status: "cancelado", cancelado_motivo: "desisti" }).eq("id", pedido);
      expect(await estado(pedido)).toBe("realizado");
    });

    it("cliente cancela o próprio pedido quando dá o motivo", async () => {
      const { data, error } = await cliente2
        .from("servicos")
        .insert(campos(h.legitimo2!, { cliente_id: C2 }))
        .select("id")
        .single();
      expect(error).toBeNull();
      pedido2 = data!.id as string;
      const cancelou = await cliente2
        .from("servicos")
        .update({ status: "cancelado", cancelado_motivo: "Mudei de ideia", cancelado_em: new Date().toISOString() })
        .eq("id", pedido2);
      expect(cancelou.error).toBeNull();
      expect(await estado(pedido2)).toBe("cancelado");
    });

    it("serviço cancelado não reabre", async () => {
      await prestador.from("servicos").update({ status: "confirmado" }).eq("id", pedido2);
      expect(await estado(pedido2)).toBe("cancelado");
    });
  });

  describe("compatibilidade — a chave de serviço continua escrevendo", () => {
    it("um script de seed ainda grava um serviço já realizado sobre um horário confirmado", async () => {
      const { error } = await servico!.from("servicos").insert(campos(h.seed!, { status: "realizado" }));
      expect(error).toBeNull();
    });
  });
});
