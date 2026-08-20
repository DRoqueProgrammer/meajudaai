import { getActiveWorkspace } from "@/lib/auth/workspace";
import { guardModule } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/ui";
import { ConvidarForm } from "@/components/convidar-form";
import { ConvitesPendentes, type ConvitePendente } from "@/components/convites-pendentes";
import { ModulosFuncionario } from "@/components/modulos-funcionario";
import { GRANTABLE_MODULES, FUNCIONARIO_DEFAULT, CAPABILITIES } from "@/lib/modules";

/** Rota `/equipe` (admin): membros da empresa, convites pendentes e permissões de módulos por funcionário. */
export default async function EquipePage() {
  const user = await guardModule("equipe");
  const podeGerir = user.role === "admin" || user.role === "sysadmin";
  const ws = await getActiveWorkspace();
  const sb = await createServerClient();

  let membros: {
    user_id: string;
    role: string;
    nome: string;
    foto_url: string | null;
    tipo_base: string;
  }[] = [];
  let modByUser = new Map<string, Map<string, boolean>>();
  if (ws) {
    const { data: rows } = await sb
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", ws.workspace_id);
    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: perfis } = ids.length
      ? await sb.from("profiles").select("user_id, nome, foto_url, tipo_base").in("user_id", ids)
      : { data: [] };
    const perfilDe = new Map((perfis ?? []).map((p) => [p.user_id, p]));
    membros = (rows ?? []).map((r) => {
      const p = perfilDe.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role,
        nome: p?.nome ?? "",
        foto_url: p?.foto_url ?? null,
        tipo_base: p?.tipo_base ?? "",
      };
    });

    const { data: mods } = await sb
      .from("user_modules")
      .select("user_id, module, allowed")
      .eq("workspace_id", ws.workspace_id);
    for (const m of mods ?? []) {
      if (!modByUser.has(m.user_id)) modByUser.set(m.user_id, new Map());
      modByUser.get(m.user_id)!.set(m.module, m.allowed);
    }
  }

  // Convites aceitos aguardando aprovação (o `invite` é service-role only).
  let pendentes: ConvitePendente[] = [];
  if (ws && podeGerir) {
    const adminC = createAdminClient();
    const { data: invs } = await adminC
      .from("invite")
      .select("id, role, accepted_by")
      .eq("workspace_id", ws.workspace_id)
      .eq("status", "aceito");
    const accIds = (invs ?? []).map((i) => i.accepted_by).filter((x): x is string => !!x);
    const { data: perfisInv } = accIds.length
      ? await adminC.from("profiles").select("user_id, nome").in("user_id", accIds)
      : { data: [] };
    const nomeInv = new Map((perfisInv ?? []).map((p) => [p.user_id, p.nome]));
    pendentes = (invs ?? [])
      .filter((i) => i.accepted_by)
      .map((i) => ({
        id: i.id,
        nome: nomeInv.get(i.accepted_by!) ?? "Novo usuário",
        papel: i.role === "owner" ? "sócio" : "funcionário",
      }));
  }

  const efetivos = (userId: string): Record<string, boolean> => {
    const rows = modByUser.get(userId);
    const out: Record<string, boolean> = {};
    for (const m of GRANTABLE_MODULES) {
      const explicit = rows?.get(m);
      out[m] = explicit !== undefined ? explicit : FUNCIONARIO_DEFAULT.includes(m);
    }
    for (const c of CAPABILITIES) {
      const explicit = rows?.get(c);
      out[c] = explicit !== undefined ? explicit : false;
    }
    return out;
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Equipe</h1>
      {!ws ? (
        <p className="text-sm text-muted">Você ainda não montou sua equipe.</p>
      ) : (
        <>
          <p className="text-sm text-muted">{ws.nome}</p>
          <div className="flex flex-col gap-2">
            {membros.map((m) => {
              const ehFuncionario = m.tipo_base === "funcionario";
              return (
                <div key={m.user_id} className="card">
                  <div className="flex items-center gap-3">
                    <Avatar nome={m.nome} fotoUrl={m.foto_url} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.nome}</p>
                      <p className="text-xs capitalize text-muted">
                        {m.tipo_base === "admin" ? "Admin da equipe" : m.tipo_base || m.role}
                      </p>
                    </div>
                  </div>
                  {podeGerir && ehFuncionario ? (
                    <ModulosFuncionario
                      funcionarioId={m.user_id}
                      workspaceId={ws.workspace_id}
                      allowed={efetivos(m.user_id)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          {podeGerir ? <ConvitesPendentes convites={pendentes} /> : null}
          {podeGerir ? <ConvidarForm /> : null}
        </>
      )}
    </div>
  );
}
