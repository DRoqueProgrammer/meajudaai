import { getActiveWorkspace } from "@/lib/auth/workspace";
import { guardModule } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { StarRating } from "@/components/ui";
import { PeriodoTabs } from "@/components/periodo-tabs";
import { isPeriodo, rangeDoPeriodo } from "@/lib/periodo";
import { nomeCategoria } from "@/lib/categorias";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Abertas",
  em_andamento: "Em andamento",
  finalizada: "Finalizadas",
  cancelada: "Canceladas",
};

function Kpi({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand">{valor}</p>
      {nota ? <p className="mt-0.5 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await guardModule("relatorios");
  const { periodo: pRaw } = await searchParams;
  const periodo = isPeriodo(pRaw) ? pRaw : "tudo";
  const { desde, ate } = rangeDoPeriodo(periodo);
  const ws = await getActiveWorkspace();
  const sb = await createServerClient();

  let vq = ws
    ? sb.from("vagas").select("id, status, categoria, data_servico").eq("workspace_id", ws.workspace_id)
    : null;
  if (vq && desde && ate) vq = vq.gte("data_servico", desde).lte("data_servico", ate);
  const { data: vagas } = vq ? await vq : { data: [] };
  const vlist = vagas ?? [];
  const vagaIds = vlist.map((v) => v.id);

  const { data: cands } = vagaIds.length
    ? await sb.from("candidaturas").select("vaga_id, status").in("vaga_id", vagaIds)
    : { data: [] };
  const clist = cands ?? [];

  const porStatus = new Map<string, number>();
  for (const v of vlist) porStatus.set(v.status, (porStatus.get(v.status) ?? 0) + 1);

  const comAceito = new Set(clist.filter((c) => c.status === "aceito").map((c) => c.vaga_id));
  const fillRate = vlist.length ? Math.round((comAceito.size / vlist.length) * 100) : 0;
  const totalCand = clist.length;
  const mediaCand = vlist.length ? (totalCand / vlist.length).toFixed(1).replace(".", ",") : "0";

  const porCat = new Map<string, number>();
  for (const v of vlist) porCat.set(v.categoria, (porCat.get(v.categoria) ?? 0) + 1);
  const cats = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));

  const { data: prof } = await sb
    .from("profiles")
    .select("nota_media, total_avaliacoes")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted">{ws?.nome ?? "Sem equipe"} · como suas vagas têm andado</p>
      </div>

      <PeriodoTabs base="/relatorios" current={periodo === "tudo" ? "" : periodo} />

      {!ws ? (
        <p className="text-sm text-muted">Você ainda não tem uma equipe.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {/* "Taxa de preenchimento" é palavra de painel corporativo. O que o
                dono da obra quer saber é se a vaga dele consegue ajudante. */}
            <Kpi
              label="Vagas publicadas"
              valor={String(vlist.length)}
              nota={`${comAceito.size} conseguiram ajudante`}
            />
            <Kpi label="Vagas que deram certo" valor={`${fillRate}%`} nota="fecharam com ajudante" />
            <Kpi
              label="Gente se candidatando"
              valor={String(totalCand)}
              nota={`${mediaCand} por vaga, em média`}
            />
            <Kpi
              label="Sua nota"
              valor={prof ? `${prof.nota_media.toFixed(1).replace(".", ",")} ★` : "—"}
              nota={`${prof?.total_avaliacoes ?? 0} ajudante(s) avaliaram você`}
            />
          </div>

          <section className="card flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Vagas por status</p>
            {vlist.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma vaga publicada.</p>
            ) : (
              (["aberta", "em_andamento", "finalizada", "cancelada"] as const).map((s) => {
                const n = porStatus.get(s) ?? 0;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-muted">{STATUS_LABEL[s]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${Math.round((n / Math.max(1, vlist.length)) * 100)}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-sm font-semibold">{n}</span>
                  </div>
                );
              })
            )}
          </section>

          {cats.length > 0 ? (
            <section className="card flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Categorias mais publicadas
              </p>
              {cats.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-40 truncate text-xs text-muted">{nomeCategoria(cat)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className="block h-full rounded-full bg-action"
                      style={{ width: `${Math.round((n / maxCat) * 100)}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-sm font-semibold">{n}</span>
                </div>
              ))}
            </section>
          ) : null}

          {prof && prof.total_avaliacoes > 0 ? (
            <div className="card flex items-center justify-between">
              <span className="text-sm text-muted">Sua reputação como contratante</span>
              <StarRating nota={prof.nota_media} total={prof.total_avaliacoes} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
