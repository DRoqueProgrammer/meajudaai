import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComentarServico } from "@/components/admin/comentar-servico";
import { formatBRL, formatData } from "@/lib/format";

/** Rota `/admin/servicos` (SysAdmin): todos os serviços da plataforma, com comentário privado/público. Ver ROADMAP.md §6.4. */
export default async function AdminServicosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const admin = createAdminClient();
  const { data: servicos } = await admin
    .from("servicos")
    .select("id, descricao, preco_valor, status, prestador_id, cliente_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const ids = [...new Set((servicos ?? []).flatMap((s) => [s.prestador_id, s.cliente_id]))];
  const { data: perfis } = ids.length ? await admin.from("profiles").select("user_id, nome").in("user_id", ids) : { data: [] };
  const nomeDe = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));

  const servicoIds = (servicos ?? []).map((s) => s.id);
  const { data: comentarios } = servicoIds.length
    ? await admin.from("servico_comentarios_admin").select("id, servico_id, texto, publico, created_at").in("servico_id", servicoIds)
    : { data: [] };
  type ComentRow = { id: string; servico_id: string; texto: string; publico: boolean; created_at: string };
  const comentDe = new Map<string, ComentRow[]>();
  for (const c of (comentarios ?? []) as ComentRow[]) {
    if (!comentDe.has(c.servico_id)) comentDe.set(c.servico_id, []);
    comentDe.get(c.servico_id)!.push(c);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Serviços da plataforma</h1>
      <p className="text-sm text-muted">Últimos 100, entre todos os prestadores. Comentários privados só você vê.</p>
      {(servicos ?? []).map((s) => (
        <div key={s.id} className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {nomeDe.get(s.prestador_id) ?? "?"} → {nomeDe.get(s.cliente_id) ?? "?"}
            </p>
            <span className="text-xs font-semibold uppercase text-muted">{s.status}</span>
          </div>
          <p className="text-sm text-muted">
            {formatData(s.created_at.slice(0, 10))} · {s.descricao} · {formatBRL(s.preco_valor)}
          </p>
          <ComentarServico servicoId={s.id} comentarios={comentDe.get(s.id) ?? []} />
        </div>
      ))}
      {(servicos ?? []).length === 0 ? <p className="text-sm text-muted">Nenhum serviço ainda.</p> : null}
    </div>
  );
}
