import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";

/** Rota `/clientes` (prestador): lista de clientes que já solicitaram algum serviço. Ver ROADMAP.md §2.3. */
export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const sb = await createServerClient();
  const { data: servicos } = await sb.from("servicos").select("cliente_id").eq("prestador_id", user.id);
  const clienteIds = [...new Set((servicos ?? []).map((s) => s.cliente_id))];

  const { data: perfis } = clienteIds.length
    ? await sb.from("profiles").select("user_id, nome, foto_url").in("user_id", clienteIds)
    : { data: [] };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <p className="text-sm text-muted">Pessoas que já solicitaram algum serviço com você.</p>
      {(perfis ?? []).length === 0 ? (
        <p className="card-vazio">Nenhum cliente ainda.</p>
      ) : (
        (perfis ?? []).map((p) => (
          <Link key={p.user_id} href={`/clientes/${p.user_id}`} className="card flex items-center gap-3">
            <Avatar nome={p.nome} fotoUrl={p.foto_url} />
            <p className="text-sm font-medium">{p.nome}</p>
            <span className="ml-auto text-muted">→</span>
          </Link>
        ))
      )}
    </div>
  );
}
