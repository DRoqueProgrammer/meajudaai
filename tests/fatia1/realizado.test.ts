import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Gabarito da tarefa 12 da Fatia 1 — o caminho legítimo do R-38 e o passo do R-54
 * (ADR 0016; decisão D-025).
 *
 * O prestador marca um serviço confirmado como realizado. A regra de quem pode fazer
 * isso já é provada no banco pelo gabarito da tarefa 1 (servicos.test.ts); a jornada
 * no navegador é provada pela tarefa 11. Aqui o gabarito confere o caminho na
 * aplicação. Contrato: `marcarRealizadoAction(servicoId)` em `lib/actions/agenda-v2.ts`
 * e o botão "Marcar como realizado" na tela do serviço do prestador.
 */

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · o prestador marca o serviço como realizado", () => {
  it("existe a action", () => {
    expect(leitura("lib/actions/agenda-v2.ts")).toMatch(/export async function marcarRealizadoAction\(/);
  });

  it("a action só vale para serviço confirmado", () => {
    const codigo = leitura("lib/actions/agenda-v2.ts");
    const corpo = codigo.slice(codigo.indexOf("export async function marcarRealizadoAction("));
    expect(corpo.slice(0, 2000)).toMatch(/confirmado/);
  });

  it("a tela do serviço do prestador oferece o botão", () => {
    const tela = leitura("components/agenda/slot-detalhe.tsx");
    expect(tela).toMatch(/marcarRealizadoAction/);
    expect(tela).toMatch(/Marcar como realizado/);
  });
});
