import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { podeRodar, servico, sufixo, novoRegistro, criarPessoa, entrar, criarHorario, limpar } from "../fatia1/harness";
import { exportarDadosDoTitular } from "@/lib/titular/exportar";
import { anonimizarTitular } from "@/lib/titular/anonimizar";

/**
 * Gabarito do lote 2B da Fatia 2 — direitos do titular (LGPD art. 18; decisão D-023).
 *
 * Escrito pelo controller antes da implementação, como na Fatia 1 (D-026): o executor
 * não edita este arquivo. Contrato do lote:
 * - `lib/titular/exportar.ts` exporta `exportarDadosDoTitular(db, userId)`: tudo o que é
 *   da pessoa e as atividades dela desde o cadastro, num objeto serializável em JSON, com
 *   `gerado_em`. Nunca dado pessoal de outra pessoa (nem o contato da outra parte de um
 *   serviço, nem acessos de terceiros).
 * - `lib/titular/anonimizar.ts` exporta `anonimizarTitular(db, userId)`: tira o dado pessoal
 *   e mantém os ids, para o histórico da outra parte continuar íntegro. Idempotente.
 * - `GET /api/meus-dados` baixa o JSON do usuário da SESSÃO (nunca de um id vindo do pedido).
 * - `solicitarExclusaoAction` registra o pedido de exclusão (anonimização em até 15 dias,
 *   com 7 dias para desistir); a tela de perfil oferece "Baixar meus dados" e
 *   "Excluir meus dados".
 */

const raiz = new URL("../../", import.meta.url);
const leitura = (caminho: string) => readFileSync(new URL(caminho, raiz), "utf8");

function arquivosDe(pasta: string): string[] {
  const base = new URL(pasta, raiz);
  if (!existsSync(base)) return [];
  const saida: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const cheio = join(dir, nome);
      if (statSync(cheio).isDirectory()) andar(cheio);
      else if (/\.(tsx?|jsx?)$/.test(nome)) saida.push(readFileSync(cheio, "utf8"));
    }
  };
  andar(fileURLToPath(base));
  return saida;
}

describe("Fatia 2 · direitos do titular (código)", () => {
  it("a rota de download existe e usa o exportador", () => {
    const rota = leitura("app/api/meus-dados/route.ts");
    expect(rota).toMatch(/export async function GET/);
    expect(rota).toMatch(/exportarDadosDoTitular/);
  });

  it("a rota baixa os dados de quem está logado — nunca de um id vindo do pedido", () => {
    const rota = leitura("app/api/meus-dados/route.ts");
    expect(rota).toMatch(/getCurrentUser|requireUser|tryWriter/);
    expect(rota).not.toMatch(/searchParams/);
    expect(rota).not.toMatch(/params\s*[:)]/);
  });

  it("existe a action que registra o pedido de exclusão", () => {
    const acoes = arquivosDe("lib/actions").join("\n");
    expect(acoes).toMatch(/export async function solicitarExclusaoAction\(/);
  });

  it("a tela de perfil oferece baixar e excluir os dados", () => {
    const telas = [...arquivosDe("app/(app)/perfil"), ...arquivosDe("components")].join("\n");
    expect(telas).toMatch(/Baixar meus dados/);
    expect(telas).toMatch(/Excluir meus dados/);
  });
});

describe.skipIf(!podeRodar)("Fatia 2 · exportar e anonimizar contra o banco", () => {
  const reg = novoRegistro();
  const s = sufixo();
  const emailA = `f1-titular-a-${s}@teste.dev`;
  const emailB = `f1-titular-b-${s}@teste.dev`;
  const emailC = `f1-titular-c-${s}@teste.dev`;
  const telefoneB = `2198${s.replace(/\D/g, "").slice(-7).padStart(7, "0")}`;
  const pixB = `pix-titular-${s}`;
  const ENDERECO_SERVICO = `Rua do Titular, ${s}`;
  let A = "";
  let B = "";
  let C = "";
  let pedido = "";

  beforeAll(async () => {
    A = await criarPessoa(reg, emailA, "cliente", {}, { telefone: "21999990001", is_whatsapp: true });
    B = await criarPessoa(reg, emailB, "prestador_servico", { preco_tipo: "hora", preco_valor: 80, categoria: "ajudante_eletricista" }, { telefone: telefoneB, chave_pix: pixB });
    C = await criarPessoa(reg, emailC, "cliente");
    const local = await servico!.from("profile_local").insert({ user_id: A, lat: -22.9, lng: -43.1, endereco: `Casa da A, ${s}` });
    if (local.error) throw local.error;
    const logs = await servico!.from("login_logs").insert([
      { user_id: A, ip: "203.0.113.5", user_agent: "gabarito", cidade: "Niterói", pais: "BR" },
      { user_id: C, ip: "198.51.100.9", user_agent: "gabarito", cidade: "Maceió", pais: "BR" },
    ]);
    if (logs.error) throw logs.error;
    const notif = await servico!.from("notificacoes").insert({ user_id: A, tipo: "gabarito", titulo: `Aviso do gabarito ${s}` });
    if (notif.error) throw notif.error;
    const horario = await criarHorario(B);
    const sv = await servico!
      .from("servicos")
      .insert({ slot_id: horario, cliente_id: A, prestador_id: B, descricao: `Pedido do gabarito ${s}`, preco_tipo: "hora", preco_valor: 80, endereco: ENDERECO_SERVICO, lat: -22.91, lng: -43.11, status: "realizado" })
      .select("id")
      .single();
    if (sv.error || !sv.data) throw sv.error ?? new Error("serviço não criado");
    pedido = sv.data.id as string;
  });

  afterAll(async () => {
    await limpar(reg);
  });

  it("a exportação traz o que é da pessoa e as atividades dela", async () => {
    const dados = await exportarDadosDoTitular(servico!, A);
    const json = JSON.stringify(dados);
    expect(typeof (dados as { gerado_em?: unknown }).gerado_em).toBe("string");
    expect(json).toContain(emailA);
    expect(json).toContain("203.0.113.5");
    expect(json).toContain(pedido);
    expect(json).toContain(ENDERECO_SERVICO);
    expect(json).toContain(`Aviso do gabarito ${s}`);
    expect(json).toContain(`Casa da A, ${s}`);
  });

  it("a exportação nunca traz dado pessoal de outra pessoa", async () => {
    const json = JSON.stringify(await exportarDadosDoTitular(servico!, A));
    expect(json).not.toContain(emailB);
    expect(json).not.toContain(telefoneB);
    expect(json).not.toContain(pixB);
    expect(json).not.toContain(emailC);
    expect(json).not.toContain("198.51.100.9");
  });

  it("anonimizar tira o dado pessoal e mantém o histórico da outra parte", async () => {
    await anonimizarTitular(servico!, A);

    const { data: perfil } = await servico!.from("profiles").select("nome, foto_url, bio").eq("user_id", A).maybeSingle();
    expect(perfil).not.toBeNull();
    expect(perfil!.nome).not.toBe(emailA.split("@")[0]);
    expect(perfil!.foto_url).toBeNull();
    expect(perfil!.bio ?? null).toBeNull();

    const { data: pii } = await servico!.from("profiles_pii").select("email, telefone").eq("user_id", A).maybeSingle();
    expect(pii?.email ?? null).not.toBe(emailA);
    expect(pii?.telefone ?? null).toBeNull();

    expect((await servico!.from("profile_local").select("user_id").eq("user_id", A)).data ?? []).toHaveLength(0);
    expect((await servico!.from("login_logs").select("id").eq("user_id", A)).data ?? []).toHaveLength(0);

    const { data: sv } = await servico!.from("servicos").select("id, prestador_id, endereco, lat, lng").eq("id", pedido).maybeSingle();
    expect(sv?.id).toBe(pedido);
    expect(sv?.prestador_id).toBe(B);
    expect(sv?.endereco ?? null).toBeNull();
    expect(sv?.lat ?? null).toBeNull();
    expect(sv?.lng ?? null).toBeNull();
  });

  it("depois de anonimizada, a pessoa não entra mais com a senha antiga", async () => {
    await expect(entrar(emailA)).rejects.toBeTruthy();
  });

  it("anonimizar não mexe na outra parte e pode rodar de novo sem quebrar", async () => {
    const { data: piiB } = await servico!.from("profiles_pii").select("email, chave_pix").eq("user_id", B).maybeSingle();
    expect(piiB?.email).toBe(emailB);
    expect(piiB?.chave_pix).toBe(pixB);
    await anonimizarTitular(servico!, A);
  });
});
