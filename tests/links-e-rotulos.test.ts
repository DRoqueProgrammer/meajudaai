import { describe, it, expect } from "vitest";
import { waLink, waShareLink } from "../lib/whatsapp";
import { googleMapsUrl, wazeUrl, geoUri, coordLabel } from "../lib/maps-share";
import { CATEGORIAS, nomeCategoria } from "../lib/categorias";
import { mailtoSuporte, SUPORTE_EMAIL } from "../lib/contato";

// Construtores de link e rótulo: pequenos, puros, e usados em todo lugar onde o
// usuário sai do app (WhatsApp, mapa, suporte). Estavam todos em 0% de cobertura.
// Um erro aqui manda a pessoa para um número errado ou para lugar nenhum.

describe("waLink", () => {
  it("descarta a formatação do telefone e mantém só os dígitos", () => {
    expect(waLink("(21) 96705-8428")).toBe("https://wa.me/5521967058428");
    expect(waLink("21 96705 8428")).toBe("https://wa.me/5521967058428");
  });

  it("assume DDI 55 quando o número não traz", () => {
    expect(waLink("21967058428")).toBe("https://wa.me/5521967058428");
  });

  it("não duplica o DDI quando ele já veio", () => {
    expect(waLink("+55 21 96705-8428")).toBe("https://wa.me/5521967058428");
    expect(waLink("5521967058428")).toBe("https://wa.me/5521967058428");
  });
});

describe("waShareLink", () => {
  it("abre o seletor de contato, sem destinatário fixo", () => {
    expect(waShareLink("oi").startsWith("https://wa.me/?text=")).toBe(true);
  });

  it("codifica o texto — endereço tem espaço, vírgula e acento", () => {
    const link = waShareLink("Rua São João, 10 — Niterói");
    expect(link).not.toContain(" ");
    expect(decodeURIComponent(link.split("text=")[1]!)).toBe("Rua São João, 10 — Niterói");
  });
});

describe("links de mapa", () => {
  const lat = -22.883;
  const lng = -43.1036;

  it("monta o deep link do Google Maps com a coordenada", () => {
    expect(googleMapsUrl(lat, lng)).toBe(
      "https://www.google.com/maps/search/?api=1&query=-22.883,-43.1036",
    );
  });

  it("monta o deep link do Waze já em modo navegação", () => {
    expect(wazeUrl(lat, lng)).toContain("navigate=yes");
    expect(wazeUrl(lat, lng)).toContain("-22.883,-43.1036");
  });

  it("monta o geo: com q= redundante, para o link sobreviver onde o esquema puro não é honrado", () => {
    expect(geoUri(lat, lng)).toBe("geo:-22.883,-43.1036?q=-22.883,-43.1036");
  });

  it("mostra a coordenada com 6 casas, estáveis", () => {
    expect(coordLabel(lat, lng)).toBe("-22.883000, -43.103600");
    expect(coordLabel(0, 0)).toBe("0.000000, 0.000000");
  });
});

describe("categorias", () => {
  it("traduz o slug para o nome da profissão real", () => {
    expect(nomeCategoria("ajudante_eletricista")).toBe("Eletricista");
    expect(nomeCategoria("mestre_obras")).toBe("Mestre de Obras");
  });

  it("devolve o próprio slug quando não conhece — nunca vazio na tela", () => {
    expect(nomeCategoria("categoria_inexistente")).toBe("categoria_inexistente");
  });

  it("mantém os slugs antigos com prefixo ajudante_", () => {
    // Trocar o slug orfanaria os prestadores já cadastrados com ele: o valor é
    // gravado em profiles.categoria desde a v1. Só o nome exibido mudou.
    const comPrefixoAntigo = CATEGORIAS.filter((c) => c.slug.startsWith("ajudante_"));
    expect(comPrefixoAntigo.length).toBeGreaterThan(0);
    expect(comPrefixoAntigo.every((c) => !c.nome.startsWith("Ajudante"))).toBe(true);
  });

  it("não tem slug repetido", () => {
    expect(new Set(CATEGORIAS.map((c) => c.slug)).size).toBe(CATEGORIAS.length);
  });
});

describe("mailtoSuporte", () => {
  it("monta o mailto do canal de suporte", () => {
    expect(mailtoSuporte()).toBe(`mailto:${SUPORTE_EMAIL}`);
  });

  it("codifica o assunto quando ele vem", () => {
    const link = mailtoSuporte("Erro ao pagar comissão");
    expect(link.startsWith(`mailto:${SUPORTE_EMAIL}?subject=`)).toBe(true);
    expect(link).not.toContain(" ");
    expect(decodeURIComponent(link.split("subject=")[1]!)).toBe("Erro ao pagar comissão");
  });
});
