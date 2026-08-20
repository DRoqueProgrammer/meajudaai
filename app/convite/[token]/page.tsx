import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { podeAceitar } from "@/lib/convite-status";
import { AceitarConvite } from "@/components/aceitar-convite";
import { Logo } from "@/components/logo";

/**
 * Rota pública (liberada no middleware). Lê o convite pelo token via admin
 * (o `invite` é service-role only) e mostra o preview. Quem tem conta aceita;
 * quem não tem cai no cadastro com o convite.
 */
/** Rota `/convite/[token]`: valida o convite por link e oferece aceitar (logado) ou cadastrar-se. */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invite")
    .select("role, status, expires_at, workspace_id")
    .eq("token", token)
    .maybeSingle();
  const valido = !!inv && podeAceitar(inv, new Date());

  let equipeNome = "uma equipe";
  if (inv) {
    const { data: ws } = await admin.from("workspaces").select("nome").eq("id", inv.workspace_id).maybeSingle();
    equipeNome = ws?.nome ?? "uma equipe";
  }
  const papelLabel = inv?.role === "owner" ? "sócio" : "funcionário";
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-10">
      <Logo />
      {!valido ? (
        <div className="card">
          <h1 className="text-lg font-semibold">Convite indisponível</h1>
          <p className="mt-1 text-sm text-muted">
            Este convite não existe, já foi usado ou expirou. Peça um novo link ao responsável pela
            equipe.
          </p>
          <Link href="/login" className="btn-ghost mt-4">
            Ir para o login
          </Link>
        </div>
      ) : (
        <div className="card flex flex-col gap-3">
          <h1 className="text-lg font-semibold">Você foi convidado</h1>
          <p className="text-sm text-muted">
            Para entrar em <strong className="text-ink">{equipeNome}</strong> como{" "}
            <strong className="text-ink">{papelLabel}</strong>. Depois de aceitar, o responsável pela
            equipe aprova o seu acesso.
          </p>
          {user ? (
            <AceitarConvite token={token} />
          ) : (
            <>
              <Link href={`/cadastro?convite=${token}`} className="btn-brand text-center">
                Criar conta e entrar
              </Link>
              <Link href="/login" className="link-touch text-center">
                Já tenho conta (entre e reabra este link)
              </Link>
            </>
          )}
        </div>
      )}
    </main>
  );
}
