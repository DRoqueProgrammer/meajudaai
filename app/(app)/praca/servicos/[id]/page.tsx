import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import { listarPrestadoresDaPraca } from "@/lib/admin/consultas";
import { Avatar } from "@/components/ui";
import { formatBRL, formatData } from "@/lib/format";
import { dataEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";
import { quandoDoServico, rotuloPeriodo } from "@/lib/periodo-da-visita";
import { listarTiposServico } from "@/lib/tipos-servico";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

const COMISSAO: Record<string, { rotulo: string; estilo: string }> = {
  paga: { rotulo: "Paga — Pix recebido", estilo: "bg-tint-ok text-ok" },
  informada: { rotulo: "Informada pelo prestador — aguarda OK", estilo: "bg-tint-warn text-tint-warn-ink" },
  em_aberto: { rotulo: "Não recebida", estilo: "bg-tint-danger text-danger" },
};

/**
 * Rota `/praca/servicos/[id]` (Administrador): um serviço da praça, só de
 * leitura — o que o card do mês da grade do Financeiro e a lista de Serviços
 * abrem em nova aba (pedido do Leonardo em 11/09/2026: "você clica, abre nova
 * aba para mostrar o serviço"). Mostra o serviço, as partes e a comissão, com
 * o recibo daquele serviço.
 *
 * Alcance: o serviço tem de ser de um prestador da praça ativa (cidade/UF e
 * mundo — `listarPrestadoresDaPraca`) ou ter comissão NESTA praça (prestador
 * que mudou de cidade depois). Qualquer outro id cai em 404. Sem endereço nem
 * contato do cliente — a administração não precisa deles aqui.
 */
export default async function ServicoDaPracaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const { id } = await params;
  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) return <SemPraca />;

  const { data: s } = await db
    .from("servicos")
    .select(
      "id, descricao, preco_tipo, preco_valor, status, tipo, prestador_id, cliente_id, slot_id, periodo_preferido, hora_combinada_inicio, hora_combinada_fim, cancelado_motivo, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const [prestadores, { data: comissao }] = await Promise.all([
    listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo),
    db.from("comissoes").select("valor, percentual, base, status, paga_em").eq("servico_id", s.id).eq("workspace_id", praca.id).maybeSingle(),
  ]);
  const daPraca = prestadores.some((p) => p.user_id === s.prestador_id) || comissao != null;
  if (!daPraca) notFound();

  const [{ data: slot }, { data: pessoas }, tipos] = await Promise.all([
    db.from("agenda_slots").select("data, hora_inicio, hora_fim").eq("id", s.slot_id).maybeSingle(),
    db.from("profiles").select("user_id, nome, foto_url").in("user_id", [s.prestador_id, s.cliente_id]),
    listarTiposServico(await createServerClient()),
  ]);
  const pessoa = new Map((pessoas ?? []).map((p) => [p.user_id, p]));
  const prestador = pessoa.get(s.prestador_id);
  const cliente = pessoa.get(s.cliente_id);
  const nomeTipo = tipos.find((t) => t.slug === s.tipo)?.nome ?? "Outros";
  const periodo = rotuloPeriodo(s.periodo_preferido);
  const mes = slot?.data.slice(0, 7);

  return (
    <div className="flex flex-col gap-4">
      <PracaAbas atual="/praca/servicos" pracaNome={praca.nome} cidade={praca.cidade} estado={praca.estado} />
      <Link href="/praca/servicos" className="text-sm font-semibold text-brand">
        ← Serviços da praça
      </Link>

      <div className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{nomeTipo}</p>
            <h1 className="text-lg font-semibold leading-snug">{s.descricao}</h1>
            <p className="text-sm text-muted">
              {slot ? `${formatData(slot.data)} · ${quandoDoServico(slot, s)}` : formatData(s.created_at.slice(0, 10))}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-lg font-bold tabular-nums text-brand">
              {formatBRL(s.preco_valor)}
              {s.preco_tipo === "hora" ? <span className="text-sm font-semibold"> /h</span> : null}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
              {s.status}
            </span>
          </div>
        </div>

        <dl className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <div>
            <dt className="text-rotulo font-semibold uppercase tracking-wide text-muted">Prestador</dt>
            <dd className="mt-1">
              <Link href={`/perfil/${s.prestador_id}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                <Avatar nome={prestador?.nome ?? "Prestador"} fotoUrl={prestador?.foto_url ?? null} />
                {prestador?.nome ?? "Prestador"}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-rotulo font-semibold uppercase tracking-wide text-muted">Cliente</dt>
            <dd className="mt-1">
              <Link href={`/perfil/${s.cliente_id}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                <Avatar nome={cliente?.nome ?? "Cliente"} fotoUrl={cliente?.foto_url ?? null} />
                {cliente?.nome ?? "Cliente"}
              </Link>
            </dd>
          </div>
          {periodo ? (
            <div>
              <dt className="text-rotulo font-semibold uppercase tracking-wide text-muted">Período preferido</dt>
              <dd className="mt-1 text-sm">De {periodo}</dd>
            </div>
          ) : null}
          {s.hora_combinada_inicio ? (
            <div>
              <dt className="text-rotulo font-semibold uppercase tracking-wide text-muted">Visita combinada</dt>
              <dd className="mt-1 text-sm">
                {s.hora_combinada_inicio.slice(0, 5)}
                {s.hora_combinada_fim ? `–${s.hora_combinada_fim.slice(0, 5)}` : ""}
              </dd>
            </div>
          ) : null}
          {s.cancelado_motivo ? (
            <div className="sm:col-span-2">
              <dt className="text-rotulo font-semibold uppercase tracking-wide text-muted">Motivo do cancelamento</dt>
              <dd className="mt-1 text-sm text-danger">{s.cancelado_motivo}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="card flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Comissão da plataforma</h2>
        {comissao ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="text-lg font-bold tabular-nums">{formatBRL(Number(comissao.valor))}</span>{" "}
                <span className="text-muted">
                  ({Number(comissao.percentual).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de {formatBRL(Number(comissao.base))})
                </span>
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMISSAO[comissao.status]?.estilo ?? "bg-surface text-muted"}`}>
                {COMISSAO[comissao.status]?.rotulo ?? comissao.status}
              </span>
            </div>
            {comissao.paga_em ? (
              <p className="text-xs text-muted">
                OK dado em {formatData(dataEmSaoPaulo(new Date(comissao.paga_em)))} às {horaEmSaoPaulo(new Date(comissao.paga_em))}.
              </p>
            ) : null}
            {mes ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/recibo/comissao/${s.prestador_id}/${mes}?praca=${praca.id}&servico=${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost inline-flex h-11 items-center px-4 text-sm"
                >
                  Recibo deste serviço
                </Link>
                <Link href={`/praca/financeiro?pessoa=${s.prestador_id}&ano=${mes.slice(0, 4)}`} className="btn-ghost inline-flex h-11 items-center px-4 text-sm">
                  Ver no Financeiro
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">
            {s.status === "realizado" ? "Nenhuma comissão lançada para este serviço (alíquota 0% na época, ou realizado antes da comissão existir)." : "A comissão nasce quando o serviço é marcado como realizado."}
          </p>
        )}
      </div>
    </div>
  );
}
