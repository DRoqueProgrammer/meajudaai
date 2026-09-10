import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit } from "../lib/rate-limit";

// Primeira barreira contra abuso nas server actions de escrita, e estava em 0%.
// Um erro aqui não aparece na tela: ou o limite não segura ninguém, ou segura
// gente legítima. Os testes usam relógio falso porque a função é uma janela fixa
// no tempo — sem controlar o relógio, provar a expiração exigiria esperar de
// verdade, e o teste ficaria lento e instável.
//
// Cada teste usa uma chave própria: o balde é um Map de módulo, compartilhado
// entre testes, e chaves repetidas fariam um teste contaminar o outro.

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("libera a primeira chamada e informa quanto sobrou da cota", () => {
    const r = rateLimit("t1:primeira", 3, 60_000);
    expect(r.ok).toBe(true);
    expect(r.restante).toBe(2);
    expect(r.retryEmMs).toBe(0);
  });

  it("consome a cota a cada chamada, até zerar", () => {
    expect(rateLimit("t2:cota", 3, 60_000).restante).toBe(2);
    expect(rateLimit("t2:cota", 3, 60_000).restante).toBe(1);
    expect(rateLimit("t2:cota", 3, 60_000).restante).toBe(0);
  });

  it("bloqueia depois de estourar o limite e diz quando tentar de novo", () => {
    for (let i = 0; i < 3; i++) rateLimit("t3:estouro", 3, 60_000);
    const bloqueada = rateLimit("t3:estouro", 3, 60_000);
    expect(bloqueada.ok).toBe(false);
    expect(bloqueada.restante).toBe(0);
    expect(bloqueada.retryEmMs).toBeGreaterThan(0);
    expect(bloqueada.retryEmMs).toBeLessThanOrEqual(60_000);
  });

  it("não mistura cotas de chaves diferentes", () => {
    // "candidatar:userA" não pode gastar a cota de "candidatar:userB".
    for (let i = 0; i < 3; i++) rateLimit("t4:userA", 3, 60_000);
    expect(rateLimit("t4:userA", 3, 60_000).ok).toBe(false);
    expect(rateLimit("t4:userB", 3, 60_000).ok).toBe(true);
  });

  it("libera de novo quando a janela expira", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));
    for (let i = 0; i < 2; i++) rateLimit("t5:janela", 2, 60_000);
    expect(rateLimit("t5:janela", 2, 60_000).ok).toBe(false);

    vi.setSystemTime(new Date(2026, 8, 9, 12, 1, 1)); // 61s depois
    const depois = rateLimit("t5:janela", 2, 60_000);
    expect(depois.ok).toBe(true);
    expect(depois.restante).toBe(1);
  });

  it("é janela fixa, não deslizante — chamada no fim da janela não a prorroga", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));
    rateLimit("t6:fixa", 5, 60_000); // abre a janela: fecha às 12:01:00

    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 59));
    const quaseFim = rateLimit("t6:fixa", 5, 60_000);
    expect(quaseFim.retryEmMs).toBe(0);

    vi.setSystemTime(new Date(2026, 8, 9, 12, 1, 1));
    // A janela fechou pelo horário de abertura, não pela última chamada.
    expect(rateLimit("t6:fixa", 5, 60_000).restante).toBe(4);
  });

  it("com limite 1 bloqueia já na segunda chamada", () => {
    expect(rateLimit("t7:unico", 1, 60_000).ok).toBe(true);
    expect(rateLimit("t7:unico", 1, 60_000).ok).toBe(false);
  });

  it("aguenta muitas chaves distintas sem quebrar", () => {
    // O balde tem varredura de expirados acima de um teto; o caminho não pode
    // estourar nem passar a recusar chave nova.
    for (let i = 0; i < 500; i++) {
      expect(rateLimit(`t8:chave-${i}`, 2, 60_000).ok).toBe(true);
    }
  });
});
