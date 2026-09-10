import { describe, it, expect } from "vitest";
import { CIDADES } from "../lib/cidades";
import {
  ALL_MODULES,
  CAPABILITIES,
  FUNCIONARIO_DEFAULT,
  GRANTABLE_MODULES,
  PANEL_MODULES,
  capabilityLabel,
  isAppModule,
  isCapability,
  moduleLabel,
} from "../lib/modules";
import { CONTAS_EXEMPLO, SENHA_CONTA_EXEMPLO, isPapelExemplo } from "../lib/auth/contas-exemplo";
import { ALVO_LABEL, ALVOS_DENUNCIA, MOTIVOS_DENUNCIA, motivoCurto } from "../lib/denuncias";

// Catálogos: listas fixas que a UI lê e o banco espelha em check constraints.
// Estavam em 0%. O risco aqui não é a função quebrar — é o catálogo divergir do
// banco (slug renomeado, papel novo esquecido) e a tela mostrar `undefined` ou
// o insert ser recusado. Os testes travam as invariantes, não os itens.

describe("catálogo de cidades", () => {
  it("não tem cidade repetida na mesma UF", () => {
    const chaves = CIDADES.map((c) => `${c.nome}/${c.uf}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("tem UF com 2 letras maiúsculas em todas", () => {
    expect(CIDADES.every((c) => /^[A-Z]{2}$/.test(c.uf))).toBe(true);
  });

  it("inclui a praça inicial", () => {
    expect(CIDADES.some((c) => c.nome === "Niterói" && c.uf === "RJ")).toBe(true);
  });
});

describe("módulos e capacidades", () => {
  it("ALL_MODULES deriva do painel, sem divergir dele", () => {
    expect(ALL_MODULES).toEqual(PANEL_MODULES.map((m) => m.key));
  });

  it("todo módulo concedível é um módulo de verdade", () => {
    // Conceder um módulo que não existe cria um papel que não abre nada.
    expect(GRANTABLE_MODULES.every((m) => ALL_MODULES.includes(m))).toBe(true);
  });

  it("o padrão do funcionário é subconjunto do que dá para conceder", () => {
    expect(FUNCIONARIO_DEFAULT.every((m) => GRANTABLE_MODULES.includes(m))).toBe(true);
  });

  it("reconhece módulo válido e recusa o resto", () => {
    expect(isAppModule("vagas")).toBe(true);
    expect(isAppModule("modulo_inventado")).toBe(false);
    expect(isAppModule("")).toBe(false);
  });

  it("rotula módulo conhecido e devolve a chave no desconhecido", () => {
    expect(moduleLabel("vagas")).not.toBe("vagas");
    expect(moduleLabel("modulo_inventado")).toBe("modulo_inventado");
  });

  it("reconhece capacidade válida e recusa o resto", () => {
    expect(isCapability(CAPABILITIES[0]!)).toBe(true);
    expect(isCapability("capacidade_inventada")).toBe(false);
  });

  it("rotula capacidade conhecida e devolve a chave na desconhecida", () => {
    expect(capabilityLabel(CAPABILITIES[0]!)).not.toBe(CAPABILITIES[0]);
    expect(capabilityLabel("capacidade_inventada")).toBe("capacidade_inventada");
  });

  it("todo módulo do painel tem rótulo, rota e ícone preenchidos", () => {
    for (const m of PANEL_MODULES) {
      expect(m.label.trim()).not.toBe("");
      expect(m.href.startsWith("/")).toBe(true);
      expect(m.icon.trim()).not.toBe("");
    }
  });
});

describe("contas de exemplo", () => {
  it("cobre um papel por chave, com e-mail e nome preenchidos", () => {
    for (const [papel, conta] of Object.entries(CONTAS_EXEMPLO)) {
      expect(papel.trim()).not.toBe("");
      expect(conta.email).toMatch(/@/);
      expect(conta.nome.trim()).not.toBe("");
    }
  });

  it("não repete e-mail entre contas", () => {
    const emails = Object.values(CONTAS_EXEMPLO).map((c) => c.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("reconhece papel de exemplo e recusa o resto", () => {
    const primeiro = Object.keys(CONTAS_EXEMPLO)[0]!;
    expect(isPapelExemplo(primeiro)).toBe(true);
    expect(isPapelExemplo("papel_inventado")).toBe(false);
  });

  it("tem uma senha única e não vazia para as contas de demonstração", () => {
    expect(SENHA_CONTA_EXEMPLO.length).toBeGreaterThan(6);
  });
});

describe("denúncias", () => {
  it("não repete slug de motivo — o slug é o check constraint da tabela", () => {
    const slugs = MOTIVOS_DENUNCIA.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("todo motivo tem os dois textos: o curto da moderação e o longo de quem denuncia", () => {
    for (const m of MOTIVOS_DENUNCIA) {
      expect(m.curto.trim()).not.toBe("");
      expect(m.label.trim()).not.toBe("");
      expect(m.curto).not.toBe(m.label);
    }
  });

  it("traduz o slug para o rótulo curto e devolve o slug no desconhecido", () => {
    expect(motivoCurto("fraude")).toBe("Fraude");
    expect(motivoCurto("motivo_inventado")).toBe("motivo_inventado");
  });

  it("todo alvo de denúncia tem rótulo", () => {
    for (const alvo of ALVOS_DENUNCIA) {
      expect(ALVO_LABEL[alvo]?.trim()).not.toBe("");
    }
    expect(Object.keys(ALVO_LABEL).sort()).toEqual([...ALVOS_DENUNCIA].sort());
  });
});
