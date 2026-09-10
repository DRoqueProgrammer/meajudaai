import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { getAllowedModules } from "@/lib/auth/modules";
import { getMyWorkspaces, getActiveWorkspace } from "@/lib/auth/workspace";
import { mostrarSeletorDePraca } from "@/lib/auth/praca-ativa";
import { isDemo } from "@/lib/auth/demo";
import { createServerClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { DemoBanner } from "@/components/demo-banner";
import { Footer } from "@/components/footer";

/** Layout das rotas autenticadas `(app)`: exige sessão, resolve papel/módulos e monta a navegação e os banners. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Só o funcionário precisa da lista de módulos (admin/sysadmin têm todos).
  const modules =
    user.role === "funcionario" ? [...(await getAllowedModules(user))] : undefined;

  // Seletor de praça — só o Administrador tem praças, e só aparece com duas ou
  // mais vinculadas pelo SysAdmin (R-48, R-49, D-016): com 0 ou 1, mostrarSeletorDePraca
  // já devolve falso, então não precisa checar o papel de novo na hora de renderizar.
  const wsList = user.role === "admin" ? await getMyWorkspaces() : [];
  const activeWs = user.role === "admin" ? (await getActiveWorkspace())?.workspace_id : undefined;
  const temSeletor = mostrarSeletorDePraca(wsList.length);

  // O nome alimenta a folha de conta do rodapé mobile, não só o banner de demo.
  const demo = isDemo(user);
  const sb = await createServerClient();
  const { data: perfil } = await sb
    .from("profiles")
    .select("nome, genero")
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-fill focus:px-4 focus:py-3 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Nav
        role={user.role}
        userId={user.id}
        nome={nome}
        genero={perfil?.genero}
        modules={modules}
        naoLidas={{ "/notificacoes": alertasNaoVistos ?? 0 }}
      />
      {/* A coluna ocupa ao menos a altura da tela (dvh acompanha a barra de
          endereço do celular) e o <main> cresce: em página curta o rodapé desce
          até o fim da tela em vez de ficar no meio (pedido do Leonardo). */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {demo ? <DemoBanner nome={nome} /> : null}
        {/* A casca só dá o TETO de largura (direção e do parecer de design) —
            1100px é o topo da faixa pedida pra listas/painéis, e sobra pro
            formulário mais estreito (~720px) que cada página aplica no próprio
            wrapper. Antes era `max-w-3xl` (768px) fixo aqui: em 1440px isso
            sobrava 230–430px de vazio, porque nenhuma página tinha voz sobre
            a própria largura. */}
        <main id="conteudo" className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-4 md:px-6">
          {temSeletor ? <WorkspaceSwitcher workspaces={wsList} active={activeWs} /> : null}
          {children}
        </main>
        <Footer />
        {/* Reserva os ~69px da nav fixa do celular com a cor do rodapé: o rodapé
            encosta na nav, sem faixa do fundo da página entre os dois, e nada
            fica escondido atrás dela. */}
        <div aria-hidden="true" className="h-20 shrink-0 bg-card md:hidden" />
      </div>
    </div>
  );
}
