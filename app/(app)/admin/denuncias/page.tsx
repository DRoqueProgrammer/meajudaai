import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui";
import { StatusTabs } from "@/components/status-tabs";
import { DenunciaModerar } from "@/components/denuncia-moderar";
import { formatData } from "@/lib/format";
import { ALVO_LABEL, motivoCurto } from "@/lib/denuncias";

const TABS = [
  { value: "", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvida", label: "Resolvidas" },
  { value: "descartada", label: "Descartadas" },
];

const ALVO: Record<string, string> = ALVO_LABEL;

/** Rota `/admin/denuncias` (sysadmin): fila de denúncias com filtro por status e ações de moderação. */
export default async function AdminDenunciasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const sb = await createServerClient();
  let q = sb.from("denuncias").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const lista = data ?? [];

  const userIds = new Set<string>();
  const vagaIds = new Set<string>();
  for (const d of lista) {
    userIds.add(d.denunciante_id);
    if (d.alvo_tipo === "usuario") userIds.add(d.alvo_id);
    if (d.alvo_tipo === "vaga") vagaIds.add(d.alvo_id);
  }
  const { data: perfis } = userIds.size
    ? await sb.from("profiles").select("user_id, nome").in("user_id", [...userIds])
    : { data: [] };
  const { data: vagas } = vagaIds.size
    ? await sb.from("vagas").select("id, titulo").in("id", [...vagaIds])
    : { data: [] };
  const nomeUser = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));
  const tituloVaga = new Map((vagas ?? []).map((v) => [v.id, v.titulo]));

  const alvoLabel = (d: { alvo_tipo: string; alvo_id: string }) => {
    if (d.alvo_tipo === "usuario") return nomeUser.get(d.alvo_id) ?? "Usuário";
    if (d.alvo_tipo === "vaga") return tituloVaga.get(d.alvo_id) ?? "Vaga";
    return ALVO[d.alvo_tipo] ?? d.alvo_tipo;
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Moderação · Denúncias</h1>
        <p className="text-sm text-muted">
          {lista.length} denúncia(s){status ? ` · ${status.replace("_", " ")}` : ""}
        </p>
      </div>
      <StatusTabs base="/admin/denuncias" current={status ?? ""} tabs={TABS} />
      <div className="flex flex-col gap-3">
        {lista.map((d) => (
          <div key={d.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {ALVO[d.alvo_tipo] ?? d.alvo_tipo}: <span className="text-brand">{alvoLabel(d)}</span>
                </p>
                {/* O nome do denunciante só aparece aqui, para a moderação.
                    Nenhuma tela do lado do denunciado pode expor esse campo. */}
                <p className="text-xs text-muted">
                  {motivoCurto(d.motivo)} · por {nomeUser.get(d.denunciante_id) ?? "—"} ·{" "}
                  {formatData(d.created_at.slice(0, 10))}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </div>
            {d.detalhe ? <p className="text-sm">{d.detalhe}</p> : null}
            {d.resolucao ? (
              <p className="text-xs text-muted">
                <span className="font-medium">Moderação:</span> {d.resolucao}
              </p>
            ) : null}
            <DenunciaModerar id={d.id} status={d.status} />
          </div>
        ))}
        {lista.length === 0 && <p className="card-vazio">Nenhuma denúncia neste filtro.</p>}
      </div>
    </div>
  );
}
