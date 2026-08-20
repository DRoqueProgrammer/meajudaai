import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { NotificacoesList, type Notif } from "@/components/notificacoes-list";

/** Rota `/notificacoes`: histórico de notificações do usuário (com atualização em tempo real). */
export default async function NotificacoesPage() {
  const user = await getCurrentUser();
  const sb = await createServerClient();
  const { data } = await sb
    .from("notificacoes")
    .select("id, tipo, titulo, mensagem, visualizada, created_at, link")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Notificações</h1>
      <NotificacoesList meId={user!.id} initial={(data ?? []) as Notif[]} />
    </div>
  );
}
