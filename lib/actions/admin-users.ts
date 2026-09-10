"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";
import { campo, valoresPreservados, type EstadoForm } from "./form";

const PAPEIS = ["sysadmin", "admin", "funcionario", "prestador_servico", "cliente"] as const;

/**
 * Sysadmin altera o papel de um usuário. Promover a admin SÓ troca o papel
 * (ADR 0013, D-016) — não fabrica praça nenhuma; o vínculo a uma ou mais
 * praças, com a padrão, vem depois, pelo SysAdmin em /admin/pracas
 * (vincularAdministradorAction, lib/actions/pracas.ts).
 */
export async function definirPapelAction(userId: string, papel: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") return { ok: false, erro: "Apenas o sysadmin altera papéis." };
  if (!(PAPEIS as readonly string[]).includes(papel)) return { ok: false, erro: "Papel inválido." };

  const db = createAdminClient();

  // R-42/R-43 (ADR 0012, D-015): a regra única de quem age sobre quem — uma
  // conta de exemplo não altera quem não é de exemplo — é consultada aqui,
  // antes de qualquer escrita.
  const { data: alvo, error: alvoErr } = await db.from("profiles").select("exemplo").eq("user_id", userId).maybeSingle();
  if (alvoErr || !alvo) return { ok: false, erro: "Usuário não encontrado." };
  if (!podeAgirSobre({ exemplo: Boolean(user.exemplo) }, alvo)) {
    return { ok: false, erro: "Conta de exemplo não pode alterar o papel de quem não é de exemplo." };
  }

  const { error } = await db.from("profiles").update({ tipo_base: papel }).eq("user_id", userId);
  if (error) return { ok: false, erro: "Não foi possível atualizar o papel." };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Sysadmin cria um admin do zero (conta + perfil) e já o vincula, como
 * padrão, a uma praça ENTRE AS EXISTENTES (ADR 0013, D-016) — não fabrica
 * mais uma empresa automática de nome derivado; a praça em si só nasce por
 * criarPracaAction (lib/actions/pracas.ts), na área do próprio SysAdmin.
 */
export async function criarAdminAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd, ["senha"]);
  const nome = campo(fd, "nome");
  const email = campo(fd, "email");
  const senha = String(fd.get("senha") ?? "");
  const cidade = campo(fd, "cidade");
  const estado = campo(fd, "estado");
  const pracaId = campo(fd, "praca-id");

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.role !== "sysadmin") return { erro: "Apenas o sysadmin cria admins.", valores: preserva };
  // R-42 (ADR 0012, D-015): criar um admin cria uma conta REAL — uma conta de
  // exemplo nunca pode, mesmo sendo sysadmin de exemplo.
  if (user.exemplo) return { erro: "Conta de exemplo não pode criar administradores.", valores: preserva };
  if (!nome || !email || senha.length < 6) {
    return { erro: "Preencha nome, e-mail e senha (mín. 6 caracteres).", valores: preserva };
  }
  if (!pracaId) return { erro: "Escolha a praça padrão do administrador.", valores: preserva };

  const db = createAdminClient();
  // R-46/R-47: a praça padrão precisa existir de verdade — criarPracaAction
  // é o único jeito de criar uma.
  const { data: praca } = await db.from("workspaces").select("id").eq("id", pracaId).maybeSingle();
  if (!praca) return { erro: "Praça não encontrada — crie uma em /admin/pracas.", valores: preserva };

  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (cErr || !created.user) {
    return { erro: "Não foi possível criar (e-mail já em uso?).", valores: preserva };
  }

  const uid = created.user.id;
  await db.from("profiles").insert({ user_id: uid, nome, cidade, estado, tipo_base: "admin" });
  const { error: piiErr } = await db.from("profiles_pii").insert({ user_id: uid, email });
  if (piiErr) {
    await db.auth.admin.deleteUser(uid);
    return { erro: "E-mail já cadastrado.", valores: preserva };
  }

  const { error: vinculoErr } = await db
    .from("workspace_members")
    .insert({ workspace_id: pracaId, user_id: uid, role: "owner", padrao: true });
  if (vinculoErr) {
    await db.auth.admin.deleteUser(uid);
    return { erro: "Não foi possível vincular a praça.", valores: preserva };
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
