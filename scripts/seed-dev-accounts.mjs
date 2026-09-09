// Cria 2 contas mínimas de teste (1 prestador_servico, 1 cliente) direto via
// Admin API — só para desenvolvimento local enquanto o cadastro de Cliente
// ainda não existe na UI. Não é o seed de demonstração final (3 anos de dados
// fake, ver ROADMAP.md) — isso é um script separado, a fazer no fim da v2.
//
// Uso: node scripts/seed-dev-accounts.mjs
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

async function criar({ email, senha, nome, tipo_base, cidade, estado, preco_tipo, preco_valor }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) {
    console.error(`Falha ao criar ${email}:`, error.message);
    return null;
  }
  const userId = data.user.id;
  await admin.from("profiles").insert({
    user_id: userId,
    nome,
    tipo_base,
    cidade,
    estado,
    ...(preco_tipo ? { preco_tipo, preco_valor } : {}),
  });
  await admin.from("profiles_pii").insert({ user_id: userId, email, telefone: `219${Math.floor(1e7 + Math.random() * 9e7)}` });
  console.log(`Criado ${tipo_base}: ${email} / ${senha} (user_id ${userId})`);
  return userId;
}

await criar({
  email: "prestador.dev@teste.local",
  senha: "DevTeste2026!",
  nome: "João Prestador (dev)",
  tipo_base: "prestador_servico",
  cidade: "Niterói",
  estado: "RJ",
  preco_tipo: "hora",
  preco_valor: 80,
});

await criar({
  email: "cliente.dev@teste.local",
  senha: "DevTeste2026!",
  nome: "Maria Cliente (dev)",
  tipo_base: "cliente",
  cidade: "Niterói",
  estado: "RJ",
});
