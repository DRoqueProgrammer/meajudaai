import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarPedidosDeExclusao } from "@/lib/admin/consultas";

/**
 * Rota `/admin/pedidos-de-exclusao` (SysAdmin): fila do direito de exclusão do
 * titular (LGPD art. 18; decisão D-023) — quem pediu, quando, e quando a
 * anonimização (`app/api/cron/titular/route.ts`) processa ou já processou.
 * R-42 (D-015): `listarPedidosDeExclusao` (`lib/admin/consultas.ts`) escopa
 * pelo mundo de exemplo — um sysadmin de exemplo só vê pedidos de gente de
 * exemplo, nunca de uma pessoa real.
 */
export default async function AdminPedidosDeExclusaoPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const admin = createAdminClient();
  const pedidos = await listarPedidosDeExclusao(admin, { exemplo: user.exemplo });

  const ids = pedidos.map((p) => p.user_id);
  const { data: perfis } = ids.length
    ? await admin.from("profiles").select("user_id, nome").in("user_id", ids)
    : { data: [] };
  const nomeDe = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));

  const ROTULO_STATUS: Record<string, string> = {
    pendente: "Pendente",
    cancelado: "Cancelado",
    concluido: "Concluído",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Pedidos de exclusão</h1>
        <p className="text-sm text-muted">
          Direito do titular (LGPD art. 18) — anonimização em até 15 dias, processada pelo cron diário.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Pessoa</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Pedido em</th>
              <th className="px-3 py-2">Processa em</th>
              <th className="px-3 py-2">Concluído em</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium">{nomeDe.get(p.user_id) ?? p.user_id}</td>
                <td className="px-3 py-2 text-muted">{ROTULO_STATUS[p.status] ?? p.status}</td>
                <td className="px-3 py-2 text-muted">{new Date(p.solicitado_em).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-muted">{new Date(p.pode_processar_em).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2 text-muted">
                  {p.concluido_em ? new Date(p.concluido_em).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  Nenhum pedido de exclusão registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
