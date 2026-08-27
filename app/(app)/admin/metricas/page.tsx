import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomeCategoria } from "@/lib/categorias";
import {
  resumoMarketplace,
  porGrupo,
  formatDuracaoHoras,
  pct,
  type GrupoMetrica,
} from "@/lib/metricas-marketplace";

/**
 * Rota `/admin/metricas` (sysadmin): a saúde do marketplace numa olhada — taxa
 * de preenchimento, tempo até o match e cancelamento, no total e por cidade e
 * categoria. São as métricas causais do negócio que o parecer cobrou: sem elas,
 * não se sabe se o mercado gira. Agregação cross-workspace usa o admin client
 * (RLS ignorada) DEPOIS do gate estrito em sysadmin — nunca antes.
 */
function Kpi({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand tabular-nums">{valor}</p>
      {nota ? <p className="mt-0.5 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}

function GrupoBarras({
  titulo,
  grupos,
  rotulo,
}: {
  titulo: string;
  grupos: GrupoMetrica[];
  rotulo: (chave: string) => string;
}) {
  if (grupos.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
        <div className="card-vazio">Ainda não há vagas para agregar.</div>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
      <div className="flex flex-col gap-2">
        {grupos.map((g) => (
          <div key={g.chave} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <p className="truncate text-sm font-medium">{rotulo(g.chave)}</p>
              <p className="text-xs text-muted tabular-nums">
                {g.preenchidas}/{g.total} preenchidas
              </p>
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded bg-black/5" role="img" aria-label={`${pct(g.taxaPreenchimento)} preenchidas`}>
              <div className="h-6 rounded bg-action-dark" style={{ width: `${g.taxaPreenchimento * 100}%` }} />
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct(g.taxaPreenchimento)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AdminMetricasPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const db = createAdminClient();
  const [{ data: vagas }, { data: cands }] = await Promise.all([
    db.from("vagas").select("id, status, categoria, cidade, created_at"),
    db.from("candidaturas").select("vaga_id, status, created_at"),
  ]);

  const vlist = vagas ?? [];
  const clist = cands ?? [];
  const resumo = resumoMarketplace(vlist, clist);
  const porCidade = porGrupo(vlist, clist, "cidade");
  const porCategoria = porGrupo(vlist, clist, "categoria");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Saúde do marketplace</h1>
        <p className="text-sm text-muted">
          Se o mercado gira: preenchimento, tempo até o match e cancelamento, na plataforma toda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Preenchimento" valor={pct(resumo.taxaPreenchimento)} nota={`${resumo.preenchidas} de ${resumo.totalVagas} vagas`} />
        <Kpi
          label="Tempo até o match"
          valor={formatDuracaoHoras(resumo.tempoMedioMatchHoras)}
          nota="média até a candidatura aceita"
        />
        <Kpi label="Cancelamento" valor={pct(resumo.taxaCancelamento)} nota={`${resumo.canceladas} canceladas`} />
        <Kpi label="Vagas publicadas" valor={String(resumo.totalVagas)} nota="no período todo" />
      </div>

      <GrupoBarras titulo="Preenchimento por cidade" grupos={porCidade} rotulo={(c) => c} />
      <GrupoBarras titulo="Preenchimento por categoria" grupos={porCategoria} rotulo={nomeCategoria} />

      <p className="text-xs text-muted">
        O tempo até o match é aproximado pela candidatura aceita mais antiga de cada vaga — o banco
        ainda não guarda o instante exato do aceite.
      </p>
    </div>
  );
}
