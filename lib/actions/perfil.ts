"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { tryWriter } from "@/lib/auth/guard";
import { createServerClient } from "@/lib/supabase/server";
import { fotoAleatoria } from "@/lib/foto-aleatoria";
import { campo, valoresPreservados, type EstadoForm } from "./form";

const PerfilSchema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  bio: z.string().max(600, "Máximo de 600 caracteres").optional(),
  disponibilidade: z.string().max(120, "Máximo de 120 caracteres").optional(),
  cidadeUf: z.string().min(3, "Escolha a cidade"),
  // Só o prestador de serviço preenche estes quatro — o form só os manda quando aplicável.
  categoria: z.string().optional(),
  precoTipo: z.enum(["hora", "servico"]).optional(),
  precoValor: z.string().optional(),
  chavePix: z.string().optional(),
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
    categoria: campo(fd, "categoria") || undefined,
    precoTipo: (campo(fd, "precoTipo") || undefined) as "hora" | "servico" | undefined,
    precoValor: campo(fd, "precoValor") || undefined,
    chavePix: campo(fd, "chavePix") || undefined,
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
      ...(d.categoria ? { categoria: d.categoria } : {}),
      ...(d.precoTipo ? { preco_tipo: d.precoTipo } : {}),
      ...(d.precoValor ? { preco_valor: Number(d.precoValor.replace(",", ".")) } : {}),
    })
    .eq("user_id", user.id);
  if (error) return { erro: "Não foi possível salvar o perfil.", valores: preserva };

  // A chave Pix não se edita mais aqui: fica em chaves_pix (migration 0056), e
  // profiles_pii.chave_pix só espelha a padrão (gatilho do banco).

  revalidatePath("/", "layout");
  redirect(`/perfil/${user.id}`);
}

/**
 * Salva o endereço + pino exato do próprio usuário em `profile_local`
 * (upsert — a linha nasce no cadastro para cliente/prestador_servico, mas uma
 * conta mais antiga pode não ter uma ainda). Ação separada de
 * `salvarPerfilAction`: mistura mapa (client) com o resto do formulário de
 * perfil ganharia complexidade sem necessidade — `LocalizacaoForm`
 * (components/localizacao-form.tsx) é quem chama esta.
 *
 * `createServerClient` (cliente da SESSÃO), nunca a chave de serviço: o
 * `user_id` sai de `tryWriter()` (a sessão), nunca de um campo do formulário —
 * a RLS de `profile_local` (migration 0023/0036) já barraria escrever em nome
 * de outra pessoa, mas nem chega a tentar. `tryWriter` também barra a conta
 * demo read-only antiga (lib/auth/demo.ts) — as contas de exemplo reais
 * (lib/auth/contas-exemplo.ts, `profiles.exemplo`) escrevem normalmente, como
 * em `salvarPerfilAction`.
 */
export async function salvarLocalizacaoAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const endereco = campo(fd, "endereco");
  const latStr = campo(fd, "lat");
  const lngStr = campo(fd, "lng");
  const preserva = valoresPreservados(fd);

  if (!endereco) return { erro: "Informe o endereço.", valores: preserva };
  if (!latStr || !lngStr) {
    return { erro: "Marque sua localização no mapa antes de salvar.", valores: preserva };
  }
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { erro: "Coordenada inválida — marque o ponto no mapa de novo.", valores: preserva };
  }

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  const sb = await createServerClient();

  const { error } = await sb.from("profile_local").upsert({ user_id: user.id, endereco, lat, lng });
  if (error) return { erro: "Não foi possível salvar a localização.", valores: preserva };

  revalidatePath("/perfil/editar");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, mensagem: "Localização salva." };
}

/** Remove a foto enviada e volta para a foto pública do cadastro (lib/foto-aleatoria.ts) — nenhuma conta fica sem foto. */
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
  const { data: perfil } = await sb.from("profiles").select("genero").eq("user_id", user.id).maybeSingle();
  const { error } = await sb
    .from("profiles")
    .update({ foto_url: fotoAleatoria(user.id, perfil?.genero) })
    .eq("user_id", user.id);
  if (error) return;

  await sb.storage
    .from("avatares")
    .remove([`${user.id}/perfil.jpg`, `${user.id}/perfil.png`, `${user.id}/perfil.webp`]);
  revalidatePath("/", "layout");
}
