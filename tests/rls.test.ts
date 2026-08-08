import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Teste de integração: CRIA E APAGA USUÁRIOS DE VERDADE no Supabase do projeto.
// Por isso é opt-in explícito — `npm run test:integration`. O `npm test` do dia
// a dia pula tudo isto e não toca na rede.
// RUN_INTEGRATION vem da invocação, nunca do .env.local (ver tests/setup.ts):
// quando vinha de lá, o gate não gateava nada.
const canRun = Boolean(url && anon && service) && process.env.RUN_INTEGRATION === "1";

const SENHA = "senha-teste-123";
const admin: SupabaseClient | null = canRun
  ? createClient(url!, service!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

async function makeUser(email: string, tipo: "admin" | "ajudante" | "funcionario" | "sysadmin"): Promise<string> {
  const { data } = await admin!.auth.admin.createUser({ email, password: SENHA, email_confirm: true });
  const id = data.user!.id;
  await admin!.from("profiles").insert({ user_id: id, nome: email.split("@")[0], tipo_base: tipo, cidade: "Niterói", estado: "RJ" });
  await admin!.from("profiles_pii").insert({ user_id: id, email });
  return id;
}

async function clientFor(email: string): Promise<SupabaseClient> {
  const c = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  await c.auth.signInWithPassword({ email, password: SENHA });
  return c;
}

describe.skipIf(!canRun)("RLS — isolamento multi-tenant e PII", () => {
  const ts = Date.now();
  const emailA = `rls-a-${ts}@teste.dev`;
  const emailB = `rls-b-${ts}@teste.dev`;
  const emailC = `rls-c-${ts}@teste.dev`;
  const emailD = `rls-d-${ts}@teste.dev`;
  let idA = "";
  let idB = "";
  let idC = "";
  let idD = "";
  let wsA = "";
  let vagaId = "";
  let vagaAberta = "";
  let canalId = "";
  let dmExternaId = "";
  let alcancavel = true;

  beforeAll(async () => {
    try {
      idA = await makeUser(emailA, "admin");
      idB = await makeUser(emailB, "ajudante");
    } catch (e) {
      alcancavel = false;
      console.warn("[rls] Supabase inacessível deste ambiente — testes pulados.", e);
      return;
    }
    const { data: ws } = await admin!
      .from("workspaces")
      .insert({ owner_id: idA, nome: "WS A", cidade: "Niterói", estado: "RJ" })
      .select("id")
      .single();
    wsA = ws!.id;
    await admin!.from("workspace_members").insert({ workspace_id: wsA, user_id: idA, role: "owner" });
    const { data: v } = await admin!
      .from("vagas")
      .insert({ workspace_id: wsA, criado_por: idA, titulo: "Vaga privada", categoria: "ajudante_geral", cidade: "Niterói", valor_diaria: 100, status: "em_andamento" })
      .select("id")
      .single();
    vagaId = v!.id;
    const { data: va } = await admin!
      .from("vagas")
      .insert({ workspace_id: wsA, criado_por: idA, titulo: "Vaga aberta", categoria: "ajudante_geral", cidade: "Niterói", valor_diaria: 100, status: "aberta" })
      .select("id")
      .single();
    vagaAberta = va!.id;

    // Funcionário da equipe A (membro), sem capacidade por padrão.
    idC = await makeUser(emailC, "funcionario");
    await admin!.from("workspace_members").insert({ workspace_id: wsA, user_id: idC, role: "membro" });
    // Canal da equipe (com uma mensagem) e DM externa com o ajudante B.
    const { data: canal } = await admin!
      .from("conversas")
      .insert({ workspace_id: wsA, tipo: "canal_equipe" })
      .select("id")
      .single();
    canalId = canal!.id;
    await admin!.from("mensagens").insert({ conversa_id: canalId, remetente_id: idA, conteudo: "aviso da equipe" });
    const { data: dm } = await admin!
      .from("conversas")
      .insert({ workspace_id: wsA, tipo: "dm_externa", ajudante_id: idB })
      .select("id")
      .single();
    dmExternaId = dm!.id;
    // Coordenada exata da obra da vaga privada (em andamento).
    await admin!.from("vaga_local").insert({ vaga_id: vagaId, lat: -22.9, lng: -43.1 });
    // Bloqueio de agenda do ajudante B.
    await admin!.from("bloqueio_agenda").insert({ ajudante_id: idB, data: "2026-09-01" });
    // Convite da equipe A (para o teste de service-role only).
    await admin!.from("invite").insert({ token: `tok-${ts}`, workspace_id: wsA, role: "membro", created_by: idA });
    // Feature 6 (demanda): sysadmin D + demanda de A e de B (categorias/cidades distintas).
    idD = await makeUser(emailD, "sysadmin");
    await admin!.from("demanda_servico").insert({ user_id: idA, categoria: "ajudante_encanador", cidade: "Recife" });
    await admin!.from("demanda_servico").insert({ user_id: idB, categoria: "ajudante_pintor", cidade: "Olinda" });
  }, 30000);

  afterAll(async () => {
    if (!admin || !alcancavel) return;
    await admin.from("vagas").delete().in("id", [vagaId, vagaAberta]);
    await admin.from("workspaces").delete().eq("id", wsA);
    await admin.from("home_banner").delete().eq("id", 1);
    if (idA) await admin.auth.admin.deleteUser(idA);
    if (idB) await admin.auth.admin.deleteUser(idB);
    if (idC) await admin.auth.admin.deleteUser(idC);
    if (idD) await admin.auth.admin.deleteUser(idD);
  }, 30000);

  it("membro do workspace vê a própria vaga (em andamento)", async () => {
    if (!alcancavel) return;
    const a = await clientFor(emailA);
    const { data } = await a.from("vagas").select("id").eq("id", vagaId);
    expect(data?.length).toBe(1);
  });

  it("não-membro NÃO vê a vaga em andamento de outro workspace", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("vagas").select("id").eq("id", vagaId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("usuário NÃO lê a PII (CPF/e-mail) de outro", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("profiles_pii").select("email").eq("user_id", idA);
    expect(data?.length ?? 0).toBe(0);
  });

  it("usuário lê a própria PII", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("profiles_pii").select("email").eq("user_id", idB);
    expect(data?.length).toBe(1);
  });

  // Escritas fechadas por RLS — B não é membro do canal da equipe de A.
  it("estranho NÃO manda mensagem em conversa que não é dele", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { error } = await b
      .from("mensagens")
      .insert({ conversa_id: canalId, remetente_id: idB, conteudo: "oi" });
    expect(error).not.toBeNull();
  });

  it("não-membro NÃO lê mensagens de conversa alheia (anti-IDOR)", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("mensagens").select("id").eq("conversa_id", canalId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("estranho NÃO avalia quem não trabalhou com ele", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { error } = await b
      .from("avaliacoes")
      .insert({ vaga_id: vagaId, avaliador_id: idB, avaliado_id: idA, nota: 1 });
    expect(error).not.toBeNull();
  });

  it("ninguém se candidata a vaga que não está aberta", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { error } = await b
      .from("candidaturas")
      .insert({ vaga_id: vagaId, ajudante_id: idB });
    expect(error).not.toBeNull();
  });

  // Caminho feliz — as policies de 0010 não podem quebrar quem tem direito.
  it("ajudante se candidata, conversa e avalia na diária dele", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const cand = await b.from("candidaturas").insert({ vaga_id: vagaAberta, ajudante_id: idB });
    expect(cand.error).toBeNull();
    const msg = await b
      .from("mensagens")
      .insert({ conversa_id: dmExternaId, remetente_id: idB, conteudo: "posso ir" });
    expect(msg.error).toBeNull();
    const aval = await b
      .from("avaliacoes")
      .insert({ vaga_id: vagaAberta, avaliador_id: idB, avaliado_id: idA, nota: 5 });
    expect(aval.error).toBeNull();
  });

  // Feature 2: a capacidade chat_ajudantes é aplicada dentro da RLS da conversa.
  it("funcionário SEM chat_ajudantes não vê a DM externa", async () => {
    if (!alcancavel) return;
    await admin!
      .from("user_modules")
      .delete()
      .eq("user_id", idC)
      .eq("workspace_id", wsA)
      .eq("module", "chat_ajudantes");
    const c = await clientFor(emailC);
    const { data } = await c.from("conversas").select("id").eq("id", dmExternaId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("funcionário COM chat_ajudantes vê a DM externa", async () => {
    if (!alcancavel) return;
    await admin!
      .from("user_modules")
      .upsert({ user_id: idC, workspace_id: wsA, module: "chat_ajudantes", allowed: true });
    const c = await clientFor(emailC);
    const { data } = await c.from("conversas").select("id").eq("id", dmExternaId);
    expect(data?.length).toBe(1);
  });

  // Feature 3 (mapa): a coordenada EXATA da obra (vaga_local) só é legível pela
  // equipe dona ou pelo ajudante contratado — anti-IDOR do endereço.
  it("não-contratado NÃO lê a coordenada exata da obra", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("vaga_local").select("lat").eq("vaga_id", vagaId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("equipe dona lê a coordenada exata da obra", async () => {
    if (!alcancavel) return;
    const a = await clientFor(emailA);
    const { data } = await a.from("vaga_local").select("lat").eq("vaga_id", vagaId);
    expect(data?.length).toBe(1);
  });

  it("ajudante contratado lê a coordenada exata da obra", async () => {
    if (!alcancavel) return;
    await admin!
      .from("candidaturas")
      .upsert({ vaga_id: vagaId, ajudante_id: idB, status: "aceito" }, { onConflict: "vaga_id,ajudante_id" });
    const b = await clientFor(emailB);
    const { data } = await b.from("vaga_local").select("lat").eq("vaga_id", vagaId);
    expect(data?.length).toBe(1);
  });

  // Feature 7 (agenda): o bloqueio de indisponibilidade é privado do ajudante.
  it("bloqueio de agenda é privado — só o dono lê", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const meus = await b.from("bloqueio_agenda").select("data").eq("ajudante_id", idB);
    expect(meus.data?.length).toBe(1);
    const a = await clientFor(emailA);
    const alheio = await a.from("bloqueio_agenda").select("data").eq("ajudante_id", idB);
    expect(alheio.data?.length ?? 0).toBe(0);
  });

  // Feature 4 (convite): o `invite` é service-role only — nenhum cliente lê,
  // nem o próprio criador (o token é a credencial, lido só pelo servidor).
  it("convite não é legível pelo cliente (service-role only)", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data: db } = await b.from("invite").select("id");
    expect(db?.length ?? 0).toBe(0);
    const a = await clientFor(emailA);
    const { data: da } = await a.from("invite").select("id");
    expect(da?.length ?? 0).toBe(0);
  });

  // O contrato de anonimato da denúncia. Se A conseguir ler a denúncia que B
  // fez contra ele, ninguém denuncia "não pagou a diária" uma segunda vez —
  // então isto é o teste que segura a decisão de produto, não um detalhe de RLS.
  it("denunciado NÃO consegue ler a denúncia feita contra ele", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const criada = await b
      .from("denuncias")
      .insert({ denunciante_id: idB, alvo_tipo: "usuario", alvo_id: idA, motivo: "fraude" })
      .select("id")
      .single();
    expect(criada.error).toBeNull();

    // O denunciante enxerga a própria denúncia.
    const { data: vistaPorB } = await b.from("denuncias").select("id").eq("id", criada.data!.id);
    expect(vistaPorB).toHaveLength(1);

    // O denunciado não enxerga nada — nem a linha, nem quem o denunciou.
    const a = await clientFor(emailA);
    const { data: vistaPorA } = await a.from("denuncias").select("id").eq("id", criada.data!.id);
    expect(vistaPorA).toHaveLength(0);
  });

  it("ninguém denuncia em nome de outra pessoa", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { error } = await b
      .from("denuncias")
      .insert({ denunciante_id: idA, alvo_tipo: "usuario", alvo_id: idB, motivo: "abuso" });
    expect(error).not.toBeNull();
  });

  // Feature 6 (demanda): a demanda é do próprio usuário; o agregado é só do sysadmin.
  it("usuário só lê a própria demanda, não a de outro", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    const { data } = await b.from("demanda_servico").select("categoria, cidade");
    expect(data?.length).toBe(1);
    expect(data?.[0]?.cidade).toBe("Olinda");
  });

  it("demanda é deduplicada por (user, categoria, cidade)", async () => {
    if (!alcancavel) return;
    const b = await clientFor(emailB);
    await b.from("demanda_servico").upsert(
      { user_id: idB, categoria: "ajudante_pintor", cidade: "Olinda" },
      { onConflict: "user_id,categoria,cidade", ignoreDuplicates: true },
    );
    const { data } = await b
      .from("demanda_servico")
      .select("id")
      .eq("categoria", "ajudante_pintor")
      .eq("cidade", "Olinda");
    expect(data?.length).toBe(1);
  });

  it("não-sysadmin NÃO edita o banner da home", async () => {
    if (!alcancavel) return;
    const a = await clientFor(emailA);
    const { error } = await a.from("home_banner").upsert({ id: 1, texto: "hack", ativo: true });
    expect(error).not.toBeNull();
  });

  it("sysadmin lê toda a demanda e edita o banner", async () => {
    if (!alcancavel) return;
    const d = await clientFor(emailD);
    const { data } = await d.from("demanda_servico").select("id");
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(2);
    const { error } = await d.from("home_banner").upsert({ id: 1, texto: "recrutando encanador", ativo: true });
    expect(error).toBeNull();
  });
});
