// Semente do mural público da landing (Fatia 2, lote A3 — pedido do Leonardo
// em 10/09/2026): cria 4 prestadores de EXEMPLO extras (profiles.exemplo =
// true, tipo_base prestador_servico, cidades vizinhas a Niterói/RJ) e publica
// ~11 anúncios reais de obra/manutenção — ~6 vagas "Necessita-se ajudante!"
// (migration 0044, tipo vaga_ajudante) e ~5 anúncios de serviço (tipo
// servico) — distribuídos entre esses 4 e o João de exemplo já existente
// (joao.ferreira@meajudaai.app, criado por scripts/seed-fake-data.mjs). É o
// conteúdo que `/` mostra no carrossel de vagas e na vitrine de serviços,
// pela RPC pública `anuncios_publicos` (migrations 0044/0045).
//
// No máximo 3 anúncios ATIVOS por prestador — o gatilho `anuncios_validar`
// (0044) barra acima disso, mesmo vindo da chave de serviço.
//
// Idempotente: reaproveita conta (casada por e-mail) e anúncio (casado por
// prestador + título) já existentes em vez de duplicar a cada execução.
//
// Fotos: nenhuma conta sem foto (decisão do Leonardo, 10/09/2026) — usa
// fotoAleatoria de scripts/fotos-publicas.mjs direto na criação, mesmo
// algoritmo (hash do user_id + gênero) que preencherFotos aplicaria depois.
//
// Uso: node scripts/seed-anuncios.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Mesma senha das outras contas de exemplo (lib/auth/contas-exemplo.ts) —
// estas 4 não entram nessa lista (não têm entrada de um clique na landing),
// mas seguem a mesma convenção pra quem quiser logar manualmente.
const SENHA = "MeAjudaAi2026!";

/** Cria (ou reaproveita, casado por e-mail) um prestador de exemplo com perfil completo. Devolve o user_id. */
async function criarPrestadorExemplo({
  email, nome, cidade, estado, genero, categoria, bio, disponibilidade, precoValor, telefone,
}) {
  const { data: existentes } = await admin.auth.admin.listUsers();
  const jaExiste = existentes?.users?.find((u) => u.email === email);
  if (jaExiste) {
    console.log(`Já existe: ${email} (${jaExiste.id}) — reaproveitando.`);
    return jaExiste.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: SENHA, email_confirm: true });
  if (error) throw new Error(`Falha ao criar ${email}: ${error.message}`);
  const userId = data.user.id;
  const { error: perfilErr } = await admin.from("profiles").insert({
    user_id: userId,
    nome,
    tipo_base: "prestador_servico",
    cidade,
    estado,
    genero,
    categoria,
    bio,
    disponibilidade,
    preco_tipo: "servico",
    preco_valor: precoValor,
    foto_url: fotoAleatoria(userId, genero),
    verificado: true,
    exemplo: true,
  });
  if (perfilErr) throw new Error(`Falha no perfil de ${email}: ${perfilErr.message}`);
  const { error: piiErr } = await admin.from("profiles_pii").insert({ user_id: userId, email, telefone });
  if (piiErr) throw new Error(`Falha no PII de ${email}: ${piiErr.message}`);
  console.log(`Criado prestador de exemplo: ${nome} <${email}> / ${SENHA}`);
  return userId;
}

/** Publica (ou reaproveita, casado por prestador + título) um anúncio. Devolve o id. */
async function publicarAnuncio({ prestadorId, tipo, titulo, descricao, categoria, cidade, estado, whatsapp }) {
  const { data: existente, error: buscaErr } = await admin
    .from("anuncios")
    .select("id")
    .eq("prestador_id", prestadorId)
    .eq("titulo", titulo)
    .maybeSingle();
  if (buscaErr) throw new Error(`Falha ao conferir "${titulo}": ${buscaErr.message}`);
  if (existente) {
    console.log(`Já existe: "${titulo}" — pulando.`);
    return existente.id;
  }
  const { data, error } = await admin
    .from("anuncios")
    .insert({ prestador_id: prestadorId, tipo, titulo, descricao, categoria, cidade, estado, whatsapp, status: "ativo" })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao publicar "${titulo}": ${error.message}`);
  console.log(`Publicado (${tipo}): "${titulo}"`);
  return data.id;
}

async function main() {
  console.log("=== Prestadores de exemplo (mural público) ===");
  const carlosId = await criarPrestadorExemplo({
    email: "exemplo-anuncio-1@meajudaai.app",
    nome: "Carlos Mendes",
    cidade: "Niterói", estado: "RJ", genero: "masculino",
    categoria: "ajudante_pedreiro",
    bio: "Pedreiro há 15 anos, especializado em reforma e ampliação residencial em Niterói e região.",
    disponibilidade: "Seg a sáb, 7h-17h",
    precoValor: 400,
    telefone: "21987001001",
  });
  const patriciaId = await criarPrestadorExemplo({
    email: "exemplo-anuncio-2@meajudaai.app",
    nome: "Patrícia Souza",
    cidade: "São Gonçalo", estado: "RJ", genero: "feminino",
    categoria: "ajudante_pintor",
    bio: "Pintora profissional, atendo residências e comércios em São Gonçalo e Niterói. Orçamento sem compromisso.",
    disponibilidade: "Seg a sex, 8h-18h",
    precoValor: 320,
    telefone: "21987002002",
  });
  const robertoId = await criarPrestadorExemplo({
    email: "exemplo-anuncio-3@meajudaai.app",
    nome: "Roberto Almeida",
    cidade: "Niterói", estado: "RJ", genero: "masculino",
    categoria: "ajudante_encanador",
    bio: "Encanador com 10 anos de experiência em reparo de vazamento, instalação e manutenção hidráulica.",
    disponibilidade: "Todos os dias, 7h-20h (inclusive urgência)",
    precoValor: 250,
    telefone: "21987003003",
  });
  const fernandaId = await criarPrestadorExemplo({
    email: "exemplo-anuncio-4@meajudaai.app",
    nome: "Fernanda Ribeiro",
    cidade: "Maricá", estado: "RJ", genero: "feminino",
    categoria: "mestre_obras",
    bio: "Mestre de obras, gerencio equipes de reforma e construção em Maricá e região dos Lagos.",
    disponibilidade: "Seg a sex, 7h-17h",
    precoValor: 450,
    telefone: "21987004004",
  });

  console.log("\n=== Localizando o João de exemplo ===");
  const { data: usuarios } = await admin.auth.admin.listUsers();
  const joao = usuarios?.users?.find((u) => u.email === "joao.ferreira@meajudaai.app");
  if (!joao) {
    throw new Error(
      "João de exemplo (joao.ferreira@meajudaai.app) não encontrado — rode scripts/seed-fake-data.mjs primeiro.",
    );
  }
  const joaoId = joao.id;
  // O pedido citou o id 44acb9df-ec76-4154-aa31-b2deae8c18e2 de memória; o
  // script confia no e-mail (fonte real), só avisa se um dia divergirem.
  if (joaoId !== "44acb9df-ec76-4154-aa31-b2deae8c18e2") {
    console.warn(`Aviso: id do João (${joaoId}) difere do citado no pedido — seguindo com o id real.`);
  }

  console.log("\n=== Anúncios: Necessita-se ajudante! (vaga_ajudante) ===");
  await publicarAnuncio({
    prestadorId: carlosId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante de pedreiro para reforma",
    descricao:
      "Preciso de ajudante para reforma de banheiro e cozinha em apartamento — carregar material, preparar " +
      "argamassa e apoio geral na obra. Início imediato, obra de aproximadamente 3 semanas.",
    categoria: "ajudante_pedreiro", cidade: "Niterói", estado: "RJ", whatsapp: "21988771001",
  });
  await publicarAnuncio({
    prestadorId: carlosId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante para levantar parede de bloco",
    descricao:
      "Obra de ampliação de garagem precisa de ajudante para levantamento de parede de bloco, mistura de " +
      "massa e limpeza do canteiro. Serviço de alguns dias, combinação de valor direto com o contratante.",
    categoria: "ajudante_pedreiro", cidade: "Niterói", estado: "RJ", whatsapp: "21988771002",
  });
  await publicarAnuncio({
    prestadorId: patriciaId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante de pintor para prédio residencial",
    descricao:
      "Pintura externa de prédio residencial de 4 andares — preciso de ajudante com experiência em andaime " +
      "e lixamento de superfície. Serviço de 2 semanas, equipamento de proteção fornecido.",
    categoria: "ajudante_pintor", cidade: "São Gonçalo", estado: "RJ", whatsapp: "21988771003",
  });
  await publicarAnuncio({
    prestadorId: robertoId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante para reparo de vazamento",
    descricao:
      "Vazamento em coluna de prédio antigo — preciso de ajudante para abertura e fechamento de parede. " +
      "Sem experiência prévia obrigatória, eu ensino no local. Serviço de um dia.",
    categoria: "ajudante_encanador", cidade: "Niterói", estado: "RJ", whatsapp: "21988771004",
  });
  await publicarAnuncio({
    prestadorId: robertoId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante para instalação hidráulica",
    descricao:
      "Instalação hidráulica completa em casa nova — preciso de ajudante para abertura de rasgo, " +
      "assentamento de tubulação e apoio geral na obra. Serviço de aproximadamente 1 semana.",
    categoria: "ajudante_encanador", cidade: "Niterói", estado: "RJ", whatsapp: "21988771005",
  });
  await publicarAnuncio({
    prestadorId: fernandaId, tipo: "vaga_ajudante",
    titulo: "Necessita-se ajudante geral para obra de reforma",
    descricao:
      "Reforma completa de casa em Maricá precisa de ajudante geral — limpeza de canteiro, carregamento de " +
      "material e apoio a pedreiro e pintor. Obra de 2 meses, presença diária de segunda a sábado.",
    categoria: "ajudante_geral", cidade: "Maricá", estado: "RJ", whatsapp: "21988771006",
  });

  console.log("\n=== Anúncios: vitrine de serviço (servico) ===");
  await publicarAnuncio({
    prestadorId: carlosId, tipo: "servico",
    titulo: "Reforma e construção civil completa",
    descricao:
      "Reformas, ampliações e construção civil do zero — alvenaria, reboco, contrapiso e acabamento. " +
      "Atendo Niterói e região com equipe própria e orçamento detalhado antes de começar.",
    categoria: "ajudante_pedreiro", cidade: "Niterói", estado: "RJ", whatsapp: null,
  });
  await publicarAnuncio({
    prestadorId: patriciaId, tipo: "servico",
    titulo: "Pintura residencial e comercial",
    descricao:
      "Pintura interna e externa, tratamento de reboco e acabamento fino. Material de qualidade, prazo e " +
      "preço combinados com transparência antes de qualquer serviço.",
    categoria: "ajudante_pintor", cidade: "São Gonçalo", estado: "RJ", whatsapp: null,
  });
  await publicarAnuncio({
    prestadorId: patriciaId, tipo: "servico",
    titulo: "Textura e grafiato em fachadas",
    descricao:
      "Aplicação de textura e grafiato em fachadas residenciais e comerciais, com preparo completo da " +
      "superfície antes da aplicação. Garantia de 1 ano no serviço.",
    categoria: "ajudante_pintor", cidade: "São Gonçalo", estado: "RJ", whatsapp: null,
  });
  await publicarAnuncio({
    prestadorId: robertoId, tipo: "servico",
    titulo: "Manutenção hidráulica residencial",
    descricao:
      "Reparo de vazamento, desentupimento, troca de registro e instalação de louças e metais. " +
      "Atendimento rápido em Niterói e São Gonçalo.",
    categoria: "ajudante_encanador", cidade: "Niterói", estado: "RJ", whatsapp: null,
  });
  await publicarAnuncio({
    prestadorId: joaoId, tipo: "servico",
    titulo: "Serviços elétricos residenciais e comerciais",
    descricao:
      "Instalação e manutenção elétrica, troca de disjuntor, revisão de quadro de energia e pontos de luz. " +
      "12 anos de experiência, trabalho registrado com garantia de 90 dias.",
    categoria: "ajudante_eletricista", cidade: "Niterói", estado: "RJ", whatsapp: null,
  });

  console.log("\n=== Pronto ===");
  console.log("4 prestadores de exemplo + João: 6 vagas 'Necessita-se ajudante!' e 5 anúncios de serviço.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
