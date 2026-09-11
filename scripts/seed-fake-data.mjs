// Seed de dados fake "de verdade" pro protótipo (não é o modo demo read-only
// de lib/auth/demo.ts — essas contas funcionam normalmente, dão pra editar).
// Cria 1 conta por papel (sysadmin, admin, funcionario, prestador_servico,
// cliente), todos os campos preenchidos, e ~3 anos de histórico de serviços
// entre o prestador e o cliente.
//
// Fotos: nenhuma conta sem foto (decisão do Leonardo, 10/09/2026). As contas
// nascem sem `foto_url` e, no fim, scripts/fotos-publicas.mjs dá a cada uma um
// retrato público do randomuser.me pelo gênero cadastrado.
//
// Uso: node scripts/seed-fake-data.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { preencherFotos } from "./fotos-publicas.mjs";

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
const SENHA = "MeAjudaAi2026!";

// Sem foto aqui: preencherFotos (scripts/fotos-publicas.mjs) completa no fim.
const FOTO = {
  sysadmin: null,
  admin: null,
  funcionario: null,
  prestador: null,
  cliente: null,
};

async function criarConta({ email, nome, tipo_base, cidade, estado, genero, bio, disponibilidade, foto_url, categoria, preco_tipo, preco_valor, telefone }) {
  const { data: existente } = await admin.auth.admin.listUsers();
  const jaExiste = existente?.users?.find((u) => u.email === email);
  if (jaExiste) {
    console.log(`Já existe: ${email} (${jaExiste.id}) — pulando criação, reaproveitando.`);
    return jaExiste.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: SENHA, email_confirm: true });
  if (error) throw new Error(`Falha ao criar ${email}: ${error.message}`);
  const userId = data.user.id;
  const { error: perfilErr } = await admin.from("profiles").insert({
    user_id: userId,
    nome,
    tipo_base,
    cidade,
    estado,
    genero,
    bio,
    disponibilidade,
    foto_url,
    verificado: true,
    ...(categoria ? { categoria } : {}),
    ...(preco_tipo ? { preco_tipo, preco_valor } : {}),
  });
  if (perfilErr) throw new Error(`Falha no perfil de ${email}: ${perfilErr.message}`);
  const { error: piiErr } = await admin.from("profiles_pii").insert({ user_id: userId, email, telefone });
  if (piiErr) throw new Error(`Falha no PII de ${email}: ${piiErr.message}`);
  console.log(`Criado ${tipo_base}: ${nome} <${email}> / ${SENHA}`);
  return userId;
}

console.log("=== Criando contas ===");
const sysadminId = await criarConta({
  email: "ricardo.bastos@meajudaai.app",
  nome: "Ricardo Bastos",
  tipo_base: "sysadmin",
  cidade: "Niterói", estado: "RJ", genero: "masculino",
  bio: "Sócio-fundador do MeAjuda Aí. Cuido da operação da plataforma como um todo.",
  disponibilidade: "Horário comercial", foto_url: FOTO.sysadmin,
  telefone: "21988880001",
});
const adminId = await criarConta({
  email: "marcelo.lopes@meajudaai.app",
  nome: "Marcelo Lopes",
  tipo_base: "admin",
  cidade: "Niterói", estado: "RJ", genero: "masculino",
  bio: "Dono da Construtora Lopes, com equipe de eletricistas e encanadores atendendo Niterói e região.",
  disponibilidade: "Seg a sex, 8h-18h", foto_url: FOTO.admin,
  telefone: "21988880002",
});
const funcionarioId = await criarConta({
  email: "beatriz.andrade@meajudaai.app",
  nome: "Beatriz Andrade",
  tipo_base: "funcionario",
  cidade: "Niterói", estado: "RJ", genero: "feminino",
  bio: "Cuido do atendimento e da agenda da equipe na Construtora Lopes.",
  disponibilidade: "Seg a sex, 9h-17h", foto_url: FOTO.funcionario,
  telefone: "21988880003",
});
const prestadorId = await criarConta({
  email: "joao.ferreira@meajudaai.app",
  nome: "João Ferreira",
  tipo_base: "prestador_servico",
  cidade: "Niterói", estado: "RJ", genero: "masculino",
  bio: "Eletricista há 12 anos, atendo residências e pequenos comércios em Niterói e São Gonçalo. Trabalho registrado e com garantia de 90 dias em todo serviço.",
  disponibilidade: "Seg a sáb, 7h-19h", foto_url: FOTO.prestador,
  categoria: "ajudante_eletricista", preco_tipo: "hora", preco_valor: 85,
  telefone: "21988880004",
});
const clienteId = await criarConta({
  email: "marina.costa@meajudaai.app",
  nome: "Marina Costa",
  tipo_base: "cliente",
  cidade: "Niterói", estado: "RJ", genero: "feminino",
  bio: null,
  disponibilidade: null, foto_url: FOTO.cliente,
  telefone: "21988880005",
});

console.log("\n=== Workspace da Construtora Lopes ===");
const { data: wsExistente } = await admin.from("workspaces").select("id").eq("owner_id", adminId).maybeSingle();
let workspaceId = wsExistente?.id;
if (!workspaceId) {
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({ owner_id: adminId, nome: "Construtora Lopes", cidade: "Niterói", estado: "RJ" })
    .select("id")
    .single();
  if (wsErr) throw new Error(`Falha ao criar workspace: ${wsErr.message}`);
  workspaceId = ws.id;
  await admin.from("workspace_members").insert([
    { workspace_id: workspaceId, user_id: adminId, role: "owner" },
    { workspace_id: workspaceId, user_id: funcionarioId, role: "membro" },
  ]);
  await admin.from("user_modules").insert([
    { user_id: funcionarioId, workspace_id: workspaceId, module: "equipe", allowed: true },
  ]);
  console.log(`Workspace criado: ${workspaceId}`);
} else {
  console.log(`Workspace já existia: ${workspaceId}`);
}

console.log("\n=== Localização exata (profile_local) ===");
// Niterói — dois pontos ~2km de distância um do outro (bairros diferentes).
await admin.from("profile_local").upsert({ user_id: prestadorId, lat: -22.8832, lng: -43.1034 });
await admin.from("profile_local").upsert({ user_id: clienteId, lat: -22.9035, lng: -43.1197 });

console.log("\n=== Histórico de 3 anos (João ↔ Marina) ===");
const DESCRICOES = [
  "Troca de disjuntor que estava desarmando sozinho",
  "Instalação de 3 tomadas novas na cozinha",
  "Revisão geral do quadro de energia",
  "Instalação de ventilador de teto na sala",
  "Reparo em curto-circuito no quarto",
  "Instalação de chuveiro elétrico novo",
  "Troca de fiação de um circuito antigo",
  "Instalação de pontos de luz no quintal",
  "Manutenção preventiva anual",
  "Instalação de interfone",
];
const hoje = new Date();
let criados = 0;
for (let mesesAtras = 35; mesesAtras >= 1; mesesAtras -= 1) {
  // ~1 serviço por mês, não todo mês pra ficar mais realista (pula ~1 em 4).
  if (mesesAtras % 4 === 0) continue;
  const data = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 5 + (mesesAtras % 20));
  const dataIso = data.toLocaleDateString("sv-SE");
  const horaInicio = ["08:00", "09:00", "13:00", "14:00"][mesesAtras % 4];
  const horaFimNum = Number(horaInicio.slice(0, 2)) + 2;
  const horaFim = `${String(horaFimNum).padStart(2, "0")}:00`;

  const { data: slot, error: slotErr } = await admin
    .from("agenda_slots")
    .insert({ prestador_id: prestadorId, data: dataIso, hora_inicio: horaInicio, hora_fim: horaFim, status: "confirmado" })
    .select("id")
    .single();
  if (slotErr) { console.error(`Slot falhou (${dataIso}): ${slotErr.message}`); continue; }

  const cancelado = mesesAtras % 11 === 0; // uns 3 cancelados em 3 anos
  const valorBase = 85 * 2; // 2 horas
  const valorFinal = mesesAtras % 7 === 0 ? valorBase + 150 : valorBase; // simula uma renegociação ocasional

  const { data: servico, error: servErr } = await admin
    .from("servicos")
    .insert({
      slot_id: slot.id,
      cliente_id: clienteId,
      prestador_id: prestadorId,
      descricao: DESCRICOES[mesesAtras % DESCRICOES.length],
      preco_tipo: "hora",
      preco_valor: valorFinal,
      status: cancelado ? "cancelado" : "realizado",
      ...(cancelado ? { cancelado_motivo: "Cliente remarcou para outra data por imprevisto.", cancelado_em: data.toISOString() } : {}),
      created_at: data.toISOString(),
    })
    .select("id")
    .single();
  if (servErr) { console.error(`Serviço falhou (${dataIso}): ${servErr.message}`); continue; }
  criados += 1;

  if (!cancelado) {
    await admin.from("avaliacoes").insert({
      avaliador_id: clienteId,
      avaliado_id: prestadorId,
      nota: [5, 5, 5, 4][mesesAtras % 4],
      comentario: mesesAtras % 5 === 0 ? "Ótimo serviço, super pontual e caprichoso." : null,
      created_at: data.toISOString(),
    });
    if (mesesAtras % 6 === 0) {
      await admin.from("servico_logs").insert({
        servico_id: servico.id,
        autor_id: prestadorId,
        texto: "Cliente de confiança, sempre paga em dia e é flexível com horário.",
      });
    }
  }
}
console.log(`${criados} serviços históricos criados (~3 anos).`);

console.log("\n=== Horários livres nas próximas semanas ===");
let futuros = 0;
for (let dias = 3; dias <= 21; dias += 3) {
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
  const dataIso = data.toLocaleDateString("sv-SE");
  const { error } = await admin.from("agenda_slots").insert({
    prestador_id: prestadorId,
    data: dataIso,
    hora_inicio: "09:00",
    hora_fim: "11:00",
    status: "livre",
  });
  if (!error) futuros += 1;
}
console.log(`${futuros} horários livres criados para os próximos dias.`);

console.log(`Fotos públicas: ${await preencherFotos(admin)} perfil(is).`);

console.log("\n=== Pronto ===");
console.log("Contas criadas (senha para todas: " + SENHA + "):");
console.log("  SysAdmin:            ricardo.bastos@meajudaai.app");
console.log("  Administrador:       marcelo.lopes@meajudaai.app");
console.log("  Funcionário:         beatriz.andrade@meajudaai.app");
console.log("  Prestador de Serviço: joao.ferreira@meajudaai.app");
console.log("  Cliente:             marina.costa@meajudaai.app");
