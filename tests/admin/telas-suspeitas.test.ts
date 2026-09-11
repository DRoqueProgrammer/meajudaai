import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { bandeirinhas } from "@/lib/flags";

/**
 * Gabarito das telas das suspeitas e da aba Serviços do prestador (escrito pelo
 * controller antes da implementação). Banco e actions prontos e testados:
 * migrations 0052–0054, lib/actions/suspeitas.ts, tests/admin/suspeitas.test.ts.
 *
 * Regra da bandeirinha (pedido do Leonardo): até 5 sinalizações aprovadas, uma
 * bandeirinha para cada; de 6 em diante, UMA bandeira vermelha com o número
 * ("6×"). No hover, "Suspeita de Pilantragem" com cada registro, do mais
 * recente para o mais antigo, data/hora e quem sinalizou.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (c: string) => readFileSync(new URL(c, raiz), "utf8");

describe("bandeirinhas", () => {
  it("nenhuma sinalização, nenhuma bandeira", () => {
    expect(bandeirinhas(0)).toEqual({ icones: 0, contador: null });
  });

  it("até cinco, uma bandeirinha por sinalização", () => {
    expect(bandeirinhas(1)).toEqual({ icones: 1, contador: null });
    expect(bandeirinhas(5)).toEqual({ icones: 5, contador: null });
  });

  it("de seis em diante, uma bandeira com o número", () => {
    expect(bandeirinhas(6)).toEqual({ icones: 1, contador: "6×" });
    expect(bandeirinhas(12)).toEqual({ icones: 1, contador: "12×" });
  });
});

describe("Telas das suspeitas", () => {
  it("existe a aba Serviços do prestador, no menu", () => {
    expect(existsSync(new URL("app/(app)/servicos/page.tsx", raiz))).toBe(true);
    expect(ler("components/nav.tsx")).toContain('"/servicos"');
  });

  it("a bandeira no cliente é dada no serviço, pela action da sessão", () => {
    const servicos = ler("app/(app)/servicos/page.tsx") + ler("components/sinalizar-cliente.tsx");
    expect(servicos).toContain("sinalizarClienteAction");
    expect(servicos).toContain("Flag Pilantra");
  });

  it("o componente da bandeirinha mostra a lista no hover", () => {
    const flags = ler("components/flags-cliente.tsx");
    expect(flags).toContain("Suspeita de Pilantragem");
    expect(flags).toContain("bandeirinhas");
  });

  it("o perfil do cliente lê as flags pela função que só prestador e administração veem", () => {
    expect(ler("app/(app)/perfil/[id]/page.tsx")).toContain("flags_do_cliente");
  });

  it("o painel da praça decide sinalizações e suspende", () => {
    const painel = ler("components/admin/painel-da-praca.tsx") + (existsSync(new URL("components/admin/suspeitas-da-praca.tsx", raiz)) ? ler("components/admin/suspeitas-da-praca.tsx") : "");
    for (const acao of ["decidirSinalizacaoAction", "adicionarSuspeitaAction", "suspenderPrestadorAction", "suspenderClienteAction", "encerrarSuspensaoAction"]) {
      expect(painel).toContain(acao);
    }
  });

  it("quem está suspenso vê o aviso em todas as telas", () => {
    expect(ler("app/(app)/layout.tsx")).toContain("AvisoSuspensao");
  });

  it("anonimizar limpa suspeitas, sinalizações e suspensões da pessoa", () => {
    const anon = ler("lib/titular/anonimizar.ts");
    for (const t of ["suspeitas_prestador", "sinalizacoes_cliente", "suspensoes"]) expect(anon).toContain(t);
  });
});
