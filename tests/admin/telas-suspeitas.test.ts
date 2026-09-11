import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { bandeirinhas } from "@/lib/flags";

/**
 * Gabarito das telas das suspeitas e da aba Serviços do prestador (escrito pelo
 * controller antes da implementação). Banco e actions prontos e testados:
 * migrations 0052–0055, lib/actions/suspeitas.ts, tests/admin/suspeitas.test.ts.
 * Sinalização nas DUAS direções, dada no serviço, com justificativa: o
 * prestador sinaliza o cliente, o cliente sinaliza o prestador.
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

  it("a bandeira é dada no serviço, pela action da sessão, nos dois lados", () => {
    const botao = ler("components/sinalizar-servico.tsx");
    expect(botao).toContain("sinalizarAction");
    expect(ler("app/(app)/servicos/page.tsx")).toContain("SinalizarServico");
    expect(ler("app/(app)/meus-servicos/page.tsx")).toContain("SinalizarServico");
  });

  // Leonardo, 11/09/2026: o botão vermelho "Flag Pilantra" em cada card parecia
  // bandeira RECEBIDA. Vira um ícone discreto (contorno, cinza) com rótulo
  // acessível "Sinalizar…"; bandeira vermelha cheia só para as aprovadas.
  it("sinalizar é um ícone discreto com rótulo acessível, sem texto no card", () => {
    const botao = ler("components/sinalizar-servico.tsx");
    expect(botao).toMatch(/aria-label=\{`Sinalizar /);
    expect(botao).toContain("text-muted");
  });

  it("nenhuma tela de cliente ou prestador fala em pilantragem", () => {
    for (const f of [
      "components/sinalizar-servico.tsx",
      "components/flags-pessoa.tsx",
      "components/perfil-popover.tsx",
      "components/agenda/slot-detalhe.tsx",
      "components/agenda/cliente-do-servico.tsx",
      "app/(app)/servicos/page.tsx",
      "app/(app)/meus-servicos/page.tsx",
      "app/(app)/perfil/[id]/page.tsx",
    ]) {
      expect(ler(f), f).not.toMatch(/pilantr/i);
    }
  });

  it("o componente da bandeirinha mostra a lista no hover, como red flags", () => {
    const flags = ler("components/flags-pessoa.tsx");
    expect(flags).toContain("red flag");
    expect(flags).toContain("bandeirinhas");
  });

  it("o cartão de hover do perfil também mostra as bandeiras", () => {
    expect(ler("components/perfil-popover.tsx")).toContain("FlagsPessoa");
    expect(ler("app/(app)/servicos/page.tsx")).toMatch(/flags=\{flagsPorCliente/);
  });

  it("o perfil lê as bandeiras pela função que só o outro lado e a administração veem", () => {
    expect(ler("app/(app)/perfil/[id]/page.tsx")).toContain("flags_da_pessoa");
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
    for (const t of ["suspeitas_prestador", "sinalizacoes", "suspensoes"]) expect(anon).toContain(t);
  });
});
