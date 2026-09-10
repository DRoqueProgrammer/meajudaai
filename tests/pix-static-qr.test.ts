import { describe, it, expect } from "vitest";
import { crc16, sanitizarAscii, mascararChavePix, montarPixEstatico } from "../lib/pix/static-qr";

// Este módulo monta cobrança de dinheiro, e estava em 0% de cobertura. Um erro
// aqui não quebra a tela: gera um código que o banco recusa, ou pior, que aponta
// para a chave errada. Os testes abaixo checam invariantes do padrão EMV/BR Code
// do Bacen, não o formato de saída — é o que continua valendo se a implementação
// for reescrita.

describe("crc16", () => {
  it("bate o valor canônico de verificação do CRC-16/CCITT-FALSE", () => {
    // Valor de referência publicado para o algoritmo: crc16("123456789") = 29B1.
    // Se esta linha cair, o algoritmo está errado e todo código gerado é inválido.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("devolve sempre 4 caracteres hexadecimais maiúsculos", () => {
    for (const entrada of ["", "a", "pix", "0".repeat(200)]) {
      expect(crc16(entrada)).toMatch(/^[0-9A-F]{4}$/);
    }
  });

  it("muda quando o payload muda em um caractere", () => {
    expect(crc16("PIX00A")).not.toBe(crc16("PIX00B"));
  });
});

describe("sanitizarAscii", () => {
  it("remove acentos preservando a letra base", () => {
    expect(sanitizarAscii("João Ferreira", 25)).toBe("JOAO FERREIRA");
    expect(sanitizarAscii("Niterói", 15)).toBe("NITEROI");
  });

  it("descarta o que não é letra, número ou espaço", () => {
    expect(sanitizarAscii("Ação & Cia. #1", 25)).toBe("ACAO  CIA 1");
  });

  it("corta DEPOIS de limpar, não antes", () => {
    // "José" tem 4 caracteres; se o corte viesse antes da limpeza, o acento
    // consumiria posição e o resultado sairia menor que o pedido.
    expect(sanitizarAscii("José", 4)).toBe("JOSE");
    expect(sanitizarAscii("ME AJUDA AI NITEROI", 7)).toBe("ME AJUD");
  });

  it("devolve string vazia quando não sobra nada aproveitável", () => {
    expect(sanitizarAscii("!!!", 10)).toBe("");
  });
});

describe("mascararChavePix", () => {
  it("mascara o miolo de uma chave longa", () => {
    const mascarada = mascararChavePix("12.345.678/0001-90");
    expect(mascarada.startsWith("12.")).toBe(true);
    expect(mascarada.endsWith("-90")).toBe(true);
    expect(mascarada).toContain("••••");
    expect(mascarada).not.toContain("345");
  });

  it("não mascara chave curta demais para esconder alguma coisa", () => {
    expect(mascararChavePix("abc")).toBe("abc");
    expect(mascararChavePix("123456")).toBe("123456");
  });

  it("ignora espaço em volta", () => {
    expect(mascararChavePix("  1234567890  ")).toBe(mascararChavePix("1234567890"));
  });
});

describe("montarPixEstatico", () => {
  const base = { chave: "leo@meajudaai.app", nome: "Me Ajuda Ai", cidade: "Niterói" };

  it("recusa chave vazia em vez de emitir código inválido", () => {
    expect(() => montarPixEstatico({ ...base, chave: "" })).toThrow();
    expect(() => montarPixEstatico({ ...base, chave: "   " })).toThrow();
  });

  it("fecha com um CRC que confere sobre o próprio payload", () => {
    // A invariante que o banco checa: os 4 últimos caracteres são o CRC de tudo
    // que vem antes. Recalcular e comparar prova o payload inteiro de uma vez.
    const payload = montarPixEstatico({ ...base, valor: 137.5 });
    const corpo = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(crc16(corpo));
  });

  it("abre com o indicador de formato e marca o método estático", () => {
    const payload = montarPixEstatico(base);
    expect(payload.startsWith("000201")).toBe(true); // formato 01
    expect(payload).toContain("010211"); // método 11 = estático/reutilizável
  });

  it("carrega o domínio do Pix e a chave do recebedor", () => {
    const payload = montarPixEstatico(base);
    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("leo@meajudaai.app");
  });

  it("grava o valor com 2 casas quando informado", () => {
    expect(montarPixEstatico({ ...base, valor: 137.5 })).toContain("5406137.50");
    expect(montarPixEstatico({ ...base, valor: 7 })).toContain("54047.00");
  });

  it("omite o campo de valor quando ele não vem, é zero ou é negativo", () => {
    // Sem valor, quem paga digita — é o comportamento do Pix estático.
    for (const valor of [undefined, 0, -5]) {
      const payload = montarPixEstatico({ ...base, valor });
      const corpo = payload.slice(0, -4);
      expect(payload.slice(-4)).toBe(crc16(corpo)); // segue válido
      expect(payload).not.toContain("5406");
    }
  });

  it("sanitiza nome e cidade — o leitor do banco trava com não-ASCII", () => {
    const payload = montarPixEstatico({ ...base, nome: "João & Cia", cidade: "Niterói" });
    expect(payload).toContain("NITEROI");
    expect(payload).toContain("JOAO  CIA");
    expect(payload).not.toContain("ó");
  });

  it("cai em valores padrão quando nome e cidade não sobram da limpeza", () => {
    const payload = montarPixEstatico({ ...base, nome: "!!!", cidade: "###" });
    expect(payload).toContain("RECEBEDOR");
    expect(payload).toContain("BRASIL");
  });

  it("usa *** como identificador quando nenhum txid é passado", () => {
    expect(montarPixEstatico(base)).toContain("***");
    expect(montarPixEstatico({ ...base, txid: "MAA0001" })).toContain("MAA0001");
  });
});
