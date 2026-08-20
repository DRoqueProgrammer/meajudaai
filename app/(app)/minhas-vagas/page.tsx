import Link from "next/link";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { guardModule } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { VagaCard } from "@/components/vaga-card";
import { StatusTabs } from "@/components/status-tabs";

const TABS = [
  { value: "", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "finalizada", label: "Finalizadas" },
  { value: "cancelada", label: "Canceladas" },
];

/** Rota `/minhas-vagas` (admin): vagas publicadas pela empresa ativa, agrupadas por status. */
export default async function MinhasVagasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  await guardModule("vagas");
  const ws = await getActiveWorkspace();
  const ids = ws ? [ws.workspace_id] : [];
  const sb = await createServerClient();

  let query = ids.length
    ? sb.from("vagas").select("*").in("workspace_id", ids).order("created_at", { ascending: false })
    : null;
  if (query && status) query = query.eq("status", status);
  const { data: vagas } = query ? await query : { data: [] };

  const vagaIds = (vagas ?? []).map((v) => v.id);
  const { data: cands } = vagaIds.length
    ? await sb.from("candidaturas").select("vaga_id").in("vaga_id", vagaIds)
    : { data: [] };
  const contagem = new Map<string, number>();
  (cands ?? []).forEach((c) => contagem.set(c.vaga_id, (contagem.get(c.vaga_id) ?? 0) + 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Minhas vagas</h1>
        <Link href="/publicar" className="btn-action px-3 py-2 text-sm">+ Nova diária</Link>
      </div>
      {!ws ? (
        <p className="text-sm text-muted">Você ainda não tem uma equipe para publicar vagas.</p>
      ) : (
        <>
          <StatusTabs base="/minhas-vagas" current={status ?? ""} tabs={TABS} />
          <div className="flex flex-col gap-3">
            {(vagas ?? []).map((v) => (
              <VagaCard key={v.id} vaga={v} href={`/minhas-vagas/${v.id}/candidatos`} candidatos={contagem.get(v.id) ?? 0} descricao />
            ))}
            {(!vagas || vagas.length === 0) && <p className="card-vazio">Nenhuma vaga neste filtro.</p>}
          </div>
        </>
      )}
    </div>
  );
}
