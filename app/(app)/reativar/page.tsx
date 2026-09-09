import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { ReativarForm } from "@/components/reativar-form";

/** Rota `/reativar`: confirma os dados antes de voltar a usar uma conta desativada (ROADMAP.md §3). */
export default async function ReativarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sb = await createServerClient();
  const { data: p } = await sb.from("profiles").select("status, nome, cidade, estado").eq("user_id", user.id).maybeSingle();
  if (p?.status !== "inativo") redirect("/inicio");
  const { data: pii } = await sb.from("profiles_pii").select("telefone").eq("user_id", user.id).maybeSingle();

  const cidadeUf = `${p.cidade ?? ""}|${p.estado ?? ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-xl font-bold text-brand">Bem-vindo(a) de volta!</h1>
      <p className="text-sm text-muted">
        Sua conta estava desativada. Confirme seus dados pra continuar de onde parou.
      </p>
      <ReativarForm nome={p.nome} telefone={pii?.telefone ?? ""} cidadeUf={cidadeUf} />
    </main>
  );
}
