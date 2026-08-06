"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { campo, valoresPreservados, type EstadoForm } from "./form";

const PerfilSchema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  bio: z.string().max(600, "Máximo de 600 caracteres").optional(),
  disponibilidade: z.string().max(120, "Máximo de 120 caracteres").optional(),
  cidadeUf: z.string().min(3, "Escolha a cidade"),
});

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO = 2 * 1024 * 1024;

/**
 * O usuário edita o próprio perfil.
 *
 * Antes disto só o sysadmin conseguia alterar `profiles` — quem errasse o nome
 * no cadastro ficava com ele para sempre, e a spec lista "editar perfil" como
 * permissão dos dois papéis.
 *
 * A foto vai para o bucket `avatares` com caminho `<user_id>/perfil.<ext>`, que
 * é o que a policy de Storage (migration 0012) exige: escrita só na própria
 * pasta. `upsert` porque trocar a foto substitui a anterior em vez de acumular.
 */
export async function salvarPerfilAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd, ["foto"]);
  const parsed = PerfilSchema.safeParse({
    nome: campo(fd, "nome"),
    bio: campo(fd, "bio"),
    disponibilidade: campo(fd, "disponibilidade"),
    cidadeUf: campo(fd, "cidadeUf"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos", valores: preserva };
  }

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  const d = parsed.data;
  const [cidade, estado] = d.cidadeUf.split("|");
  const sb = await createServerClient();

  // Foto é opcional: sem arquivo escolhido, o campo vem com tamanho 0.
  let fotoUrl: string | undefined;
  // `getAll` + find, não `get`: `get` devolve a primeira entrada com esse nome,
  // e um campo de arquivo pode vir acompanhado de uma entrada vazia de texto —
  // aí o upload era silenciosamente ignorado.
  const foto = fd.getAll("foto").find((v): v is File => v instanceof File && v.size > 0);
  if (foto) {
    if (!TIPOS_FOTO.includes(foto.type)) {
      return { erro: "A foto precisa ser JPG, PNG ou WEBP.", valores: preserva };
    }
    if (foto.size > MAX_FOTO) {
      return { erro: "A foto precisa ter menos de 2 MB.", valores: preserva };
    }
    const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${user.id}/perfil.${ext}`;
    const { error: upErr } = await sb.storage
      .from("avatares")
      .upload(caminho, foto, { upsert: true, contentType: foto.type });
    if (upErr) {
      return { erro: "Não foi possível enviar a foto. Tente de novo.", valores: preserva };
    }
    const { data: pub } = sb.storage.from("avatares").getPublicUrl(caminho);
    // `?v=` força o navegador a buscar a nova: o caminho é sempre o mesmo.
    fotoUrl = `${pub.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await sb
    .from("profiles")
    .update({
      nome: d.nome,
      bio: d.bio || null,
      disponibilidade: d.disponibilidade || null,
      cidade,
      estado,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    })
    .eq("user_id", user.id);
  if (error) return { erro: "Não foi possível salvar o perfil.", valores: preserva };

  revalidatePath("/", "layout");
  redirect(`/perfil/${user.id}`);
}

/** Remove a foto e volta para as iniciais. */
export async function removerFotoAction(): Promise<void> {
  const w = await tryWriter();
  if ("erro" in w) return;
  const user = w.user;
  const sb = await createServerClient();

  // Limpa o ponteiro ANTES de apagar o arquivo. Na ordem inversa, uma falha
  // entre os dois passos deixa `foto_url` apontando para um objeto que não
  // existe mais — e aí todo mundo que abre aquele perfil vê caixa de imagem
  // quebrada. Nesta ordem, a falha deixa um arquivo órfão no bucket: invisível
  // e sem custo para quem usa.
  const { error } = await sb.from("profiles").update({ foto_url: null }).eq("user_id", user.id);
  if (error) return;

  await sb.storage
    .from("avatares")
    .remove([`${user.id}/perfil.jpg`, `${user.id}/perfil.png`, `${user.id}/perfil.webp`]);
  revalidatePath("/", "layout");
}
