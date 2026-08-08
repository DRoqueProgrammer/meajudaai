"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CadastroSchema } from "@/lib/validation";
import { podeAceitar } from "@/lib/convite-status";
import { soDigitos } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";
import { redirect } from "next/navigation";
import { campo, valoresPreservados, type EstadoForm } from "./form";

export interface ActionResult {
  ok: boolean;
  erro?: string;
}

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
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // O papel é a primeira pergunta da tela; sem ele a mensagem do zod
    // ("Invalid enum value") não diria nada a quem está cadastrando.
    const erro =
      issue?.path[0] === "tipo_base"
        ? "Escolha se você precisa de ajudante ou quer trabalhar."
        : (issue?.message ?? "Dados inválidos");
    return { erro, valores: preserva };
  }
  // "funcionario" só nasce via convite; fora dele, recusa.
  if (!invite && parsed.data.tipo_base === "funcionario") {
    return { erro: "Dados inválidos", valores: preserva };
  }
  const d = parsed.data;
  const telefone = soDigitos(d.telefone);

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
  });
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
  } else if (d.tipo_base === "admin") {
    const { data: ws } = await admin
      .from("workspaces")
      .insert({ owner_id: userId, nome: `Equipe de ${d.nome}`, cidade: d.cidade, estado: d.estado })
      .select("id")
      .single();
    if (ws) {
      await admin
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
    }
  }

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
export async function entrarAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = campo(fd, "email");
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha.", valores: { email } };
  }

  const sb = await createServerClient();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  // A senha nunca volta em `valores`.
  if (error) return { erro: "E-mail ou senha inválidos.", valores: { email } };

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
 * Só vale enquanto a conta está limpa: com vaga publicada ou candidatura
 * enviada, trocar o papel deixaria registros órfãos do outro lado do marketplace.
 */
export async function trocarMeuPapelAction(novo: "admin" | "ajudante"): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "admin" && user.role !== "ajudante") {
    return { ok: false, erro: "Só profissional e ajudante podem trocar de papel por aqui." };
  }
  if (user.role === novo) return { ok: true };

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

  // Virar profissional exige empresa: sem ela, /minhas-vagas e /publicar ficam
  // inacessíveis e o usuário cai no mesmo beco de antes.
  if (novo === "admin") {
    const { data: ja } = await db
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);
    if (!ja?.length) {
      const { data: prof } = await db
        .from("profiles")
        .select("nome, cidade, estado")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: ws } = await db
        .from("workspaces")
        .insert({
          owner_id: user.id,
          nome: `Equipe de ${prof?.nome ?? "novo profissional"}`,
          cidade: prof?.cidade ?? null,
          estado: prof?.estado ?? null,
        })
        .select("id")
        .single();
      if (ws) {
        await db.from("workspace_members").insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: "owner",
        });
      }
    }
  }

  // O JWT carrega app_role (hook da migration 0001) e as policies leem dele via
  // current_app_role(). Sem refresh, o token fica com o papel antigo e o banco
  // discorda da interface até o próximo login.
  const sb = await createServerClient();
  await sb.auth.refreshSession();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const sb = await createServerClient();
  await sb.auth.signOut();
}
