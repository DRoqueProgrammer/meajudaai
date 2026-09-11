import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * No meio do QR Pix vai QUEM RECEBE — o mesmo nome do BR Code (campo 59):
 * na cobrança de um serviço, o prestador; no QR do perfil, o dono da chave;
 * na comissão, o Administrador da praça. Leonardo, 11/09/2026: a cobrança do
 * serviço mostrava o nome do CLIENTE no meio e parecia ser da pessoa errada
 * (a chave e o recebedor já eram do prestador — conferido lendo o QR).
 */
const ler = (c: string) => readFileSync(new URL(`../../${c}`, import.meta.url), "utf8");

describe("nome no meio do QR Pix", () => {
  it("cobrança do serviço: o prestador, nunca o cliente", () => {
    const src = ler("components/pix/cobranca-pix.tsx");
    expect(src).toMatch(/nome: nomePrestador, data:/);
    expect(src).not.toMatch(/nome: nomeCliente/);
    expect(src).toMatch(/montarPixEstatico\(\{ chave: chavePix, nome: nomePrestador/);
  });

  it("QR do perfil: o dono da chave, mesmo com descrição", () => {
    const src = ler("components/pix/gerador-qr-pix.tsx");
    expect(src).toMatch(/\(\) => \(\{ nome, data: hoje/);
    expect(src).not.toMatch(/nome: descricao/);
  });

  it("comissão: o Administrador que recebe", () => {
    expect(ler("app/(app)/comissao/page.tsx")).toMatch(/linhas=\{\{ nome: destino\.recebedor/);
  });
});
