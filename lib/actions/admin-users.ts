"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";
import { campo, valoresPreservados, type EstadoForm } from "./form";

const PAPEIS = ["sysadmin", "admin", "funcionario", "ajudante"] as const;

/** Sysadmin altera o papel de um usuário. Promover a admin cria empresa se faltar. */
export async function definirPapelAction(userId: string, papel: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") return { ok: false, erro: "Apenas o sysadmin altera papéis." };
  if (!(PAPEIS as readonly string[]).includes(papel)) return { ok: false, erro: "Papel inválido." };

  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ tipo_base: papel }).eq("user_id", userId);
  if (error) return { ok: false, erro: "Não foi possível atualizar o papel." };

  if (papel === "admin") {
    const { data: existing } = await db
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { data: prof } = await db
        .from("profiles")
        .select("nome, cidade, estado")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: ws } = await db
        .from("workspaces")
        .insert({
          owner_id: userId,
          nome: `Empresa de ${prof?.nome ?? "novo admin"}`,
          cidade: prof?.cidade ?? null,
          estado: prof?.estado ?? null,
        })
        .select("id")
        .single();
      if (ws) {
        await db.from("workspace_members").insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
      }
    }
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/** Sysadmin cria um admin do zero (conta + perfil + empresa). */
export async function criarAdminAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd, ["senha"]);
  const nome = campo(fd, "nome");
  const email = campo(fd, "email");
  const senha = String(fd.get("senha") ?? "");
  const cidade = campo(fd, "cidade");
  const estado = campo(fd, "estado");

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.role !== "sysadmin") return { erro: "Apenas o sysadmin cria admins.", valores: preserva };
  if (!nome || !email || senha.length < 6) {
    return { erro: "Preencha nome, e-mail e senha (mín. 6 caracteres).", valores: preserva };
  }

  const db = createAdminClient();
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
  const { data: ws } = await db
    .from("workspaces")
    .insert({ owner_id: uid, nome: `Empresa de ${nome}`, cidade, estado })
    .select("id")
    .single();
  if (ws) await db.from("workspace_members").insert({ workspace_id: ws.id, user_id: uid, role: "owner" });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
