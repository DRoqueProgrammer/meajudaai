import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { podeRodar, servico, url, anon, sufixo, novoRegistro, criarPessoa, entrar, limpar } from "../fatia1/harness";

/**
 * Gabarito do banco dos anúncios do prestador (migration 0044), escrito pelo
 * controller antes das telas (D-026). Decisão do Leonardo em 10/09/2026:
 * o prestador publica até X anúncios ativos — oferta de serviço ou vaga para
 * ajudante sem conta (com WhatsApp, no mural público da página inicial) —, e o
 * X vem do ajuste do prestador, senão do padrão da praça da cidade dele (do
 * mesmo mundo, exemplo ou real), senão 3.
 */
describe.skipIf(!podeRodar)("Anúncios · contrato do banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const UF = "ZZ";
  const cidadeLivre = `Cidade Livre ${s}`;
  const cidadePraca = `Cidade Praça ${s}`;
  const cidadeExemplo = `Cidade Exemplo ${s}`;
  const email = (n: string) => `f1-anuncio-${n}-${s}@teste.dev`;
  let P = ""; // prestador em cidade sem praça → padrão da plataforma (3)
  let P2 = ""; // prestador na cidade da praça real (padrão 1)
  let P3 = ""; // prestador real na cidade de uma praça do mundo de exemplo (padrão 0)
  let E = ""; // prestador de exemplo
  let C = ""; // cliente
  let publico: SupabaseClient;
  const base = (extra: Record<string, unknown> = {}) => ({
    tipo: "servico",
    titulo: `Instalação elétrica ${s}`,
    descricao: "Instalo tomadas, chuveiros e quadros de luz com garantia.",
    categoria: "ajudante_eletricista",
    ...extra,
  });

  beforeAll(async () => {
    publico = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    const prest = (cidade: string, extra: Record<string, unknown> = {}) => ({
      preco_tipo: "hora",
      preco_valor: 60,
      categoria: "ajudante_eletricista",
      cidade,
      estado: UF,
      ...extra,
    });
    P = await criarPessoa(reg, email("p"), "prestador_servico", prest(cidadeLivre));
    P2 = await criarPessoa(reg, email("p2"), "prestador_servico", prest(cidadePraca));
    P3 = await criarPessoa(reg, email("p3"), "prestador_servico", prest(cidadeExemplo));
    E = await criarPessoa(reg, email("e"), "prestador_servico", prest(cidadeLivre, { exemplo: true }));
    C = await criarPessoa(reg, email("c"), "cliente", { cidade: cidadeLivre, estado: UF });
    const adminReal = await criarPessoa(reg, email("adm"), "admin", { cidade: cidadePraca, estado: UF });
    const adminExemplo = await criarPessoa(reg, email("adme"), "admin", { cidade: cidadeExemplo, estado: UF, exemplo: true });
    const pracas = await servico!
      .from("workspaces")
      .insert([
        { owner_id: adminReal, nome: `Praça real ${s}`, cidade: cidadePraca, estado: UF, limite_anuncios_padrao: 1 },
        { owner_id: adminExemplo, nome: `Praça exemplo ${s}`, cidade: cidadeExemplo, estado: UF, limite_anuncios_padrao: 0 },
      ])
      .select("id");
    if (pracas.error) throw pracas.error;
    reg.pracas.push(...(pracas.data ?? []).map((w) => w.id as string));
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("prestador publica um anúncio de serviço e ele aparece para quem não fez login", async () => {
    const sessao = await entrar(email("p"));
    const ins = await sessao
      .from("anuncios")
      .insert({ prestador_id: P, ...base(), cidade: "Cidade Inventada", estado: "XX" })
      .select("id, cidade, estado")
      .single();
    expect(ins.error).toBeNull();
    expect(ins.data!.cidade).toBe(cidadeLivre);
    expect(ins.data!.estado).toBe(UF);

    const { data, error } = await publico.rpc("anuncios_publicos", { p_prestador: P });
    expect(error).toBeNull();
    const achado = (data ?? []).find((a: { id: string }) => a.id === ins.data!.id);
    expect(achado).toBeTruthy();
    expect(achado.titulo).toBe(`Instalação elétrica ${s}`);
    expect(achado.prestador_nome).toBeTruthy();
    expect(achado.whatsapp).toBeNull();
  });

  it("vaga para ajudante exige WhatsApp e mostra o número no mural", async () => {
    const sessao = await entrar(email("p"));
    const vaga = { tipo: "vaga_ajudante", titulo: `Ajudante de eletricista ${s}`, descricao: "Preciso de ajudante para obra de 3 dias em Icaraí." };
    const sem = await sessao.from("anuncios").insert({ prestador_id: P, ...vaga });
    expect(sem.error).not.toBeNull();

    const com = await sessao.from("anuncios").insert({ prestador_id: P, ...vaga, whatsapp: "21999998888" }).select("id").single();
    expect(com.error).toBeNull();
    const { data } = await publico.rpc("anuncios_publicos", { p_tipo: "vaga_ajudante", p_prestador: P });
    expect((data ?? []).map((a: { whatsapp: string }) => a.whatsapp)).toContain("21999998888");
  });

  it("sem praça nem ajuste, o limite é 3 anúncios ativos — pausado não conta", async () => {
    const sessao = await entrar(email("p"));
    expect((await sessao.rpc("limite_de_anuncios", { p_prestador: P })).data).toBe(3);

    const terceiro = await sessao.from("anuncios").insert({ prestador_id: P, ...base({ titulo: `Terceiro ${s}` }) });
    expect(terceiro.error).toBeNull();
    const quarto = await sessao.from("anuncios").insert({ prestador_id: P, ...base({ titulo: `Quarto ${s}` }) });
    expect(quarto.error?.message ?? "").toMatch(/limite/i);

    const pausado = await sessao
      .from("anuncios")
      .insert({ prestador_id: P, ...base({ titulo: `Pausado ${s}` }), status: "pausado" })
      .select("id")
      .single();
    expect(pausado.error).toBeNull();
    const ativar = await sessao.from("anuncios").update({ status: "ativo" }).eq("id", pausado.data!.id).select("id");
    expect(ativar.error?.message ?? "").toMatch(/limite/i);

    const { data: meus } = await sessao.from("anuncios").select("id").eq("status", "ativo").limit(1);
    const pausarUm = await sessao.from("anuncios").update({ status: "pausado" }).eq("id", meus![0].id);
    expect(pausarUm.error).toBeNull();
    const agora = await sessao.from("anuncios").update({ status: "ativo" }).eq("id", pausado.data!.id).select("id");
    expect(agora.error).toBeNull();
  });

  it("o padrão da praça vale para os prestadores da cidade dela", async () => {
    const sessao = await entrar(email("p2"));
    expect((await sessao.rpc("limite_de_anuncios", { p_prestador: P2 })).data).toBe(1);
    expect((await sessao.from("anuncios").insert({ prestador_id: P2, ...base() })).error).toBeNull();
    const segundo = await sessao.from("anuncios").insert({ prestador_id: P2, ...base({ titulo: `Segundo ${s}` }) });
    expect(segundo.error?.message ?? "").toMatch(/limite/i);
  });

  it("o ajuste por prestador vence o padrão da praça", async () => {
    const ajuste = await servico!.from("anuncio_limites").upsert({ prestador_id: P2, limite: 2 });
    expect(ajuste.error).toBeNull();
    const sessao = await entrar(email("p2"));
    expect((await sessao.rpc("limite_de_anuncios", { p_prestador: P2 })).data).toBe(2);
    expect((await sessao.from("anuncios").insert({ prestador_id: P2, ...base({ titulo: `Segundo ${s}` }) })).error).toBeNull();
  });

  it("praça do mundo de exemplo não mexe no limite de prestador real", async () => {
    const sessao = await entrar(email("p3"));
    expect((await sessao.rpc("limite_de_anuncios", { p_prestador: P3 })).data).toBe(3);
  });

  it("cliente não publica anúncio, e conta de exemplo também não", async () => {
    const cliente = await entrar(email("c"));
    expect((await cliente.from("anuncios").insert({ prestador_id: C, ...base() })).error).not.toBeNull();
    const exemplo = await entrar(email("e"));
    expect((await exemplo.from("anuncios").insert({ prestador_id: E, ...base() })).error).not.toBeNull();
  });

  it("a sessão não mexe no próprio limite nem troca dono ou tipo do anúncio", async () => {
    const sessao = await entrar(email("p"));
    expect((await sessao.from("anuncio_limites").upsert({ prestador_id: P, limite: 50 })).error).not.toBeNull();
    const { data: meus } = await sessao.from("anuncios").select("id").eq("tipo", "servico").limit(1);
    const troca = await sessao.from("anuncios").update({ tipo: "vaga_ajudante", whatsapp: "21999998888" }).eq("id", meus![0].id).select("id");
    expect(troca.error).not.toBeNull();
  });

  it("anúncio moderado sai do mural, e a sessão não o põe de volta", async () => {
    const sessao = await entrar(email("p"));
    const { data: meus } = await sessao.from("anuncios").select("id").eq("status", "ativo").limit(1);
    const alvo = meus![0].id as string;
    expect((await sessao.from("anuncios").update({ status: "moderado" }).eq("id", alvo).select("id")).error).not.toBeNull();

    expect((await servico!.from("anuncios").update({ status: "moderado" }).eq("id", alvo)).error).toBeNull();
    const { data: mural } = await publico.rpc("anuncios_publicos", { p_prestador: P });
    expect((mural ?? []).map((a: { id: string }) => a.id)).not.toContain(alvo);
    const volta = await sessao.from("anuncios").update({ status: "pausado" }).eq("id", alvo).select("id");
    expect(volta.error ?? ((volta.data ?? []).length === 0 ? "nada mudou" : null)).toBeTruthy();
    const { data: depois } = await servico!.from("anuncios").select("status").eq("id", alvo).single();
    expect(depois!.status).toBe("moderado");
  });

  it("prestador com conta inativa some do mural", async () => {
    expect((await servico!.from("profiles").update({ status: "inativo" }).eq("user_id", P)).error).toBeNull();
    const { data } = await publico.rpc("anuncios_publicos", { p_prestador: P });
    expect(data ?? []).toHaveLength(0);
    await servico!.from("profiles").update({ status: "ativo" }).eq("user_id", P);
  });

  it("o mural nunca devolve o telefone do perfil nem o e-mail", async () => {
    const { data } = await publico.rpc("anuncios_publicos", { p_limite: 60 });
    const json = JSON.stringify(data ?? []);
    expect(json).not.toContain("@teste.dev");
    const colunas = Object.keys((data ?? [])[0] ?? {});
    for (const proibida of ["telefone", "email", "endereco", "lat", "lng"]) expect(colunas).not.toContain(proibida);
  });
});
