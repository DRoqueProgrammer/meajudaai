import { describe, it, expect, vi, afterEach } from "vitest";
import { arredCoord, formatTelefone } from "../lib/format";
import { isPeriodo, PERIODOS } from "../lib/periodo";
import { rateLimit } from "../lib/rate-limit";

// Os últimos caminhos de `lib/` que nenhum teste percorria. Nenhum deles é
// decorativo: um arredonda a coordenada que protege o endereço de uma obra,
// outro valida query param vindo da URL, e o terceiro é a varredura que impede
// o balde de rate limit de vazar memória num processo longo.

afterEach(() => {
  vi.useRealTimers();
});

describe("arredCoord — o borrão que protege o endereço exato", () => {
  it("arredonda para 2 casas, cerca de 1,1 km de imprecisão", () => {
    expect(arredCoord(-22.883456)).toBe(-22.88);
    expect(arredCoord(-43.103999)).toBe(-43.1);
  });

  it("arredonda para cima quando a metade é exata na máquina", () => {
    expect(arredCoord(1.045)).toBe(1.05); // 1.045*100 === 104.5, exato
    expect(arredCoord(1.004)).toBe(1);
  });

  it("desce em alguns casos de metade — é ponto flutuante, não defeito", () => {
    // `1.005 * 100` dá 100.49999999999999 em IEEE-754: a "metade exata" não
    // existe em binário para esses valores, então o arredondamento desce.
    // O teste registra o comportamento real para ninguém "consertar" a função
    // depois achando que achou um bug. Para um borrão de ~1,1 km em
    // coordenada, a diferença é irrelevante — mas a surpresa não é.
    expect(arredCoord(1.005)).toBe(1);
    expect(arredCoord(1.015)).toBe(1.01);
  });

  it("não perde o sinal de coordenada negativa", () => {
    // O Brasil inteiro é latitude negativa: perder o sinal jogaria o pino no
    // hemisfério norte.
    expect(arredCoord(-0.006)).toBe(-0.01);
    expect(arredCoord(0)).toBe(0);
  });
});

describe("formatTelefone", () => {
  it("formata um celular brasileiro com DDI, DDD e hífen", () => {
    expect(formatTelefone("21988880005")).toBe("+55 (21) 98888-0005");
  });

  it("não duplica o DDI quando o número já vem com 55", () => {
    expect(formatTelefone("5521988880005")).toBe("+55 (21) 98888-0005");
  });

  it("aceita o número já formatado, ignorando a pontuação", () => {
    expect(formatTelefone("+55 (21) 98888-0005")).toBe("+55 (21) 98888-0005");
  });

  it("não confunde DDD 55 com DDI 55", () => {
    // 11 dígitos começando em 55 é DDD do interior de SP, não DDI — cortar os
    // dois primeiros dígitos aqui destruiria o número.
    expect(formatTelefone("55988880005")).toBe("+55 (55) 98888-0005");
  });

  it("devolve o que dá para mostrar mesmo com número incompleto", () => {
    expect(formatTelefone("2198888")).toContain("+55");
  });
});

describe("isPeriodo", () => {
  it("aceita os quatro valores do catálogo", () => {
    for (const p of PERIODOS) expect(isPeriodo(p.value)).toBe(true);
  });

  it("recusa o resto — o query param vem da URL e não é confiável", () => {
    for (const v of ["semana", "MES", "", undefined, "6meses"]) {
      expect(isPeriodo(v)).toBe(false);
    }
  });
});

describe("rate limit — varredura do balde", () => {
  it("varre os expirados quando o balde cresce demais, sem recusar chave nova", () => {
    // O teto de segurança existe para o Map não vazar memória num processo
    // longo. O caminho da varredura só é alcançado acima de 10.000 chaves, e
    // precisa continuar liberando quem chega depois dela.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));

    for (let i = 0; i < 10_050; i++) {
      rateLimit(`varredura:antiga-${i}`, 5, 1_000);
    }

    // Todas as janelas acima já venceram; a próxima inserção dispara a varredura.
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 30));
    const depois = rateLimit("varredura:nova", 5, 60_000);
    expect(depois.ok).toBe(true);
    expect(depois.restante).toBe(4);

    // E uma chave antiga, já expirada, recomeça a cota do zero em vez de
    // continuar contando de antes.
    const reciclada = rateLimit("varredura:antiga-0", 5, 60_000);
    expect(reciclada.ok).toBe(true);
    expect(reciclada.restante).toBe(4);
  });
});
