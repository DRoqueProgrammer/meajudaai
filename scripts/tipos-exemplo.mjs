// Distribui os 6 tipos de serviço (migration 0047, tipos_servico) pelo
// histórico do prestador de EXEMPLO João Ferreira (44acb9df-...) — usa a
// descrição quando ela dá uma pista clara (mesmo critério por palavra-chave
// da migration) e, onde não dá, um rodízio estável entre os tipos que NÃO
// são "Instalação elétrica" (o histórico dele já é dominado por
// eletricista, então só redistribuir o resto evita um gráfico monocromático).
// É o que alimenta o gráfico de faturamento por tipo (ROADMAP §2.5) desde o
// primeiro login de exemplo.
//
// Bônus pedido pelo Leonardo: se o realizado recente for pouco pro filtro
// padrão (15 dias) do gráfico mostrar algo, marca como "realizado" os
// serviços já CONFIRMADOS no passado desse mesmo prestador — nunca cria
// agenda nova, nunca toca serviço de outro prestador.
//
// Idempotente: a classificação por descrição é determinística e o rodízio
// segue a ordem cronológica (`created_at`), que não muda — rodar de novo
// sempre recalcula o MESMO tipo pra cada serviço, nunca embaralha. Roda só
// com a chave de serviço (`SUPABASE_SERVICE_ROLE_KEY` do `.env.local`) e só
// depois de confirmar `profiles.exemplo = true` — nunca em conta real.
//
// Uso: node scripts/tipos-exemplo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const JOAO_ID = "44acb9df-ec76-4154-aa31-b2deae8c18e2";

/** Mesmo critério da migration 0047 (a mais específica vence), só em JS. */
function classificarPorDescricao(descricao) {
  const d = (descricao ?? "").toLowerCase();
  if (/(desmont|remont|mudan[çc]a de m[óo]ve)/.test(d)) return "desmontagem_remontagem_moveis";
  if (/varal/.test(d)) return "instalacao_varal";
  if (/(el[ée]tric|tomada|chuveiro|lumin[áa]ria|l[âa]mpada|disjuntor|fia[çc][ãa]o|interruptor|quadro de luz|ventilador|lustre)/.test(d))
    return "instalacao_eletrica";
  if (/(madeira|porta|janela|deck|assoalho|rodap[ée]|verniz|cupim)/.test(d)) return "manutencao_madeira";
  if (/(m[óo]ve(l|is)|arm[áa]rio|prateleira|estante|guarda-roupa|painel de tv|nicho|cortina|persiana|suporte)/.test(d))
    return "instalacao_moveis";
  return null; // sem palavra-chave — cai no rodízio abaixo
}

// Sem sinal na descrição: espalha pelos 5 tipos que não são elétrica.
const RODIZIO_SEM_SINAL = [
  "manutencao_madeira",
  "instalacao_varal",
  "instalacao_moveis",
  "desmontagem_remontagem_moveis",
  "outros",
];

async function main() {
  const { data: perfil, error: perfilErr } = await admin
    .from("profiles")
    .select("user_id, nome, exemplo, tipo_base")
    .eq("user_id", JOAO_ID)
    .maybeSingle();
  if (perfilErr || !perfil) {
    throw new Error(`Prestador de exemplo não encontrado (${JOAO_ID}): ${perfilErr?.message ?? "sem dados"}`);
  }
  if (!perfil.exemplo) {
    throw new Error(`Recusado: ${perfil.nome} (${JOAO_ID}) não é uma conta de EXEMPLO. Este script só toca profiles.exemplo=true.`);
  }
  if (perfil.tipo_base !== "prestador_servico") {
    throw new Error(`Recusado: ${perfil.nome} não é prestador de serviço (é ${perfil.tipo_base}).`);
  }
  console.log(`Prestador de exemplo confirmado: ${perfil.nome} (${JOAO_ID}).`);

  const { data: servicos, error } = await admin
    .from("servicos")
    .select("id, slot_id, descricao, status, created_at")
    .eq("prestador_id", JOAO_ID)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  console.log(`${servicos.length} serviços do prestador.`);

  // 1) Tipo por serviço — descrição quando dá pista, rodízio estável quando não dá.
  let semSinalIdx = 0;
  let recategorizados = 0;
  for (const s of servicos) {
    const tipo = classificarPorDescricao(s.descricao) ?? RODIZIO_SEM_SINAL[semSinalIdx++ % RODIZIO_SEM_SINAL.length];
    const { error: updErr } = await admin.from("servicos").update({ tipo }).eq("id", s.id);
    if (updErr) {
      console.error(`Falhou ao recategorizar ${s.id}: ${updErr.message}`);
      continue;
    }
    recategorizados += 1;
  }
  console.log(`${recategorizados}/${servicos.length} serviços recategorizados.`);

  // 2) Realizado recente pouco pro filtro padrão (15 dias) mostrar algo?
  // Marca como realizado o que já está CONFIRMADO no passado — nunca cria
  // agenda nova.
  const slotIds = servicos.map((s) => s.slot_id);
  const { data: slots } = slotIds.length
    ? await admin.from("agenda_slots").select("id, data").in("id", slotIds)
    : { data: [] };
  const dataPorSlot = new Map((slots ?? []).map((sl) => [sl.id, sl.data]));
  const hoje = new Date().toLocaleDateString("sv-SE");
  const d90 = new Date();
  d90.setDate(d90.getDate() - 90);
  const d90str = d90.toLocaleDateString("sv-SE");

  const realizadosRecentes = servicos.filter(
    (s) => s.status === "realizado" && (dataPorSlot.get(s.slot_id) ?? "") >= d90str && (dataPorSlot.get(s.slot_id) ?? "") <= hoje,
  );
  console.log(`${realizadosRecentes.length} serviços realizados nos últimos 90 dias.`);

  if (realizadosRecentes.length < 5) {
    const confirmadosPassados = servicos.filter(
      (s) => s.status === "confirmado" && (dataPorSlot.get(s.slot_id) ?? "9999-99-99") <= hoje,
    );
    for (const s of confirmadosPassados) {
      const { error: updErr } = await admin.from("servicos").update({ status: "realizado" }).eq("id", s.id);
      if (updErr) console.error(`Não foi possível marcar como realizado (${s.id}): ${updErr.message}`);
      else console.log(`Marcado como realizado: ${dataPorSlot.get(s.slot_id)} — ${s.descricao}`);
    }
  }

  console.log("Pronto.");
}

await main();
