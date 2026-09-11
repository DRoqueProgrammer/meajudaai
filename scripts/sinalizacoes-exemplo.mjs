// Semente de red flags no mundo de EXEMPLO (pedido do Leonardo em 11/09/2026:
// ver o "N× bandeira" funcionando no painel do Administrador, no perfil e no
// cartão de hover). Duas sinalizações APROVADAS do prestador de exemplo contra
// a cliente de exemplo Marina Costa, em dois serviços já engajados (realizado
// ou cancelado) entre os dois — decididas pelo Administrador dono da praça da
// cidade dela. Só contas com profiles.exemplo = true; nada do mundo real.
//
// Idempotente: um serviço já sinalizado pelo mesmo autor é pulado.
//
// Uso: node scripts/sinalizacoes-exemplo.mjs
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

const SINALIZACOES = [
  { motivo: "nao_compareceu", justificativa: "Combinamos a visita às 10h e ninguém estava em casa; não respondeu às mensagens." },
  { motivo: "contato_por_fora", justificativa: "Pediu para fecharmos o próximo serviço direto pelo WhatsApp, fora do app." },
];

const { data: marina } = await sb
  .from("profiles")
  .select("user_id, cidade, estado")
  .eq("nome", "Marina Costa")
  .eq("exemplo", true)
  .maybeSingle();
if (!marina) throw new Error("Marina Costa (exemplo) não encontrada.");

const { data: servicos } = await sb
  .from("servicos")
  .select("id, prestador_id, status, created_at")
  .eq("cliente_id", marina.user_id)
  .in("status", ["realizado", "cancelado"])
  .order("created_at", { ascending: true });

// Só prestadores de exemplo (nunca sinalizar em nome de uma conta real).
const prestadorIds = [...new Set((servicos ?? []).map((s) => s.prestador_id))];
const { data: exemplos } = prestadorIds.length
  ? await sb.from("profiles").select("user_id").in("user_id", prestadorIds).eq("exemplo", true)
  : { data: [] };
const ehExemplo = new Set((exemplos ?? []).map((p) => p.user_id));
const candidatos = (servicos ?? []).filter((s) => ehExemplo.has(s.prestador_id)).slice(0, SINALIZACOES.length);
if (candidatos.length === 0) throw new Error("Nenhum serviço engajado da Marina com prestador de exemplo.");

// Quem decide: o dono da praça de exemplo da cidade dela.
const { data: pracas } = await sb
  .from("workspaces")
  .select("id, owner_id, created_at")
  .eq("cidade", marina.cidade)
  .eq("estado", marina.estado)
  .order("created_at", { ascending: true });
const donos = (pracas ?? []).map((w) => w.owner_id);
const { data: donosExemplo } = donos.length
  ? await sb.from("profiles").select("user_id").in("user_id", donos).eq("exemplo", true)
  : { data: [] };
const decisor = donosExemplo?.[0]?.user_id ?? null;

let criadas = 0;
for (const [i, s] of candidatos.entries()) {
  const { data: ja } = await sb.from("sinalizacoes").select("id").eq("servico_id", s.id).eq("autor_id", s.prestador_id).maybeSingle();
  if (ja) continue;
  const { error } = await sb.from("sinalizacoes").insert({
    autor_id: s.prestador_id,
    alvo_id: marina.user_id,
    servico_id: s.id,
    direcao: "prestador_para_cliente",
    ...SINALIZACOES[i],
    status: "aprovada",
    decidido_por: decisor,
    decidido_em: new Date().toISOString(),
  });
  if (error) throw error;
  criadas++;
}
console.log(`Sinalizações aprovadas criadas: ${criadas} (de ${candidatos.length} serviços candidatos).`);
