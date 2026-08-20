import { getActiveWorkspace } from "@/lib/auth/workspace";
import { guardModule } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui";
import { PeriodoTabs } from "@/components/periodo-tabs";
import { isPeriodo, rangeDoPeriodo } from "@/lib/periodo";
import { formatBRL } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function mesLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1] ?? m}/${y?.slice(2)}`;
}

function Kpi({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand">{valor}</p>
      {nota ? <p className="mt-0.5 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}

/** Rota `/financeiro` (módulo financeiro): totais de diárias da empresa por período. */
export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await guardModule("financeiro");
  const { periodo: pRaw } = await searchParams;
  const periodo = isPeriodo(pRaw) ? pRaw : "tudo";
  const { desde, ate } = rangeDoPeriodo(periodo);
  const ws = await getActiveWorkspace();
  const sb = await createServerClient();

  let vq = ws
    ? sb
        .from("vagas")
        .select("id, titulo, valor_diaria, status, data_servico, categoria")
        .eq("workspace_id", ws.workspace_id)
    : null;
  if (vq && desde && ate) vq = vq.gte("data_servico", desde).lte("data_servico", ate);
  const { data: vagas } = vq ? await vq : { data: [] };
  const vlist = vagas ?? [];
  const vagaIds = vlist.map((v) => v.id);

  const { data: aceitas } = vagaIds.length
    ? await sb.from("candidaturas").select("vaga_id").eq("status", "aceito").in("vaga_id", vagaIds)
    : { data: [] };
  const aceitosPorVaga = new Map<string, number>();
  for (const c of aceitas ?? []) aceitosPorVaga.set(c.vaga_id, (aceitosPorVaga.get(c.vaga_id) ?? 0) + 1);

  const vagaCusto = vlist
    .map((v) => {
      const aceitos = aceitosPorVaga.get(v.id) ?? 0;
      return { ...v, aceitos, subtotal: aceitos * v.valor_diaria };
    })
    .sort((a, b) => b.subtotal - a.subtotal);

  const total = vagaCusto.reduce((s, v) => s + v.subtotal, 0);
  const diarias = vagaCusto.reduce((s, v) => s + v.aceitos, 0);
  const ativas = vlist.filter((v) => v.status === "aberta" || v.status === "em_andamento").length;
  const ticket = diarias ? total / diarias : 0;

  const porMes = new Map<string, number>();
  for (const v of vagaCusto) {
    if (v.subtotal > 0 && v.data_servico) {
      const k = v.data_servico.slice(0, 7);
      porMes.set(k, (porMes.get(k) ?? 0) + v.subtotal);
    }
  }
  const meses = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxMes = Math.max(1, ...meses.map((m) => m[1]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <p className="text-sm text-muted">{ws?.nome ?? "Sem equipe"} · quanto você gastou com diárias</p>
      </div>

      <PeriodoTabs base="/financeiro" current={periodo === "tudo" ? "" : periodo} />

      {!ws ? (
        <p className="text-sm text-muted">Você ainda não tem uma equipe.</p>
      ) : (
        <>
          {/* "Total comprometido" e "Ticket médio" são vocabulário de controller.
              Quem lê esta tela é o dono da obra: ele fala em quanto vai pagar. */}
          <div className="grid grid-cols-2 gap-2">
            <Kpi
              label="A pagar em diárias"
              valor={formatBRL(total)}
              nota={diarias === 1 ? "1 ajudante confirmado" : `${diarias} ajudantes confirmados`}
            />
            <Kpi label="Média por diária" valor={formatBRL(ticket)} nota="o que você paga por ajudante/dia" />
            <Kpi label="Vagas no ar" valor={String(ativas)} nota={`${vlist.length} publicadas no total`} />
            <Kpi
              label="Diárias fechadas"
              valor={String(diarias)}
              nota={`em ${vagaCusto.filter((v) => v.aceitos > 0).length} vaga(s)`}
            />
          </div>

          {meses.length > 0 ? (
            <section className="card flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Por mês</p>
              {meses.map(([ym, v]) => (
                <div key={ym} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-muted">{mesLabel(ym)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.round((v / maxMes) * 100)}%` }}
                    />
                  </span>
                  <span className="w-24 text-right text-sm font-semibold">{formatBRL(v)}</span>
                </div>
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Por vaga</p>
            {vagaCusto.map((v) => (
              <div key={v.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{v.titulo}</p>
                  <p className="text-xs text-muted">
                    {nomeCategoria(v.categoria)} · {formatBRL(v.valor_diaria)} × {v.aceitos}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={v.status} />
                  <span className="w-24 text-right text-sm font-bold text-brand">{formatBRL(v.subtotal)}</span>
                </div>
              </div>
            ))}
            {vagaCusto.length === 0 && (
              <p className="card-vazio">Nenhuma vaga publicada nesta equipe ainda.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
