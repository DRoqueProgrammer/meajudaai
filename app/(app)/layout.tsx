import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { getAllowedModules } from "@/lib/auth/modules";
import { getMyWorkspaces, getActiveWorkspace } from "@/lib/auth/workspace";
import { isDemo } from "@/lib/auth/demo";
import { createServerClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { DemoBanner } from "@/components/demo-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Só o funcionário precisa da lista de módulos (admin/sysadmin têm todos).
  const modules =
    user.role === "funcionario" ? [...(await getAllowedModules(user))] : undefined;

  // Seletor de empresa — o admin pode ser dono de várias.
  const wsList = user.role === "admin" ? await getMyWorkspaces() : [];
  const activeWs = user.role === "admin" ? (await getActiveWorkspace())?.workspace_id : undefined;

  // O nome alimenta a folha de conta do rodapé mobile, não só o banner de demo.
  const demo = isDemo(user);
  const sb = await createServerClient();
  const { data: perfil } = await sb
    .from("profiles")
    .select("nome")
    .eq("user_id", user.id)
    .maybeSingle();
  const nome = perfil?.nome ?? null;

  // Contador de alertas não vistos. O badge de mensagens não-lidas foi adiado na
  // migração para o modelo de conversa (ver BUILD_REPORT): o cursor
  // conversa_membros.lido_ate existe, mas a contagem por conversa fica para depois.
  const { count: alertasNaoVistos } = await sb
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("visualizada", false);

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand focus:px-4 focus:py-3 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Nav
        role={user.role}
        userId={user.id}
        nome={nome}
        modules={modules}
        naoLidas={{ "/notificacoes": alertasNaoVistos ?? 0 }}
      />
      {/* pb-20 reserva os ~69px da nav fixa: sem isso o fim de listas longas
          fica atrás dela. Antes a folga vinha de o conteúdo ser curto. */}
      <div className="flex-1 pb-20 md:pb-0">
        {demo ? <DemoBanner nome={nome} /> : null}
        <main id="conteudo" className="mx-auto max-w-3xl px-4 py-4">
          {user.role === "admin" ? (
            <WorkspaceSwitcher workspaces={wsList} active={activeWs} />
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
