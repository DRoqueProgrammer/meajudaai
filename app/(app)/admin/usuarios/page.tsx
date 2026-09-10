import { redirect } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarUsuarios } from "@/lib/admin/consultas";
import { UsuarioPapel } from "@/components/usuario-papel";
import { CriarAdminForm } from "@/components/criar-admin-form";
import { papelLabel } from "@/lib/papel-label";

const ORDEM: Record<string, number> = {
  sysadmin: 0,
  admin: 1,
  funcionario: 2,
  prestador_servico: 3,
  cliente: 4,
};

/**
 * Rota `/admin/usuarios` (sysadmin): lista de usuários e troca de papel global.
 * R-42 (ADR 0012, D-015): `listarUsuarios` (`lib/admin/consultas.ts`) impõe o
 * recorte de exemplo — um sysadmin de exemplo só vê o mundo de exemplo; o
 * sysadmin real vê todo mundo, como sempre viu.
 */
export default async function AdminUsuariosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const admin = createAdminClient();
  const perfis = await listarUsuarios(admin, { exemplo: user.exemplo });
  const lista = (perfis ?? []).sort(
    (a, b) => (ORDEM[a.tipo_base] ?? 9) - (ORDEM[b.tipo_base] ?? 9) || a.nome.localeCompare(b.nome),
  );

  // ADR 0013, D-016: criar um admin já escolhe a praça padrão entre as
  // existentes — a praça em si só nasce em /admin/pracas.
  const { data: pracas } = await admin.from("workspaces").select("id, nome").order("nome");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted">
          Defina o papel de cada usuário. Criar um Administrador exige escolher a praça padrão dele
          entre as já existentes (veja <strong>Praças</strong> no menu).
        </p>
      </div>

      <CriarAdminForm pracas={pracas ?? []} />

      <div className="flex flex-col gap-2">
        {lista.map((p) => (
          <div key={p.user_id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{p.nome || "—"}</p>
              <p className="text-xs text-muted">{papelLabel(p.tipo_base as AppRole, p.genero)}</p>
            </div>
            <UsuarioPapel userId={p.user_id} papel={p.tipo_base} genero={p.genero} isSelf={p.user_id === user.id} />
          </div>
        ))}
        {lista.length === 0 && <p className="card-vazio">Nenhum usuário.</p>}
      </div>
    </div>
  );
}
