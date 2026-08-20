import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { UsuarioPapel } from "@/components/usuario-papel";
import { CriarAdminForm } from "@/components/criar-admin-form";

const ORDEM: Record<string, number> = { sysadmin: 0, admin: 1, funcionario: 2, ajudante: 3 };

/** Rota `/admin/usuarios` (sysadmin): lista de usuários e troca de papel global. */
export default async function AdminUsuariosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const sb = await createServerClient();
  const { data: perfis } = await sb.from("profiles").select("user_id, nome, tipo_base");
  const lista = (perfis ?? []).sort(
    (a, b) => (ORDEM[a.tipo_base] ?? 9) - (ORDEM[b.tipo_base] ?? 9) || a.nome.localeCompare(b.nome),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted">
          Defina o papel de cada usuário. Promover a <strong>admin</strong> cria uma equipe se ele
          ainda não tiver.
        </p>
      </div>

      <CriarAdminForm />

      <div className="flex flex-col gap-2">
        {lista.map((p) => (
          <div key={p.user_id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{p.nome || "—"}</p>
              <p className="text-xs capitalize text-muted">{p.tipo_base}</p>
            </div>
            <UsuarioPapel userId={p.user_id} papel={p.tipo_base} isSelf={p.user_id === user.id} />
          </div>
        ))}
        {lista.length === 0 && <p className="card-vazio">Nenhum usuário.</p>}
      </div>
    </div>
  );
}
