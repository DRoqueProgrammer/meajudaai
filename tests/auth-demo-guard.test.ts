import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEMO_ACCOUNTS,
  DEMO_EMAILS,
  DEMO_READONLY_MESSAGE,
  isDemo,
  isDemoEmail,
} from "../lib/auth/demo";
import type { CurrentUser } from "../lib/auth/roles";

// Contas de demonstração são públicas: qualquer visitante entra por elas na
// landing. A regra que as torna seguras é uma só — elas não escrevem no banco
// compartilhado, senão um visitante altera a demo de todos os outros. Estava em
// 0% de cobertura, e é exatamente o tipo de regra que some numa refatoração sem
// ninguém perceber, porque a tela continua funcionando.

let usuarioAtual: CurrentUser | null;
let erroDeSessao: Error | null = null;

vi.mock("@/lib/auth/roles", () => ({
  requireUser: async () => {
    if (erroDeSessao) throw erroDeSessao;
    return usuarioAtual;
  },
}));

const { requireWriter, tryWriter, DemoReadOnlyError } = await import("../lib/auth/guard");

const EMAIL_DEMO = DEMO_ACCOUNTS.joao.email;

function usuario(email: string): CurrentUser {
  return { id: "u-1", email, role: "prestador_servico" } as CurrentUser;
}

beforeEach(() => {
  erroDeSessao = null;
  usuarioAtual = usuario("real@meajudaai.app");
});

describe("catálogo de contas demo", () => {
  it("tem e-mail, senha e nome em todas", () => {
    for (const conta of Object.values(DEMO_ACCOUNTS)) {
      expect(conta.email).toMatch(/@/);
      expect(conta.password.length).toBeGreaterThan(6);
      expect(conta.nome.trim()).not.toBe("");
    }
  });

  it("não repete e-mail entre contas", () => {
    const emails = Object.values(DEMO_ACCOUNTS).map((c) => c.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("o conjunto de e-mails cobre exatamente o catálogo", () => {
    // Se uma conta nova entrar no catálogo e não no conjunto, ela ganharia
    // permissão de escrita sem ninguém decidir isso.
    expect(DEMO_EMAILS.size).toBe(Object.keys(DEMO_ACCOUNTS).length);
    for (const conta of Object.values(DEMO_ACCOUNTS)) {
      expect(DEMO_EMAILS.has(conta.email)).toBe(true);
    }
  });
});

describe("isDemoEmail", () => {
  it("reconhece e-mail de conta demo", () => {
    expect(isDemoEmail(EMAIL_DEMO)).toBe(true);
  });

  it("ignora caixa e espaço em volta — o login não normaliza por nós", () => {
    expect(isDemoEmail(EMAIL_DEMO.toUpperCase())).toBe(true);
    expect(isDemoEmail(`  ${EMAIL_DEMO}  `)).toBe(true);
  });

  it("não confunde conta real com demo", () => {
    expect(isDemoEmail("joao.ferreira@meajudaai.app")).toBe(false);
  });

  it("trata ausência de e-mail como conta real, não como demo", () => {
    // O lado seguro aqui é o oposto do usual: marcar alguém como demo por
    // engano tiraria a escrita de um usuário legítimo.
    expect(isDemoEmail(null)).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
    expect(isDemoEmail("")).toBe(false);
  });
});

describe("isDemo", () => {
  it("olha o e-mail do usuário logado", () => {
    expect(isDemo({ email: EMAIL_DEMO })).toBe(true);
    expect(isDemo({ email: "real@meajudaai.app" })).toBe(false);
  });

  it("aguenta usuário nulo", () => {
    expect(isDemo(null)).toBe(false);
    expect(isDemo(undefined)).toBe(false);
  });
});

describe("requireWriter — guard de escrita", () => {
  it("deixa passar conta real", async () => {
    await expect(requireWriter()).resolves.toMatchObject({ email: "real@meajudaai.app" });
  });

  it("barra conta demo com o erro tipado", async () => {
    usuarioAtual = usuario(EMAIL_DEMO);
    await expect(requireWriter()).rejects.toBeInstanceOf(DemoReadOnlyError);
  });

  it("a mensagem do erro é a que o usuário lê na tela", async () => {
    usuarioAtual = usuario(EMAIL_DEMO);
    await expect(requireWriter()).rejects.toThrow(DEMO_READONLY_MESSAGE);
  });

  it("propaga falha de sessão em vez de deixar passar", async () => {
    erroDeSessao = new Error("sem sessão");
    await expect(requireWriter()).rejects.toThrow();
  });
});

describe("tryWriter — versão que nunca estoura", () => {
  it("devolve o usuário quando pode escrever", async () => {
    const r = await tryWriter();
    expect(r).toHaveProperty("user");
  });

  it("devolve a mensagem de modo demo em vez de estourar", async () => {
    // Erro que estoura numa server action chega ao cliente redigido como "algo
    // deu errado"; aqui a mensagem precisa sobreviver inteira até a tela.
    usuarioAtual = usuario(EMAIL_DEMO);
    const r = await tryWriter();
    expect(r).toEqual({ erro: DEMO_READONLY_MESSAGE });
  });

  it("traduz falha de sessão numa mensagem acionável", async () => {
    erroDeSessao = new Error("jwt expired");
    const r = await tryWriter();
    expect(r).toHaveProperty("erro");
    expect((r as { erro: string }).erro).toMatch(/entre novamente/i);
    // O texto cru do erro interno não pode vazar para a tela.
    expect((r as { erro: string }).erro).not.toContain("jwt");
  });
});
