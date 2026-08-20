import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VagaCard } from "@/components/vaga-card";
import { AgendaView } from "@/components/agenda/agenda-view";
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";

type Item = {
  id: string;
  titulo: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  valor_diaria: number;
  data_servico: string | null;
  hora_inicio: string | null;
  status: string;
  empresa: string;
};

function Cartao({ v }: { v: Item }) {
  return (
    <VagaCard
      vaga={v}
      subtitle={
        <>
          {v.empresa} · {nomeCategoria(v.categoria)}
        </>
      }
      meta={
        <>
          <span className="text-[20px] font-bold text-brand">
            {formatBRL(v.valor_diaria)}{" "}
            <span className="text-xs font-normal text-muted">/ diária</span>
          </span>
          <span className="text-[12.5px] font-medium text-muted">
            {v.cidade}
            {v.bairro ? `, ${v.bairro}` : ""}
            {v.hora_inicio ? ` · ${formatHora(v.hora_inicio)}` : ""}
          </span>
        </>
      }
    />
  );
}

/** Rota `/agenda` (ajudante): diárias aceitas e dias de indisponibilidade, em lista ou calendário. */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ajudante") redirect("/inicio");

  const sb = await createServerClient();
  const { data: cands } = await sb
    .from("candidaturas")
    .select("vaga_id, status")
    .eq("ajudante_id", user.id)
    .eq("status", "aceito");

  const vagaIds = [...new Set((cands ?? []).map((c) => c.vaga_id))];
  const { data: vagas } = vagaIds.length
    ? await sb
        .from("vagas")
        .select(
          "id, titulo, categoria, cidade, bairro, valor_diaria, data_servico, hora_inicio, status, workspace_id",
        )
        .in("id", vagaIds)
    : { data: [] };
  const wsIds = [...new Set((vagas ?? []).map((v) => v.workspace_id))];
  const admin = createAdminClient();
  const { data: empresas } = wsIds.length
    ? await admin.from("workspaces").select("id, nome").in("id", wsIds)
    : { data: [] };
  const empresaDe = new Map((empresas ?? []).map((e) => [e.id, e.nome]));

  const itens: Item[] = (vagas ?? [])
    .map((v) => ({
      id: v.id,
      titulo: v.titulo,
      categoria: v.categoria,
      cidade: v.cidade,
      bairro: v.bairro,
      valor_diaria: v.valor_diaria,
      data_servico: v.data_servico,
      hora_inicio: v.hora_inicio,
      status: v.status,
      empresa: empresaDe.get(v.workspace_id) ?? "Equipe",
    }))
    .sort((a, b) => (a.data_servico ?? "9999").localeCompare(b.data_servico ?? "9999"));

  // Bloqueios do próprio ajudante (RLS: só os dele).
  const { data: bloqueios } = await sb.from("bloqueio_agenda").select("data").eq("ajudante_id", user.id);
  const blocos = (bloqueios ?? []).map((b) => b.data);

  const hoje = new Date().toLocaleDateString("sv-SE");
  const { mes } = await searchParams;
  const agora = new Date();
  let year = agora.getFullYear();
  let month = agora.getMonth() + 1;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    year = y!;
    month = m!;
  }

  const proximas = itens.filter((v) => !v.data_servico || v.data_servico >= hoje);
  const anteriores = itens.filter((v) => v.data_servico && v.data_servico < hoje).reverse();
  const grupos = new Map<string, Item[]>();
  for (const v of proximas) {
    const k = v.data_servico ?? "sem-data";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(v);
  }

  const lista = (
    <>
      {proximas.length === 0 && anteriores.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">
            Você ainda não tem diárias confirmadas.{" "}
            <Link href="/vagas" className="font-medium text-brand">
              Buscar vagas
            </Link>
            .
          </p>
        </div>
      ) : null}

      {proximas.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Próximas</p>
          {[...grupos.entries()].map(([data, grupo]) => (
            <div key={data} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">
                {data === "sem-data" ? (
                  "Data a combinar"
                ) : (
                  <>
                    <span aria-hidden="true">📅</span> {formatData(data)}
                  </>
                )}
              </p>
              {grupo.map((v) => (
                <Cartao key={v.id} v={v} />
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {anteriores.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Anteriores</p>
          {anteriores.map((v) => (
            <Cartao key={v.id} v={v} />
          ))}
        </section>
      ) : null}
    </>
  );

  const calendario = (
    <AgendaCalendar
      year={year}
      month={month}
      hoje={hoje}
      blocos={blocos}
      diarias={itens.map((v) => ({ id: v.id, titulo: v.titulo, data: v.data_servico }))}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Minha agenda</h1>
        <Link href="/minhas-diarias" className="text-xs font-medium text-brand">
          Todas as candidaturas →
        </Link>
      </div>
      <p className="text-sm text-muted">
        Suas diárias confirmadas — de várias equipes. Alterne entre lista e calendário.
      </p>
      <AgendaView lista={lista} calendario={calendario} />
    </div>
  );
}
