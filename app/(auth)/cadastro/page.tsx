import { CadastroForm, type Papel } from "./form";
import { createAdminClient } from "@/lib/supabase/admin";
import { podeAceitar } from "@/lib/convite-status";

/**
 * Server Component: lê `?papel` (dos CTAs da landing) e `?convite` (do link de
 * convite). Ler no servidor evita `useSearchParams()` sem Suspense, que passa em
 * dev e derruba o `next build`. O convite é carregado via admin (service-role only).
 */
/** Rota `/cadastro`: criação de conta; com `?convite=<token>` entra na equipe de quem convidou. */
export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string; convite?: string }>;
}) {
  const { papel, convite } = await searchParams;
  const inicial: Papel | null = papel === "admin" || papel === "ajudante" ? papel : null;

  let conviteInfo: { token: string; equipeNome: string; papelLabel: string } | null = null;
  if (convite) {
    const admin = createAdminClient();
    const { data: inv } = await admin
      .from("invite")
      .select("role, status, expires_at, workspace_id")
      .eq("token", convite)
      .maybeSingle();
    if (inv && podeAceitar(inv, new Date())) {
      const { data: ws } = await admin.from("workspaces").select("nome").eq("id", inv.workspace_id).maybeSingle();
      conviteInfo = {
        token: convite,
        equipeNome: ws?.nome ?? "uma equipe",
        papelLabel: inv.role === "owner" ? "sócio" : "funcionário",
      };
    }
  }

  return <CadastroForm papelInicial={inicial} convite={conviteInfo} />;
}
