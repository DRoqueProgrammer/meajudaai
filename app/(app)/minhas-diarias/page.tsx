import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { VagaCard } from "@/components/vaga-card";
import { StatusTabs } from "@/components/status-tabs";
import { jaPassou } from "@/lib/periodo";

const TABS = [
  { value: "", label: "Todas" },
  { value: "aguardando", label: "Aguardando" },
  { value: "aceito", label: "Aceitas" },
  { value: "recusado", label: "Recusadas" },
];

/** Rota `/minhas-diarias` (ajudante): candidaturas e diárias do usuário, agrupadas por status. */
export default async function MinhasDiariasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  const sb = await createServerClient();

  let query = sb
    .from("candidaturas")
    .select("id, vaga_id, status, created_at")
    .eq("ajudante_id", user!.id)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: cands } = await query;

  const vagaIds = (cands ?? []).map((c) => c.vaga_id);
  const { data: vagas } = vagaIds.length
    ? await sb.from("vagas").select("*").in("id", vagaIds)
    : { data: [] };
  const vagaDe = new Map((vagas ?? []).map((v) => [v.id, v]));
  const lista = cands ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Minhas diárias</h1>
        <p className="mt-0.5 text-sm text-muted">
          {lista.length} candidatura{lista.length === 1 ? "" : "s"}
        </p>
      </div>
      <StatusTabs base="/minhas-diarias" current={status ?? ""} tabs={TABS} />
      <div className="flex flex-col gap-3">
        {lista.map((c) => {
          const v = vagaDe.get(c.vaga_id);
          if (!v) return null;
          // Enquanto o serviço não chegou, Chat é a única ação que faz sentido;
          // "Avaliar" só aparece depois, para não ser o verde cheio na semana errada.
          const acoes =
            c.status === "aceito" ? (
              <>
                <Link
                  href={`/chat/vaga/${v.id}`}
                  className={jaPassou(v.data_servico) ? "btn-ghost flex-1" : "btn-action flex-1"}
                >
                  Chat
                </Link>
                {jaPassou(v.data_servico) ? (
                  <Link href={`/avaliar/${v.id}`} className="btn-action flex-1">
                    Avaliar
                  </Link>
                ) : null}
              </>
            ) : undefined;
          return <VagaCard key={c.id} vaga={v} status={c.status} actions={acoes} />;
        })}
        {lista.length === 0 && (
          <p className="card-vazio">
            Nenhuma diária neste filtro.
          </p>
        )}
      </div>
    </div>
  );
}
