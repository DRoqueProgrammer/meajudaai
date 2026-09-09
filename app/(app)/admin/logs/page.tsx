import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { papelLabel } from "@/lib/papel-label";

/**
 * Rota `/admin/logs` (SysAdmin): auditoria de acesso — quem logou, quando, de
 * qual IP/dispositivo/cidade. Ver ROADMAP.md §5.1/§5.2. Duas abas, porque a
 * visibilidade é uma matriz, não uma lista única: "SysAdmin" traz o log geral
 * (Clientes, Prestadores, Funcionários) — o mesmo que um Administrador também
 * enxerga (ver /admin, futuro) — e "Administração" traz só os logs envolvendo
 * contas de Administrador, que a regra reserva exclusivamente ao SysAdmin.
 * Cross-workspace: RLS de login_logs também restringe a select-sysadmin-only,
 * então mesmo com o admin client isso é defesa em profundidade, não a única.
 */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");
  const { aba: abaParam } = await searchParams;
  const aba = abaParam === "administracao" ? "administracao" : "sysadmin";

  const admin = createAdminClient();
  const papeisDaAba: AppRole[] = aba === "administracao" ? ["admin"] : ["cliente", "prestador_servico", "funcionario"];

  const { data: perfisDaAba } = await admin.from("profiles").select("user_id, nome, tipo_base, genero").in("tipo_base", papeisDaAba);
  const idsDaAba = (perfisDaAba ?? []).map((p) => p.user_id);
  const perfilDe = new Map((perfisDaAba ?? []).map((p) => [p.user_id, p]));

  const { data: logs } = idsDaAba.length
    ? await admin
        .from("login_logs")
        .select("id, user_id, ip, user_agent, cidade, pais, created_at")
        .in("user_id", idsDaAba)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  function dispositivo(ua: string | null): string {
    if (!ua) return "—";
    if (/mobile/i.test(ua)) return "Celular";
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    return "Computador";
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Logs de acesso</h1>

      <div className="flex gap-1 self-start rounded-lg border border-line bg-card p-0.5 text-sm">
        <Link
          href="/admin/logs?aba=sysadmin"
          className={`rounded-md px-3 py-1.5 ${aba === "sysadmin" ? "bg-brand-fill text-white" : "text-muted"}`}
        >
          SysAdmin
        </Link>
        <Link
          href="/admin/logs?aba=administracao"
          className={`rounded-md px-3 py-1.5 ${aba === "administracao" ? "bg-brand-fill text-white" : "text-muted"}`}
        >
          Administração
        </Link>
      </div>
      <p className="text-sm text-muted">
        {aba === "sysadmin"
          ? "Últimos 200 logins de Clientes, Prestadores de Serviço e Funcionários, entre workspaces."
          : "Últimos 200 logins de contas de Administrador — visível só pra você, por regra (ROADMAP.md §5.2)."}
      </p>

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
                    {p ? papelLabel(p.tipo_base as AppRole, p.genero) : "—"}
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
                  Nenhum login registrado ainda nessa aba.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
