import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Gabarito da tela da agenda do prestador (escrito pelo controller antes da
 * implementação). Pedidos do Leonardo em 10/09/2026: sem o rótulo "Livre" que
 * mentia quando havia serviço no meio do dia; legenda "Agenda aberta das X às
 * Y" no dia; fechar uma agenda aberta com X vermelho e confirmação.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

describe("Agenda do prestador · tela", () => {
  it("o dia não chama mais o horário aberto de \"Livre\"", () => {
    expect(ler("components/agenda/dia-timeline.tsx")).not.toMatch(/\?\?\s*"Livre"/);
    expect(ler("components/agenda/agenda-calendar-v2.tsx")).not.toMatch(/\?\?\s*"Livre"/);
  });

  it("o dia tem a legenda da agenda aberta", () => {
    expect(ler("components/agenda/dia-timeline.tsx")).toMatch(/Agenda aberta/);
  });

  it("existe a action de fechar agenda aberta, com a sessão", () => {
    const acoes = ler("lib/actions/agenda-v2.ts");
    expect(acoes).toMatch(/export async function fecharAgendaAbertaAction\(/);
  });

  it("a tela oferece fechar cada agenda aberta", () => {
    const tela = ler("app/(app)/agenda/page.tsx") + ler("components/agenda/agendas-abertas.tsx");
    expect(tela).toMatch(/Fechar agenda/);
    expect(tela).toMatch(/fecharAgendaAbertaAction/);
  });
});
