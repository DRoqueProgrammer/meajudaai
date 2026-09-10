import { describe, it, expect } from "vitest";
import { boasVindas } from "../lib/saudacao";
import { papelLabel, PAPEL_LABEL } from "../lib/papel-label";

// A regra de três formas (masculino / feminino / neutro com -e) é uma convenção
// de produto declarada no ROADMAP §12 e repetida no CLAUDE.md: todo texto novo
// que mencione o papel de alguém tem que passar por aqui, nunca por string fixa.
// Estes testes existem para que quebrar a regra quebre a suíte.

describe("boasVindas", () => {
  it("usa a forma que corresponde ao gênero cadastrado", () => {
    expect(boasVindas("masculino", "João")).toBe("Bem-vindo, João!");
    expect(boasVindas("feminino", "Marina")).toBe("Bem-vinda, Marina!");
  });

  it("cai na forma neutra quando o gênero não foi informado ou não se aplica", () => {
    // "Prefiro não responder", nulo, ou qualquer valor inesperado: a saudação
    // continua correta em vez de assumir masculino como padrão.
    expect(boasVindas("prefiro_nao_responder", "Alex")).toBe("Bem-vinde, Alex!");
    expect(boasVindas(null, "Alex")).toBe("Bem-vinde, Alex!");
    expect(boasVindas("", "Alex")).toBe("Bem-vinde, Alex!");
  });
});

describe("papelLabel", () => {
  it("flexiona os papéis que têm forma de gênero", () => {
    expect(papelLabel("admin", "masculino")).toBe("Administrador");
    expect(papelLabel("admin", "feminino")).toBe("Administradora");
    expect(papelLabel("admin", "prefiro_nao_responder")).toBe("Administradore");

    expect(papelLabel("funcionario", "masculino")).toBe("Funcionário");
    expect(papelLabel("funcionario", "feminino")).toBe("Funcionária");
    expect(papelLabel("funcionario", null)).toBe("Funcionárie");

    expect(papelLabel("prestador_servico", "masculino")).toBe("Prestador de Serviço");
    expect(papelLabel("prestador_servico", "feminino")).toBe("Prestadora de Serviço");
    expect(papelLabel("prestador_servico", undefined)).toBe("Prestadore de Serviço");
  });

  it("mantém invariável o papel que não flexiona", () => {
    // "Cliente" e "SysAdmin" são iguais nas três formas — o teste trava isso
    // para que ninguém invente "Clienta" achando que segue a regra.
    for (const genero of ["masculino", "feminino", null]) {
      expect(papelLabel("cliente", genero)).toBe("Cliente");
      expect(papelLabel("sysadmin", genero)).toBe("SysAdmin");
    }
  });

  it("cai em Cliente quando o papel é desconhecido, em vez de quebrar a tela", () => {
    // @ts-expect-error — papel fora do enum é exatamente o caso defendido aqui.
    expect(papelLabel("papel_que_nao_existe", "masculino")).toBe("Cliente");
  });
});

describe("PAPEL_LABEL", () => {
  it("é a forma neutra de cada papel", () => {
    expect(PAPEL_LABEL.admin).toBe(papelLabel("admin", null));
    expect(PAPEL_LABEL.funcionario).toBe(papelLabel("funcionario", null));
    expect(PAPEL_LABEL.prestador_servico).toBe(papelLabel("prestador_servico", null));
    expect(PAPEL_LABEL.cliente).toBe(papelLabel("cliente", null));
    expect(PAPEL_LABEL.sysadmin).toBe(papelLabel("sysadmin", null));
  });

  it("cobre os 5 papéis do schema, sem sobra nem falta", () => {
    // Se a constraint do banco ganhar um papel novo e este mapa não, a UI
    // mostraria `undefined` no lugar do rótulo.
    expect(Object.keys(PAPEL_LABEL).sort()).toEqual(
      ["admin", "cliente", "funcionario", "prestador_servico", "sysadmin"].sort(),
    );
  });
});
