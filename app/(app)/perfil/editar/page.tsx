import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader } from "@/components/ui";
import { PerfilForm } from "@/components/perfil-form";
import { CIDADES } from "@/lib/cidades";

/**
 * Fica em /perfil/editar, antes de /perfil/[id] no roteamento do App Router
 * (segmento estático ganha do dinâmico), então não colide com o perfil público.
 */
/** Rota `/perfil/editar`: edição do próprio perfil (nome, bio, disponibilidade, cidade e foto). */
export default async function EditarPerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sb = await createServerClient();
  const { data: p } = await sb
    .from("profiles")
    .select("nome, bio, disponibilidade, cidade, estado, foto_url, tipo_base")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!p) redirect("/inicio");

  // O <select> guarda "Cidade|UF" num único campo; se a cidade do perfil não
  // estiver na lista, cai na primeira em vez de renderizar valor órfão.
  const combinada = `${p.cidade ?? ""}|${p.estado ?? ""}`;
  const conhecida = CIDADES.some((c) => `${c.nome}|${c.uf}` === combinada);
  const cidadeUf = conhecida ? combinada : `${CIDADES[0]!.nome}|${CIDADES[0]!.uf}`;

  return (
    <TelaComHeader titulo="Editar perfil" voltar={`/perfil/${user.id}`}>
      <PerfilForm
        nome={p.nome}
        bio={p.bio}
        disponibilidade={p.disponibilidade}
        cidadeUf={cidadeUf}
        fotoUrl={p.foto_url}
        ehAjudante={p.tipo_base === "ajudante"}
      />
    </TelaComHeader>
  );
}
