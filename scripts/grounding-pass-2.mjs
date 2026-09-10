// Pass 2 — observa o estado REAL do banco. Só leitura.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const out = (k, v) => console.log(`${k}\t${v}`);

// 1. papéis
const { data: perfis } = await sb.from("profiles").select("user_id, tipo_base, categoria");
const porPapel = {};
for (const p of perfis ?? []) porPapel[p.tipo_base] = (porPapel[p.tipo_base] ?? 0) + 1;
out("profiles.total", perfis?.length ?? 0);
for (const [k, v] of Object.entries(porPapel).sort()) out(`  tipo_base=${k}`, v);

// 2. tenancy: quem tem vínculo de workspace hoje
const { data: membros } = await sb.from("workspace_members").select("user_id, workspace_id, role");
const { data: wss } = await sb.from("workspaces").select("id, nome, cidade");
out("workspaces.total", wss?.length ?? 0);
for (const w of wss ?? []) out(`  workspace`, `${w.nome} (${w.cidade})`);
out("workspace_members.total", membros?.length ?? 0);
const comVinculo = new Set((membros ?? []).map((m) => m.user_id));
const semVinculo = (perfis ?? []).filter((p) => !comVinculo.has(p.user_id));
out("profiles SEM vinculo de workspace", semVinculo.length);
const semVinculoPorPapel = {};
for (const p of semVinculo) semVinculoPorPapel[p.tipo_base] = (semVinculoPorPapel[p.tipo_base] ?? 0) + 1;
for (const [k, v] of Object.entries(semVinculoPorPapel).sort()) out(`  orfao tipo_base=${k}`, v);

// 3. serviços: status, faixa de datas, categoria
const { data: servs } = await sb.from("servicos").select("id, status, created_at, preco_valor, slot_id");
const porStatus = {};
for (const s of servs ?? []) porStatus[s.status] = (porStatus[s.status] ?? 0) + 1;
out("servicos.total", servs?.length ?? 0);
for (const [k, v] of Object.entries(porStatus).sort()) out(`  status=${k}`, v);

// 4. amplitude do histórico — vem da data do SLOT, não do created_at
const { data: slots } = await sb.from("agenda_slots").select("id, data, status");
const datas = (slots ?? []).map((s) => s.data).filter(Boolean).sort();
out("agenda_slots.total", slots?.length ?? 0);
out("  slot mais antigo", datas[0] ?? "-");
out("  slot mais recente", datas[datas.length - 1] ?? "-");
if (datas.length > 1) {
  const meses =
    (new Date(datas[datas.length - 1]) - new Date(datas[0])) / (1000 * 60 * 60 * 24 * 30.44);
  out("  amplitude em meses", meses.toFixed(1));
}

// 5. categorias
const { data: cats } = await sb.from("categorias_servico").select("slug");
out("categorias_servico.total", cats?.length ?? 0);
const catsUsadas = new Set((perfis ?? []).map((p) => p.categoria).filter(Boolean));
out("categorias em uso por prestadores", catsUsadas.size);

// 6. chave Pix e registro de acesso
const { count: pixCount } = await sb
  .from("profiles_pii")
  .select("user_id", { count: "exact", head: true })
  .not("chave_pix", "is", null);
out("profiles_pii com chave_pix", pixCount ?? 0);
const { count: logins } = await sb.from("login_logs").select("id", { count: "exact", head: true });
out("login_logs.total", logins ?? 0);
