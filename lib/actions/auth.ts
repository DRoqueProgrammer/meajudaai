"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { tryWriter } from "@/lib/auth/guard";
import { papelPermitidoNoCadastro, podeTrocarPara } from "@/lib/auth/papeis";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CadastroSchema } from "@/lib/validation";
import { podeAceitar } from "@/lib/convite-status";
import { soDigitos } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";
import { fotoAleatoria } from "@/lib/foto-aleatoria";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { campo, valoresPreservados, type EstadoForm } from "./form";

/** Retorno padrão das actions imperativas (botões): sucesso ou mensagem de erro pronta para o cliente. */
export interface ActionResult {
  ok: boolean;
  erro?: string;
}

/**
 * Cria a conta (form sem JS). Dois caminhos: via convite, o papel vem do
 * convite e o usuário entra na empresa de quem convidou (fica pendente de
 * aprovação); fora dele, só Cliente e Prestador de Serviço passam — a regra
 * única de `lib/auth/papeis.ts` (R-44, D-016; Administrador nasce só por ação
 * do SysAdmin). Cria auth user + profiles + profiles_pii (checando
 * telefone/e-mail únicos) e já inicia a sessão.
 */
export async function cadastrarAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  // `cidadeUf` chega como "Niterói|RJ" do <select>.
  const [cidade, estado] = campo(fd, "cidadeUf").split("|");
  const preserva = valoresPreservados(fd, ["senha"]);
  const admin = createAdminClient();

  // Cadastro via convite: o papel vem do convite (owner → admin, membro →
  // funcionario), não do formulário; e não se cria empresa (entra na de quem convidou).
  const conviteToken = campo(fd, "convite_token");
  let invite: { id: string; role: string; workspace_id: string; created_by: string } | null = null;
  if (conviteToken) {
    const { data: inv } = await admin
      .from("invite")
      .select("id, role, status, expires_at, workspace_id, created_by")
      .eq("token", conviteToken)
      .maybeSingle();
    if (!inv || !podeAceitar(inv, new Date())) {
      return { erro: "Convite inválido ou expirado.", valores: preserva };
    }
    invite = { id: inv.id, role: inv.role, workspace_id: inv.workspace_id, created_by: inv.created_by };
  }
  const tipoBaseAlvo = invite ? (invite.role === "owner" ? "admin" : "funcionario") : campo(fd, "tipo_base");

  const parsed = CadastroSchema.safeParse({
    nome: campo(fd, "nome"),
    email: campo(fd, "email"),
    senha: String(fd.get("senha") ?? ""),
    telefone: campo(fd, "telefone"),
    cidade,
    estado,
    tipo_base: tipoBaseAlvo,
    genero: campo(fd, "genero"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // O papel é a primeira pergunta da tela; sem ele a mensagem do zod
    // ("Invalid enum value") não diria nada a quem está cadastrando.
    const erro =
      issue?.path[0] === "tipo_base"
        ? "Escolha uma das opções: contratar um serviço ou prestar serviço."
        : (issue?.message ?? "Dados inválidos");
    return { erro, valores: preserva };
  }
  const d = parsed.data;
  // Regra única (R-44, D-016, lib/auth/papeis.ts): sem convite, só cliente e
  // prestador_servico passam; com convite, vale o papel que ele trouxe
  // ("funcionario" só nasce assim). A checagem vive na action, não só na tela
  // — esconder a opção e deixar a action aceitar era o anti-padrão que
  // permitia qualquer pessoa virar Administrador.
  if (!papelPermitidoNoCadastro(d.tipo_base, !!invite)) {
    return { erro: "Escolha uma das opções: contratar um serviço ou prestar serviço.", valores: preserva };
  }
  const telefone = soDigitos(d.telefone);

  // Cliente e prestador_servico precisam de endereço + PIN exato (ROADMAP.md §7) —
  // é o que permite ordenar buscas por proximidade. Os outros papéis não usam isso.
  const endereco = campo(fd, "endereco");
  const latStr = campo(fd, "lat");
  const lngStr = campo(fd, "lng");
  const precisaLocalizacao = d.tipo_base === "cliente" || d.tipo_base === "prestador_servico";
  if (precisaLocalizacao && (!endereco || !latStr || !lngStr)) {
    return { erro: "Marque sua localização exata no mapa.", valores: preserva };
  }

  const { data: dup } = await admin
    .from("profiles_pii")
    .select("user_id")
    .or(`telefone.eq.${telefone},email.eq.${d.email}`)
    .maybeSingle();
  if (dup) return { erro: "Telefone ou e-mail já cadastrado.", valores: preserva };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.senha,
    email_confirm: true,
    user_metadata: { nome: d.nome },
  });
  if (createErr || !created.user) {
    return { erro: "Não foi possível criar a conta (e-mail já em uso?).", valores: preserva };
  }
  const userId = created.user.id;

  await admin.from("profiles").insert({
    user_id: userId,
    nome: d.nome,
    cidade: d.cidade,
    estado: d.estado,
    tipo_base: d.tipo_base,
    genero: d.genero,
    // Nenhuma conta sem foto (lib/foto-aleatoria.ts): nasce com um retrato
    // público pelo gênero; a pessoa troca pela dela em Editar perfil.
    foto_url: fotoAleatoria(userId, d.genero),
  });
  if (precisaLocalizacao) {
    // Endereço escrito e ponto exato moram juntos em profile_local, sob a mesma
    // RLS (dono, sysadmin, ou a outra parte de um serviço válido) — nunca em
    // `profiles`, que qualquer autenticado lê (R-41, ADR 0015, migration 0039).
    await admin
      .from("profile_local")
      .insert({ user_id: userId, lat: Number(latStr), lng: Number(lngStr), endereco });
  }
  const { error: piiErr } = await admin
    .from("profiles_pii")
    .insert({ user_id: userId, telefone, email: d.email });
  if (piiErr) {
    await admin.auth.admin.deleteUser(userId);
    return { erro: "Telefone ou e-mail já cadastrado.", valores: preserva };
  }

  if (invite) {
    // Entra na equipe de quem convidou (na aprovação); por ora, fica pendente.
    await admin
      .from("invite")
      .update({ status: "aceito", accepted_by: userId, accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    await admin.from("notificacoes").insert({
      user_id: invite.created_by,
      tipo: "convite_aceito",
      titulo: "Alguém aceitou seu convite",
      mensagem: `${d.nome} pediu para entrar na equipe. Aprove em Equipe.`,
      link: "/equipe",
    });
  }
  // Sem convite, `d.tipo_base` só pode ser cliente ou prestador_servico (checado
  // acima por `papelPermitidoNoCadastro`) — nenhum dos dois cria empresa própria
  // (R-44, D-016: só o SysAdmin vincula Administrador a uma praça).

  const sb = await createServerClient();
  const { error: signInErr } = await sb.auth.signInWithPassword({
    email: d.email,
    password: d.senha,
  });
  // Conta criada mas sessão falhou: manda para o login em vez de deixar a
  // pessoa achando que o cadastro não funcionou.
  if (signInErr) redirect("/login?criada=1");

  redirect("/inicio");
}

/**
 * Login ligado direto no `<form action={...}>`.
 *
 * Recebe `FormData` e redireciona no servidor: assim o formulário funciona sem
 * JavaScript nenhum. Antes era `onSubmit` + `router.push`, e antes da
 * hidratação o submit nativo virava GET com a senha na query string.
 *
 * O `redirect()` fica FORA de try/catch de propósito — ele sinaliza por
 * exceção, e um catch em volta o engoliria.
 */
/**
 * Registra IP + dispositivo + geolocalização por IP a cada login bem-sucedido
 * (ROADMAP.md §5.1 — só o SysAdmin lê, ver migration 0031). Nunca bloqueia o
 * login: qualquer falha aqui (API de geo fora do ar, etc.) é engolida.
 */
export async function registrarLoginLog(userId: string): Promise<void> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent");
    let cidade: string | null = null;
    let pais: string | null = null;
    if (ip && ip !== "127.0.0.1" && !ip.startsWith("::1")) {
      const geo = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2500) })
        .then((r) => r.json())
        .catch(() => null);
      cidade = geo?.city ?? null;
      pais = geo?.country_name ?? null;
    }
    await createAdminClient().from("login_logs").insert({ user_id: userId, ip, user_agent: userAgent, cidade, pais });
  } catch {
    // Auditoria é best-effort — nunca derruba o login por causa dela.
  }
}

export async function entrarAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = campo(fd, "email");
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha.", valores: { email } };
  }

  const sb = await createServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  // A senha nunca volta em `valores`.
  if (error) return { erro: "E-mail ou senha inválidos.", valores: { email } };

  await registrarLoginLog(data.user.id);

  // Conta desativada pelo próprio dono (nunca deletamos, ver ROADMAP.md §3):
  // antes de voltar a usar, pede pra confirmar os dados.
  const { data: perfil } = await sb.from("profiles").select("status").eq("user_id", data.user.id).maybeSingle();
  if (perfil?.status === "inativo") redirect("/reativar");

  redirect("/inicio");
}

/**
 * Envia o link de recuperação de senha.
 *
 * Devolve `ok: true` mesmo quando o e-mail não existe. Dizer "e-mail não
 * cadastrado" transforma o formulário num verificador de quem está na base —
 * e a base aqui são telefones e e-mails de pessoas reais.
 */
export async function recuperarSenhaAction(
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const email = campo(fd, "email");
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { erro: "Digite um e-mail válido.", valores: { email } };

  const origem = await getSiteUrl();
  const sb = await createServerClient();
  const { error } = await sb.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origem}/auth/confirmar?next=/nova-senha`,
  });

  // O erro era engolido por completo. A resposta ao usuário continua neutra
  // (senão o formulário vira verificador de quem está na base), mas SMTP mal
  // configurado e estouro de cota precisam aparecer para quem opera —
  // era o único jeito de "não chega e-mail" virar diagnóstico.
  if (error) {
    console.error(
      `[auth] falha ao enviar recuperação de senha (status ${error.status ?? "?"}): ${error.message}`,
    );
  }
  // `ok` em vez de redirect: a tela troca para o recibo "confira seu e-mail",
  // que precisa repetir o endereço digitado.
  return { ok: true, valores: { email: parsed.data } };
}

/** Define a senha nova. Só funciona com a sessão criada pelo link do e-mail. */
export async function definirSenhaAction(
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const senha = String(fd.get("senha") ?? "");
  const repetida = String(fd.get("repetida") ?? "");
  // A conferência das duas senhas era só no cliente; sem JS ela não existia.
  if (senha !== repetida) return { erro: "As duas senhas precisam ser iguais." };

  const parsed = z.string().min(6, "Mínimo de 6 caracteres").safeParse(senha);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Senha inválida." };
  }
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { erro: "Seu link expirou. Peça um novo e-mail de recuperação." };
  }
  const { error } = await sb.auth.updateUser({ password: parsed.data });
  if (error) return { erro: "Não foi possível salvar a senha nova. Tente de novo." };

  redirect("/inicio");
}

/**
 * O usuário troca o próprio papel — a saída para quem escolheu errado no
 * cadastro. Antes, só o sysadmin conseguia (lib/actions/admin-users.ts), o que
 * deixava um ajudante preso numa conta de profissional sem /vagas no rodapé.
 *
 * Usa a regra única de `lib/auth/papeis.ts` (R-44, D-016): a troca nunca leva
 * a Administrador — quem já é prestador_servico perde essa saída (só o
 * SysAdmin vincula alguém a uma praça como Administrador); quem já é admin
 * ainda pode voltar a ser prestador_servico. Só vale enquanto a conta está
 * limpa: com vaga publicada ou candidatura enviada, trocar o papel deixaria
 * registros órfãos do outro lado do marketplace.
 */
export async function trocarMeuPapelAction(novo: "admin" | "prestador_servico"): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "admin" && user.role !== "prestador_servico") {
    return { ok: false, erro: "Só profissional e ajudante podem trocar de papel por aqui." };
  }
  if (user.role === novo) return { ok: true };
  if (!podeTrocarPara(user.role, novo)) {
    return { ok: false, erro: "Ninguém se torna administrador por essa troca — fale com o SysAdmin." };
  }

  const db = createAdminClient();
  const [{ count: vagas }, { count: candidaturas }] = await Promise.all([
    db.from("vagas").select("id", { count: "exact", head: true }).eq("criado_por", user.id),
    db.from("candidaturas").select("id", { count: "exact", head: true }).eq("ajudante_id", user.id),
  ]);
  if ((vagas ?? 0) > 0) {
    return { ok: false, erro: "Você já publicou vaga nesta conta — não dá mais para trocar de papel." };
  }
  if ((candidaturas ?? 0) > 0) {
    return { ok: false, erro: "Você já se candidatou a uma vaga — não dá mais para trocar de papel." };
  }

  const { error } = await db.from("profiles").update({ tipo_base: novo }).eq("user_id", user.id);
  if (error) return { ok: false, erro: "Não foi possível trocar o papel." };

  // O JWT carrega app_role (hook da migration 0001) e as policies leem dele via
  // current_app_role(). Sem refresh, o token fica com o papel antigo e o banco
  // discorda da interface até o próximo login.
  const sb = await createServerClient();
  await sb.auth.refreshSession();

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Encerra a sessão do usuário. */
export async function logoutAction(): Promise<void> {
  const sb = await createServerClient();
  await sb.auth.signOut();
  redirect("/");
}

/**
 * O usuário desativa a própria conta — nunca deletamos (ROADMAP.md §3). Ao
 * logar de novo, `entrarAction` manda pra `/reativar` antes de voltar ao uso normal.
 */
export async function desativarMinhaContaAction(): Promise<void> {
  const w = await tryWriter();
  if ("erro" in w) return;
  const sb = await createServerClient();
  await sb.from("profiles").update({ status: "inativo" }).eq("user_id", w.user.id);
  await sb.auth.signOut();
  redirect("/");
}

/**
 * Confirma os dados e reativa a conta (chamado a partir de `/reativar`).
 * Foto é opcional — o resto (nome, telefone, cidade) precisa ser confirmado.
 */
export async function reativarContaAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro };
  const [cidade, estado] = campo(fd, "cidadeUf").split("|");
  const nome = campo(fd, "nome");
  const telefone = soDigitos(campo(fd, "telefone"));
  if (!nome || !telefone || !cidade) return { erro: "Preencha nome, telefone e cidade." };

  const sb = await createServerClient();
  const { error: piiErr } = await sb.from("profiles_pii").update({ telefone }).eq("user_id", w.user.id);
  if (piiErr) return { erro: "Esse telefone já está em uso por outra conta." };
  await sb.from("profiles").update({ nome, cidade, estado, status: "ativo" }).eq("user_id", w.user.id);

  redirect("/inicio");
}
