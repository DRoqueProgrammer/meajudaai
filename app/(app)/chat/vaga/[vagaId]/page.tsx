import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { ensureDmExterna } from "@/lib/actions/conversas";

/**
 * Resolver: os links de chat que vêm de uma diária (avaliar, candidatos,
 * minhas-diárias) só têm o `vagaId`. Aqui a DM externa da equipe com o ajudante
 * aceito é achada/criada e o usuário é redirecionado para a conversa canônica.
 * Centraliza a tradução vaga → conversa num lugar só.
 */
export default async function ChatVagaResolver({ params }: { params: Promise<{ vagaId: string }> }) {
  const { vagaId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const sb = await createServerClient();

  const { data: vaga } = await sb
    .from("vagas")
    .select("id, workspace_id")
    .eq("id", vagaId)
    .maybeSingle();
  if (!vaga) notFound();

  const { data: aceita } = await sb
    .from("candidaturas")
    .select("ajudante_id")
    .eq("vaga_id", vagaId)
    .eq("status", "aceito")
    .maybeSingle();
  if (!aceita) redirect("/mensagens");

  const conversaId = await ensureDmExterna(vaga.workspace_id, aceita.ajudante_id);
  redirect(`/chat/${conversaId}`);
}
