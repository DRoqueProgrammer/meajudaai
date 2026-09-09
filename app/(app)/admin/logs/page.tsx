import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAPEL_LABEL } from "@/lib/papel-label";

/**
 * Rota `/admin/logs` (SysAdmin): auditoria de acesso — quem logou, quando, de
 * qual IP/dispositivo/cidade. Ver ROADMAP.md §5.1. Cross-workspace: só o
 * SysAdmin enxerga (RLS de login_logs também restringe a select-sysadmin-only,
 * então mesmo com o admin client isso é defesa em profundidade, não a única).
 */
export default async function AdminLogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("login_logs")
    .select("id, user_id, ip, user_agent, cidade, pais, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const userIds = [...new Set((logs ?? []).map((l) => l.user_id))];
  const { data: perfis } = userIds.length
    ? await admin.from("profiles").select("user_id, nome, tipo_base").in("user_id", userIds)
    : { data: [] };
  const perfilDe = new Map((perfis ?? []).map((p) => [p.user_id, p]));

  function dispositivo(ua: string | null): string {
    if (!ua) return "—";
    if (/mobile/i.test(ua)) return "Celular";
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    return "Computador";
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Logs de acesso</h1>
      <p className="text-sm text-muted">Últimos 200 logins na plataforma inteira, entre workspaces.</p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Pessoa</th>
              <th className="px-3 py-2">Papel</th>
              <th className="px-3 py-2">Quando</th>
              <th className="px-3 py-2">Dispositivo</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Local</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => {
              const p = perfilDe.get(l.user_id);
              return (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium">{p?.nome ?? l.user_id}</td>
                  <td className="px-3 py-2 text-muted">
                    {p ? (PAPEL_LABEL[p.tipo_base as keyof typeof PAPEL_LABEL] ?? p.tipo_base) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-muted">{dispositivo(l.user_agent)}</td>
                  <td className="px-3 py-2 text-muted">{l.ip ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {l.cidade ? `${l.cidade}${l.pais ? `, ${l.pais}` : ""}` : "—"}
                  </td>
                </tr>
              );
            })}
            {(logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Nenhum login registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
