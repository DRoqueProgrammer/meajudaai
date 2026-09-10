import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as papeis from "@/lib/auth/papeis";

/**
 * Gabarito da tarefa 4 da Fatia 1 — R-44 (ADR 0013; decisão D-016).
 *
 * Ninguém se torna Administrador por conta própria. Contrato da tarefa:
 * `lib/auth/papeis.ts` exporta a regra única —
 * - `PAPEIS_DO_CADASTRO_PUBLICO`: só Cliente e Prestador de Serviço;
 * - `papelPermitidoNoCadastro(tipo, temConvite)`: sem convite, só os dois acima;
 *   com convite, o papel que o convite trouxer;
 * - `podeTrocarPara(atual, novo)`: nunca leva a Administrador;
 * e o cadastro e a troca de papel usam essa regra.
 */

const leitura = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");

describe("Fatia 1 · ninguém se torna Administrador sozinho", () => {
  it("o cadastro público oferece só Cliente e Prestador de Serviço", () => {
    expect([...papeis.PAPEIS_DO_CADASTRO_PUBLICO].sort()).toEqual(["cliente", "prestador_servico"]);
  });

  it("sem convite, papel administrativo é recusado no cadastro", () => {
    expect(papeis.papelPermitidoNoCadastro("admin", false)).toBe(false);
    expect(papeis.papelPermitidoNoCadastro("funcionario", false)).toBe(false);
    expect(papeis.papelPermitidoNoCadastro("sysadmin", false)).toBe(false);
  });

  it("sem convite, Cliente e Prestador passam", () => {
    expect(papeis.papelPermitidoNoCadastro("cliente", false)).toBe(true);
    expect(papeis.papelPermitidoNoCadastro("prestador_servico", false)).toBe(true);
  });

  it("papel desconhecido nunca passa", () => {
    expect(papeis.papelPermitidoNoCadastro("dono_do_mundo", false)).toBe(false);
    expect(papeis.papelPermitidoNoCadastro("dono_do_mundo", true)).toBe(false);
  });

  it("com convite, o papel do convite continua valendo", () => {
    expect(papeis.papelPermitidoNoCadastro("admin", true)).toBe(true);
    expect(papeis.papelPermitidoNoCadastro("funcionario", true)).toBe(true);
  });

  it("a troca de papel nunca leva a Administrador", () => {
    expect(papeis.podeTrocarPara("prestador_servico", "admin")).toBe(false);
    expect(papeis.podeTrocarPara("cliente", "admin")).toBe(false);
    expect(papeis.podeTrocarPara("admin", "admin")).toBe(false);
  });

  it("a tela de cadastro não oferece mais 'Tenho uma empresa'", () => {
    expect(leitura("app/(auth)/cadastro/form.tsx")).not.toMatch(/Tenho uma empresa/);
  });

  it("o cadastro e a troca de papel usam a regra única", () => {
    const auth = leitura("lib/actions/auth.ts");
    expect(auth).toMatch(/papelPermitidoNoCadastro/);
    expect(auth).toMatch(/podeTrocarPara/);
  });
});
