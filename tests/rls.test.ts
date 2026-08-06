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

async function makeUser(email: string, tipo: "admin" | "ajudante" | "funcionario"): Promise<string> {
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
  let idA = "";
  let idB = "";
  let idC = "";
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
  }, 30000);

  afterAll(async () => {
    if (!admin || !alcancavel) return;
    await admin.from("vagas").delete().in("id", [vagaId, vagaAberta]);
    await admin.from("workspaces").delete().eq("id", wsA);
    if (idA) await admin.auth.admin.deleteUser(idA);
    if (idB) await admin.auth.admin.deleteUser(idB);
    if (idC) await admin.auth.admin.deleteUser(idC);
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
});
