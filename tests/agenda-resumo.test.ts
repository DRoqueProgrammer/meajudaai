import { describe, it, expect } from "vitest";
import { resumoHorariosAbertos } from "../lib/agenda-resumo";

// O card "Você está aberto para" da agenda do prestador. A função agrupa os
// horários abertos por par início/fim e resume em texto — era a única coisa na
// tela que dizia, em palavras, o que o calendário mostrava em bolinhas.
// As datas são calculadas em relação a hoje de propósito: a função filtra o
// passado usando a data corrente, então datas fixas no teste apodreceriam.

function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}

function diaDaSemanaDe(iso: string): string {
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${iso}T00:00:00`).getDay()]!;
}

describe("resumoHorariosAbertos", () => {
  it("devolve lista vazia quando não há horário nenhum", () => {
    expect(resumoHorariosAbertos([])).toEqual([]);
  });

  it("agrupa horários que compartilham o mesmo par início/fim", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(1), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(2), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(3), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo).toHaveLength(1);
    expect(resumo[0]!.horaInicio).toBe("09:00");
    expect(resumo[0]!.horaFim).toBe("11:00");
  });

  it("separa pares diferentes em períodos diferentes", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(1), hora_inicio: "14:00", hora_fim: "16:00" },
      { data: emDias(1), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo).toHaveLength(2);
  });

  it("ordena os períodos pela hora de início", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(1), hora_inicio: "14:00", hora_fim: "16:00" },
      { data: emDias(1), hora_inicio: "08:00", hora_fim: "09:00" },
      { data: emDias(1), hora_inicio: "11:00", hora_fim: "12:00" },
    ]);
    expect(resumo.map((r) => r.horaInicio)).toEqual(["08:00", "11:00", "14:00"]);
  });

  it("descarta o que já passou — o card fala do que ainda está aberto", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(-30), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(-1), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(5), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo).toHaveLength(1);
    expect(resumo[0]!.dataMin).toBe(emDias(5));
  });

  it("some com o período inteiro quando todas as datas dele já passaram", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(-2), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo).toEqual([]);
  });

  it("informa a primeira e a última data do período, ordenadas", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(10), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(2), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(6), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo[0]!.dataMin).toBe(emDias(2));
    expect(resumo[0]!.dataMax).toBe(emDias(10));
  });

  it("lista os dias da semana sem repetir, na ordem do domingo em diante", () => {
    // Sete dias seguidos cobrem a semana inteira uma vez só.
    const slots = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      data: emDias(i + 1),
      hora_inicio: "09:00",
      hora_fim: "11:00",
    }));
    const dias = resumoHorariosAbertos(slots)[0]!.diasSemana.split(", ");
    expect(dias).toHaveLength(7);
    expect(new Set(dias).size).toBe(7);
    expect(dias).toEqual(["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]);
  });

  it("não repete o dia da semana quando o mesmo dia aparece em semanas diferentes", () => {
    const resumo = resumoHorariosAbertos([
      { data: emDias(1), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(8), hora_inicio: "09:00", hora_fim: "11:00" },
      { data: emDias(15), hora_inicio: "09:00", hora_fim: "11:00" },
    ]);
    expect(resumo[0]!.diasSemana).toBe(diaDaSemanaDe(emDias(1)));
  });
});
