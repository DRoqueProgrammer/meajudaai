import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader } from "@/components/ui";
import { ChatThread, type Msg } from "@/components/chat/chat-thread";
import { Denunciar } from "@/components/denunciar";

type SbClient = Awaited<ReturnType<typeof createServerClient>>;
interface Conv {
  id: string;
  tipo: string;
  ajudante_id: string | null;
  workspace_id: string;
}

async function tituloConversa(sb: SbClient, conv: Conv, meId: string): Promise<string> {
  if (conv.tipo === "canal_equipe") {
    const { data: ws } = await sb.from("workspaces").select("nome").eq("id", conv.workspace_id).maybeSingle();
    return `Equipe · ${ws?.nome ?? ""}`;
  }
  if (conv.tipo === "dm_externa") {
    if (conv.ajudante_id === meId) {
      const { data: ws } = await sb.from("workspaces").select("nome").eq("id", conv.workspace_id).maybeSingle();
      return `Chat · ${ws?.nome ?? "Equipe"}`;
    }
    const { data: p } = conv.ajudante_id
      ? await sb.from("profiles").select("nome").eq("user_id", conv.ajudante_id).maybeSingle()
      : { data: null };
    return `Chat · ${p?.nome ?? "Ajudante"}`;
  }
  const { data: membros } = await sb.from("conversa_membros").select("user_id").eq("conversa_id", conv.id);
  const outro = (membros ?? []).map((m) => m.user_id).find((id) => id !== meId);
  if (!outro) return "Conversa";
  const { data: p } = await sb.from("profiles").select("nome").eq("user_id", outro).maybeSingle();
  return `Chat · ${p?.nome ?? "Colega"}`;
}

/** Rota `/chat/[conversaId]`: thread de uma conversa (canal da equipe, DM interna ou DM externa). */
export default async function ChatPage({ params }: { params: Promise<{ conversaId: string }> }) {
  const { conversaId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const sb = await createServerClient();

  // RLS conversas_select: só retorna se sou membro (canal / DM interna / DM externa).
  const { data: conv } = await sb
    .from("conversas")
    .select("id, tipo, ajudante_id, workspace_id")
    .eq("id", conversaId)
    .maybeSingle();
  if (!conv) notFound();

  const titulo = await tituloConversa(sb, conv, user.id);

  const { data: msgs } = await sb
    .from("mensagens")
    .select("id, remetente_id, conteudo, created_at")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true });

  return (
    <TelaComHeader titulo={titulo} voltar="/mensagens">
      <ChatThread conversaId={conversaId} meId={user.id} initial={(msgs ?? []) as Msg[]} />
      <div className="pt-2">
        <Denunciar alvoTipo="mensagem" alvoId={conversaId} alvoNome="esta conversa" />
      </div>
    </TelaComHeader>
  );
}
