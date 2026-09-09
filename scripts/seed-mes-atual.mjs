// Complemento ao seed-fake-data.mjs: o gerador de 3 anos pula o mês atual de
// propósito (começa em "1 mês atrás"), o que deixa o mês corrente sem nenhum
// serviço confirmado/pendente pra mostrar — só horários livres. Este script
// adiciona alguns serviços no mês atual, incluindo um "pendente" (pra
// demonstrar o botão de aceitar) e um "confirmado" próximo.
//
// Uso: node scripts/seed-mes-atual.mjs
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

async function idPorEmail(email) {
  const { data } = await admin.auth.admin.listUsers();
  const u = data.users.find((x) => x.email === email);
  if (!u) throw new Error(`Usuário não encontrado: ${email}`);
  return u.id;
}

const prestadorId = await idPorEmail("joao.ferreira@meajudaai.app");
const clienteId = await idPorEmail("marina.costa@meajudaai.app");
const hoje = new Date();
const iso = (d) => d.toLocaleDateString("sv-SE");

async function criarServico({ diasOffset, horaInicio, horaFim, descricao, status, precoValor }) {
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + diasOffset);
  const dataIso = iso(data);
  const { data: slot, error: slotErr } = await admin
    .from("agenda_slots")
    .insert({ prestador_id: prestadorId, data: dataIso, hora_inicio: horaInicio, hora_fim: horaFim, status: status === "pendente" ? "pendente" : "confirmado" })
    .select("id")
    .single();
  if (slotErr) { console.error(`Slot falhou (${dataIso}): ${slotErr.message}`); return; }

  const { error: servErr } = await admin.from("servicos").insert({
    slot_id: slot.id,
    cliente_id: clienteId,
    prestador_id: prestadorId,
    descricao,
    preco_tipo: "hora",
    preco_valor: precoValor,
    status,
  });
  if (servErr) { console.error(`Serviço falhou (${dataIso}): ${servErr.message}`); return; }
  console.log(`Criado (${status}): ${dataIso} ${horaInicio}-${horaFim} — ${descricao}`);

  if (status === "realizado") {
    await admin.from("avaliacoes").insert({
      avaliador_id: clienteId,
      avaliado_id: prestadorId,
      nota: 5,
      comentario: "Excelente, resolveu rapidinho.",
      created_at: data.toISOString(),
    });
  }
}

console.log("=== Serviços do mês atual ===");
await criarServico({
  diasOffset: -3,
  horaInicio: "10:00",
  horaFim: "12:00",
  descricao: "Troca de tomadas queimadas no banheiro",
  status: "realizado",
  precoValor: 170,
});
await criarServico({
  diasOffset: 1,
  horaInicio: "14:00",
  horaFim: "16:00",
  descricao: "Instalação de luminária na varanda",
  status: "confirmado",
  precoValor: 170,
});
await criarServico({
  diasOffset: 2,
  horaInicio: "09:00",
  horaFim: "10:00",
  descricao: "Verificar disjuntor caindo à noite",
  status: "pendente",
  precoValor: 85,
});
console.log("Pronto.");
