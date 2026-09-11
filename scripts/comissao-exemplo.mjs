// Semente da comissão no mundo de EXEMPLO (D-044/D-047, 11/09/2026): sem ela,
// o Financeiro, os recibos mensais e a tela de comissão do prestador de
// exemplo abririam vazios — a comissão só nasce de serviço realizado DEPOIS da
// migration 0057, e os serviços de exemplo são anteriores.
//
// Só na praça de exemplo de Niterói (dono de exemplo) e só com prestadores de
// exemplo da cidade dela:
//   1. alíquotas: geral 10%, instalação elétrica 8%;
//   2. chave Pix padrão FICTÍCIA do Administrador de exemplo (para o QR abrir);
//   3. comissões dos serviços realizados de janeiro até hoje (a cobrança
//      retroativa é só da demonstração — no mundo real, D-044 proíbe);
//   4. meses anteriores ao atual quitados (pagamento confirmado pelo Administrador);
//      setembro fica em aberto, para dar para testar "Enviei o Pix" e a
//      confirmação;
//   5. uma nota avulsa de exemplo.
//
// Idempotente: nada é duplicado ao rodar de novo.
//
// Uso: node scripts/comissao-exemplo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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

const DESDE = "2026-01-01";
const CHAVE_FICTICIA = "pix-exemplo@meajudaai.app";
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const mesAtual = hoje.slice(0, 7);

function falhar(msg) {
  console.error(msg);
  process.exit(1);
}

// Praça de exemplo de Niterói: a mais antiga, com dono de exemplo.
const { data: pracas } = await sb
  .from("workspaces")
  .select("id, nome, cidade, estado, owner_id")
  .eq("cidade", "Niterói")
  .eq("estado", "RJ")
  .order("created_at", { ascending: true });
let praca = null;
for (const w of pracas ?? []) {
  const { data: dono } = await sb.from("profiles").select("exemplo").eq("user_id", w.owner_id).maybeSingle();
  if (dono?.exemplo) {
    praca = w;
    break;
  }
}
if (!praca) falhar("Nenhuma praça de exemplo em Niterói/RJ.");
console.log(`Praça: ${praca.nome}`);

// 1) Alíquotas.
for (const a of [
  { tipo_servico: null, percentual: 10 },
  { tipo_servico: "instalacao_eletrica", percentual: 8 },
]) {
  let q = sb.from("aliquotas_comissao").select("id").eq("workspace_id", praca.id).is("prestador_id", null);
  q = a.tipo_servico ? q.eq("tipo_servico", a.tipo_servico) : q.is("tipo_servico", null);
  const { data: existe } = await q.maybeSingle();
  if (!existe) {
    const { error } = await sb.from("aliquotas_comissao").insert({ workspace_id: praca.id, prestador_id: null, definido_por: praca.owner_id, ...a });
    if (error) throw error;
  }
}

// 2) Chave Pix padrão fictícia do dono.
const { data: chaves } = await sb.from("chaves_pix").select("id").eq("user_id", praca.owner_id);
if (!chaves?.length) {
  const { error } = await sb.from("chaves_pix").insert({ user_id: praca.owner_id, apelido: "Recebimentos da praça", chave: CHAVE_FICTICIA, padrao: true });
  if (error) throw error;
}

// Prestadores de exemplo da cidade da praça.
const { data: prestadores } = await sb
  .from("profiles")
  .select("user_id, nome")
  .eq("tipo_base", "prestador_servico")
  .eq("exemplo", true)
  .eq("cidade", praca.cidade)
  .eq("estado", praca.estado);
const ids = (prestadores ?? []).map((p) => p.user_id);

// 2b) O mundo de exemplo tinha um serviço por mês — o recibo de setembro
// ganha mais três realizados do João com a Marina (casados pela descrição).
const joaoEx = (prestadores ?? []).find((p) => p.nome === "João Ferreira");
const { data: marina } = await sb.from("profiles").select("user_id").eq("nome", "Marina Costa").eq("exemplo", true).maybeSingle();
const EXTRAS = [
  { data: "2026-09-02", hora_inicio: "09:00", hora_fim: "11:00", descricao: "Instalação de varal de teto na área de serviço", tipo: "instalacao_varal", preco_tipo: "servico", preco_valor: 180 },
  { data: "2026-09-04", hora_inicio: "13:00", hora_fim: "16:00", descricao: "Montagem de guarda-roupa de 6 portas", tipo: "instalacao_moveis", preco_tipo: "servico", preco_valor: 320 },
  { data: "2026-09-08", hora_inicio: "09:00", hora_fim: "10:30", descricao: "Troca de disjuntor e revisão do quadro de luz", tipo: "instalacao_eletrica", preco_tipo: "servico", preco_valor: 255 },
];
if (joaoEx && marina) {
  for (const x of EXTRAS) {
    const { data: ja } = await sb.from("servicos").select("id").eq("prestador_id", joaoEx.user_id).eq("descricao", x.descricao).maybeSingle();
    if (ja) continue;
    const { data: slot, error: eSlot } = await sb
      .from("agenda_slots")
      .insert({ prestador_id: joaoEx.user_id, data: x.data, hora_inicio: x.hora_inicio, hora_fim: x.hora_fim, status: "confirmado" })
      .select("id")
      .single();
    if (eSlot) throw eSlot;
    const { error: eSv } = await sb.from("servicos").insert({
      slot_id: slot.id,
      cliente_id: marina.user_id,
      prestador_id: joaoEx.user_id,
      descricao: x.descricao,
      preco_tipo: x.preco_tipo,
      preco_valor: x.preco_valor,
      status: "realizado",
      tipo: x.tipo,
    });
    if (eSv) {
      // Sem horário órfão: o serviço não entrou, o horário sai.
      await sb.from("agenda_slots").delete().eq("id", slot.id);
      throw eSv;
    }
  }
}

// 3) Comissões dos serviços realizados desde janeiro, dos prestadores de exemplo da cidade.
const { data: servicos } = ids.length
  ? await sb.from("servicos").select("id, prestador_id, tipo, preco_valor, agenda_slots(data)").in("prestador_id", ids).eq("status", "realizado")
  : { data: [] };
const { data: jaTem } = await sb.from("comissoes").select("servico_id").eq("workspace_id", praca.id);
const comComissao = new Set((jaTem ?? []).map((c) => c.servico_id));

let criadas = 0;
for (const s of servicos ?? []) {
  const data = s.agenda_slots?.data;
  if (!data || data < DESDE || data > hoje || comComissao.has(s.id)) continue;
  const { data: pct } = await sb.rpc("aliquota_de", { p_prestador: s.prestador_id, p_tipo: s.tipo });
  const percentual = Number(pct ?? 0);
  if (!(percentual > 0)) continue;
  const base = Number(s.preco_valor);
  const { error } = await sb.from("comissoes").insert({
    servico_id: s.id,
    prestador_id: s.prestador_id,
    workspace_id: praca.id,
    tipo_servico: s.tipo,
    base,
    percentual,
    valor: Math.round(base * percentual) / 100,
    created_at: `${data}T18:00:00-03:00`,
  });
  if (error) throw error;
  criadas++;
}

// 4) Meses anteriores ao atual: quitados por um pagamento confirmado por prestador e mês.
const { data: abertas } = await sb
  .from("comissoes")
  .select("id, prestador_id, valor, created_at, servicos(agenda_slots(data))")
  .eq("workspace_id", praca.id)
  .eq("status", "em_aberto");
const grupos = new Map();
for (const c of abertas ?? []) {
  const mes = (c.servicos?.agenda_slots?.data ?? c.created_at).slice(0, 7);
  if (mes >= mesAtual) continue;
  const chave = `${c.prestador_id}|${mes}`;
  const g = grupos.get(chave) ?? { prestador: c.prestador_id, mes, ids: [], centavos: 0 };
  g.ids.push(c.id);
  g.centavos += Math.round(Number(c.valor) * 100);
  grupos.set(chave, g);
}
let quitados = 0;
for (const g of grupos.values()) {
  const [ano, m] = g.mes.split("-").map(Number);
  const proximo = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, "0")}`;
  const { data: pg, error } = await sb
    .from("pagamentos_comissao")
    .insert({
      prestador_id: g.prestador,
      workspace_id: praca.id,
      valor: g.centavos / 100,
      status: "confirmado",
      informado_em: `${proximo}-03T10:00:00-03:00`,
      decidido_por: praca.owner_id,
      decidido_em: `${proximo}-03T15:30:00-03:00`,
      observacao: "Pix recebido.",
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: e2 } = await sb.from("comissoes").update({ status: "paga", pagamento_id: pg.id }).in("id", g.ids);
  if (e2) throw e2;
  quitados++;
}

// 5) Uma nota avulsa de exemplo.
const { data: notas } = await sb.from("notas_avulsas").select("id").eq("workspace_id", praca.id).limit(1);
const joao = (prestadores ?? []).find((p) => p.nome === "João Ferreira");
if (!notas?.length && joao) {
  const { error } = await sb.from("notas_avulsas").insert({
    workspace_id: praca.id,
    prestador_id: joao.user_id,
    pagador_nome: joao.nome,
    descricao: "Taxa de cadastro na praça",
    valor: 49.9,
    recebido_em: "2026-09-02",
    forma: "pix",
    emitido_por: praca.owner_id,
  });
  if (error) throw error;
}

console.log(`Comissões criadas: ${criadas}. Meses quitados (prestador × mês): ${quitados}.`);
