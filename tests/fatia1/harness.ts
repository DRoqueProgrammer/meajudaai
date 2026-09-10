import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Base comum dos testes-gabarito da Fatia 1 (cvg/docs/tech-spec/fatia-1-seguranca.md).
 *
 * Gabarito = escrito ANTES da implementação, no Pass 5 (decisão D-026): falha hoje e
 * só passa quando a regra existir de verdade. Os executores das tarefas não editam
 * nada em `tests/fatia1/`. Os testes de integração criam e apagam pessoas reais no
 * banco do protótipo — por isso só rodam em `npm run test:integration`, como o
 * `tests/rls.test.ts`.
 */

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const podeRodar = Boolean(url && anon && chaveServico) && process.env.RUN_INTEGRATION === "1";

// Um gabarito pulado deixa o vitest verde sem ter provado nada — pior que um
// vermelho. Quem pediu integração (RUN_INTEGRATION=1) e não tem credencial recebe
// um erro, nunca um "skipped". Acontece, por exemplo, numa cópia de trabalho sem o
// .env.local: exporte as três variáveis no shell que roda o teste.
if (process.env.RUN_INTEGRATION === "1" && !podeRodar) {
  throw new Error(
    "gabarito da Fatia 1: RUN_INTEGRATION=1 mas faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY — o teste de integração não pode ser pulado.",
  );
}

export const SENHA = "senha-gabarito-fatia1";

/** Cliente com a chave de serviço — só para preparar e limpar o cenário, nunca para "atacar". */
export const servico: SupabaseClient | null = podeRodar
  ? createClient(url!, chaveServico!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export function sufixo(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** O que o cenário criou, para a limpeza apagar mesmo se um teste quebrar no meio. */
export interface Registro {
  usuarios: string[];
  pracas: string[];
}

export function novoRegistro(): Registro {
  return { usuarios: [], pracas: [] };
}

type Papel = "admin" | "prestador_servico" | "funcionario" | "sysadmin" | "cliente";

/** Cria uma pessoa real (auth + perfil + PII) com a chave de serviço. */
export async function criarPessoa(
  reg: Registro,
  email: string,
  tipo: Papel,
  extraPerfil: Record<string, unknown> = {},
  extraPii: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await servico!.auth.admin.createUser({ email, password: SENHA, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser sem usuário");
  const id = data.user.id;
  reg.usuarios.push(id);
  const perfil = await servico!.from("profiles").insert({
    user_id: id,
    nome: email.split("@")[0],
    tipo_base: tipo,
    cidade: "Niterói",
    estado: "RJ",
    ...extraPerfil,
  });
  if (perfil.error) throw perfil.error;
  const pii = await servico!.from("profiles_pii").insert({ user_id: id, email, ...extraPii });
  if (pii.error) throw pii.error;
  return id;
}

/** Sessão real de um usuário comum, falando direto com o banco pela chave pública — "fora da aplicação". */
export async function entrar(email: string): Promise<SupabaseClient> {
  const c = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA });
  if (error) throw error;
  return c;
}

let diaSeguinte = 30;

/** Horário do prestador, criado com a chave de serviço, sempre num dia futuro próprio. */
export async function criarHorario(prestadorId: string, status: "livre" | "pendente" | "confirmado" = "livre"): Promise<string> {
  diaSeguinte += 1;
  const data = new Date(Date.now() + diaSeguinte * 86_400_000).toISOString().slice(0, 10);
  const { data: h, error } = await servico!
    .from("agenda_slots")
    .insert({ prestador_id: prestadorId, data, hora_inicio: "09:00", hora_fim: "10:00", status })
    .select("id")
    .single();
  if (error || !h) throw error ?? new Error("horário não criado");
  return h.id as string;
}

export async function contadorRealizados(prestadorId: string): Promise<number> {
  const { data, error } = await servico!.from("profiles").select("servicos_realizados").eq("user_id", prestadorId).single();
  if (error || !data) throw error ?? new Error("perfil não encontrado");
  return data.servicos_realizados as number;
}

/** Apaga tudo o que o cenário criou, na ordem que as chaves estrangeiras exigem. */
export async function limpar(reg: Registro): Promise<void> {
  if (!servico) return;
  const ids = reg.usuarios;
  if (ids.length) {
    await servico.from("servicos").delete().in("cliente_id", ids);
    await servico.from("servicos").delete().in("prestador_id", ids);
    await servico.from("agenda_slots").delete().in("prestador_id", ids);
    await servico.from("user_modules").delete().in("user_id", ids);
    await servico.from("login_logs").delete().in("user_id", ids);
    await servico.from("workspace_members").delete().in("user_id", ids);
  }
  if (reg.pracas.length) {
    await servico.from("user_modules").delete().in("workspace_id", reg.pracas);
    await servico.from("workspace_members").delete().in("workspace_id", reg.pracas);
    await servico.from("workspaces").delete().in("id", reg.pracas);
  }
  if (ids.length) {
    await servico.from("workspaces").delete().in("owner_id", ids);
    await servico.from("profile_local").delete().in("user_id", ids);
    await servico.from("profiles_pii").delete().in("user_id", ids);
    await servico.from("profiles").delete().in("user_id", ids);
    for (const id of ids) await servico.auth.admin.deleteUser(id);
  }
}
