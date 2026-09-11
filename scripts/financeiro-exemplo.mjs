// Semente do Financeiro em grade no mundo de EXEMPLO (D-048, 11/09/2026): o
// mundo de exemplo tinha uma cliente só (Marina) e só o João com serviços —
// as grades "clientes × meses" (prestador) e "prestadores × meses"
// (Administrador) abririam com uma linha. Aqui:
//   1. três clientes de exemplo em Niterói (exemplo-cliente-N@meajudaai.app);
//   2. serviços realizados de 2026 do João, do Carlos e do Roberto com elas;
//   3. roda scripts/comissao-exemplo.mjs (comissões e meses anteriores pagos)
//      e reabre agosto do Carlos (para a grade do Administrador ter atraso);
//   4. recebimentos do João: até julho tudo recebido, agosto em parte,
//      setembro a receber (a grade do prestador fica verde, parcial e vermelha).
// Só contas com profiles.exemplo = true. Idempotente.
//
// Uso: node scripts/financeiro-exemplo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fotoAleatoria } from "./fotos-publicas.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Mesma senha das outras contas de exemplo (lib/auth/contas-exemplo.ts).
const SENHA = "MeAjudaAi2026!";

const CLIENTES = [
  { email: "exemplo-cliente-1@meajudaai.app", nome: "Ana Beatriz Lima", genero: "feminino", telefone: "21988120001" },
  { email: "exemplo-cliente-2@meajudaai.app", nome: "Ricardo Souza", genero: "masculino", telefone: "21988120002" },
  { email: "exemplo-cliente-3@meajudaai.app", nome: "Lúcia Andrade", genero: "feminino", telefone: "21988120003" },
];

async function garantirCliente(c) {
  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const ja = lista?.users?.find((u) => u.email === c.email);
  if (ja) return ja.id;
  const { data, error } = await sb.auth.admin.createUser({ email: c.email, password: SENHA, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  const p = await sb.from("profiles").insert({
    user_id: id,
    nome: c.nome,
    tipo_base: "cliente",
    cidade: "Niterói",
    estado: "RJ",
    genero: c.genero,
    foto_url: fotoAleatoria(id, c.genero),
    exemplo: true,
  });
  if (p.error) throw p.error;
  const pii = await sb.from("profiles_pii").insert({ user_id: id, email: c.email, telefone: c.telefone });
  if (pii.error) throw pii.error;
  console.log(`Cliente de exemplo criada: ${c.nome}`);
  return id;
}

const ids = {};
for (const c of CLIENTES) ids[c.nome] = await garantirCliente(c);
const { data: marina } = await sb.from("profiles").select("user_id").eq("nome", "Marina Costa").eq("exemplo", true).maybeSingle();
ids["Marina Costa"] = marina?.user_id;

const { data: prestadores } = await sb
  .from("profiles")
  .select("user_id, nome")
  .in("nome", ["João Ferreira", "Carlos Mendes", "Roberto Almeida"])
  .eq("exemplo", true);
const pid = Object.fromEntries((prestadores ?? []).map((p) => [p.nome, p.user_id]));

// [prestador, cliente, data, tipo, valor, descrição]
const SERVICOS = [
  ["João Ferreira", "Ana Beatriz Lima", "2026-01-15", "instalacao_eletrica", 240, "Troca do chuveiro e da fiação do banheiro"],
  ["João Ferreira", "Ana Beatriz Lima", "2026-03-10", "instalacao_eletrica", 180, "Instalação de 4 tomadas na sala"],
  ["João Ferreira", "Ana Beatriz Lima", "2026-05-20", "instalacao_varal", 150, "Varal de teto na área de serviço"],
  ["João Ferreira", "Ana Beatriz Lima", "2026-07-08", "instalacao_eletrica", 320, "Quadro de luz novo com disjuntores"],
  ["João Ferreira", "Ana Beatriz Lima", "2026-08-12", "instalacao_eletrica", 140, "Luminárias da varanda"],
  ["João Ferreira", "Ana Beatriz Lima", "2026-09-03", "instalacao_eletrica", 210, "Revisão elétrica da cozinha"],
  ["João Ferreira", "Ricardo Souza", "2026-02-18", "instalacao_eletrica", 190, "Ventilador de teto no quarto"],
  ["João Ferreira", "Ricardo Souza", "2026-04-22", "instalacao_moveis", 260, "Montagem de painel de TV"],
  ["João Ferreira", "Ricardo Souza", "2026-06-17", "instalacao_eletrica", 170, "Interruptores inteligentes"],
  ["João Ferreira", "Ricardo Souza", "2026-08-26", "instalacao_eletrica", 230, "Tomadas 20A para o ar-condicionado"],
  ["João Ferreira", "Ricardo Souza", "2026-09-09", "instalacao_eletrica", 160, "Troca de reator e lâmpadas"],
  ["João Ferreira", "Lúcia Andrade", "2026-03-25", "instalacao_eletrica", 200, "Campainha e iluminação da entrada"],
  ["João Ferreira", "Lúcia Andrade", "2026-06-05", "desmontagem_remontagem_moveis", 280, "Desmontagem e remontagem do guarda-roupa"],
  ["João Ferreira", "Lúcia Andrade", "2026-08-19", "instalacao_eletrica", 150, "Troca de tomadas queimadas"],
  ["Carlos Mendes", "Ana Beatriz Lima", "2026-04-03", "outros", 450, "Reboco da parede da lavanderia"],
  ["Carlos Mendes", "Ana Beatriz Lima", "2026-07-14", "outros", 380, "Assentamento de piso na varanda"],
  ["Carlos Mendes", "Ana Beatriz Lima", "2026-08-21", "outros", 300, "Conserto do muro dos fundos"],
  ["Carlos Mendes", "Ricardo Souza", "2026-06-09", "outros", 420, "Contrapiso do quarto"],
  ["Carlos Mendes", "Ricardo Souza", "2026-09-01", "outros", 260, "Rejunte do banheiro"],
  ["Roberto Almeida", "Lúcia Andrade", "2026-05-11", "outros", 190, "Troca do sifão e da torneira da cozinha"],
  ["Roberto Almeida", "Lúcia Andrade", "2026-08-04", "outros", 240, "Desentupimento da pia e ralos"],
  ["Roberto Almeida", "Lúcia Andrade", "2026-09-05", "outros", 170, "Caixa acoplada nova"],
  ["Roberto Almeida", "Marina Costa", "2026-07-22", "outros", 210, "Vazamento no registro do chuveiro"],
];

let novos = 0;
for (const [prest, cli, data, tipo, valor, descricao] of SERVICOS) {
  const prestadorId = pid[prest];
  const clienteId = ids[cli];
  if (!prestadorId || !clienteId) continue;
  const { data: ja } = await sb.from("servicos").select("id").eq("prestador_id", prestadorId).eq("descricao", descricao).maybeSingle();
  if (ja) continue;
  const { data: slot, error: eSlot } = await sb
    .from("agenda_slots")
    .insert({ prestador_id: prestadorId, data, hora_inicio: "16:00", hora_fim: "18:00", status: "confirmado" })
    .select("id")
    .single();
  if (eSlot) throw eSlot;
  const { error: eSv } = await sb.from("servicos").insert({
    slot_id: slot.id,
    cliente_id: clienteId,
    prestador_id: prestadorId,
    descricao,
    preco_tipo: "servico",
    preco_valor: valor,
    status: "realizado",
    tipo,
  });
  if (eSv) {
    await sb.from("agenda_slots").delete().eq("id", slot.id);
    throw eSv;
  }
  novos++;
}
console.log(`Serviços de exemplo novos: ${novos}.`);

// 3) Comissões (e meses anteriores quitados) pela semente da comissão.
execFileSync(process.execPath, [fileURLToPath(new URL("./comissao-exemplo.mjs", import.meta.url))], { stdio: "inherit" });

// Agosto do Carlos volta a em aberto: a grade do Administrador ganha um atraso de verdade.
if (pid["Carlos Mendes"]) {
  const { data: agosto } = await sb
    .from("comissoes")
    .select("id, pagamento_id, servicos(agenda_slots(data))")
    .eq("prestador_id", pid["Carlos Mendes"]);
  const doAgosto = (agosto ?? []).filter((c) => (c.servicos?.agenda_slots?.data ?? "").startsWith("2026-08"));
  const pagamentos = [...new Set(doAgosto.map((c) => c.pagamento_id).filter(Boolean))];
  if (doAgosto.length) {
    await sb.from("comissoes").update({ status: "em_aberto", pagamento_id: null, paga_em: null, confirmada_por: null }).in("id", doAgosto.map((c) => c.id));
    for (const p of pagamentos) {
      const { count } = await sb.from("comissoes").select("id", { count: "exact", head: true }).eq("pagamento_id", p);
      if (!count) await sb.from("pagamentos_comissao").delete().eq("id", p);
    }
  }
}

// 4) Recebimentos do João: até julho tudo; agosto só o primeiro de cada cliente; setembro nada.
const { data: doJoao } = await sb
  .from("servicos")
  .select("id, cliente_id, descricao, preco_valor, agenda_slots(data)")
  .eq("prestador_id", pid["João Ferreira"])
  .eq("status", "realizado");
const { data: jaRecebidos } = await sb.from("recebimentos").select("servico_id").eq("prestador_id", pid["João Ferreira"]);
const recebido = new Set((jaRecebidos ?? []).map((r) => r.servico_id));
const { data: nomes } = await sb.from("profiles").select("user_id, nome").in("user_id", [...new Set((doJoao ?? []).map((s) => s.cliente_id))]);
const nomeDe = Object.fromEntries((nomes ?? []).map((n) => [n.user_id, n.nome]));
const primeiroDeAgosto = new Set();
let recebimentos = 0;
const ordenados = (doJoao ?? []).filter((s) => s.agenda_slots?.data?.startsWith("2026-")).sort((a, b) => a.agenda_slots.data.localeCompare(b.agenda_slots.data));
for (const [i, s] of ordenados.entries()) {
  const data = s.agenda_slots.data;
  let marcar = data <= "2026-07-31";
  if (data.startsWith("2026-08") && !primeiroDeAgosto.has(s.cliente_id)) {
    primeiroDeAgosto.add(s.cliente_id);
    marcar = true;
  }
  if (!marcar || recebido.has(s.id)) continue;
  const dia = new Date(`${data}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + 1);
  const { error } = await sb.from("recebimentos").insert({
    prestador_id: pid["João Ferreira"],
    servico_id: s.id,
    cliente_id: s.cliente_id,
    pagador_nome: nomeDe[s.cliente_id] ?? "Cliente",
    descricao: s.descricao,
    valor: Number(s.preco_valor),
    forma: i % 3 === 0 ? "dinheiro" : "pix",
    recebido_em: dia.toISOString().slice(0, 10),
  });
  if (error) throw error;
  recebimentos++;
}
console.log(`Recebimentos do João criados: ${recebimentos}.`);
