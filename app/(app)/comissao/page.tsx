import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { formatBRL, formatData } from "@/lib/format";
import { hojeEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";
import { listarTiposServico } from "@/lib/tipos-servico";
import { mesPorExtenso, resumoDoRecibo, numeroDaNotaAvulsa } from "@/lib/comissao/regras";
import { montarPixEstatico } from "@/lib/pix/static-qr";
import { QrPix } from "@/components/pix/qr-pix";
import { EnvieiPixBotao } from "@/components/comissao/enviei-pix-botao";

/** Rótulo e cor de cada status de `pagamentos_comissao` (o CHECK do banco cobre só estes três). */
const STATUS_PAGAMENTO: Record<string, { label: string; classe: string }> = {
  informado: { label: "Informado — aguardando", classe: "bg-tint-warn text-tint-warn-ink" },
  confirmado: { label: "Confirmado", classe: "bg-tint-ok text-ok" },
  recusado: { label: "Recusado", classe: "bg-tint-danger text-danger" },
};

/** Situação de um mês de comissões: todas pagas, nenhuma paga, ou uma mistura das duas. */
function situacaoDoMes(linhas: readonly { status: string }[]): "paga" | "parcial" | "em_aberto" {
  if (linhas.every((l) => l.status === "paga")) return "paga";
  if (linhas.some((l) => l.status === "paga")) return "parcial";
  return "em_aberto";
}

const SITUACAO_MES: Record<"paga" | "parcial" | "em_aberto", { label: string; classe: string }> = {
  paga: { label: "Paga", classe: "bg-tint-ok text-ok" },
  parcial: { label: "Parcial", classe: "bg-tint-warn text-tint-warn-ink" },
  em_aberto: { label: "Em aberto", classe: "bg-tint-danger text-danger" },
};

/**
 * Rota `/comissao` — só do prestador (D-044 em cvg/docs/tech-spec/_decisoes-
 * travadas.md): saldo da comissão da plataforma, alíquota vigente por tipo de
 * serviço, o QR Pix pra pagar na chave do Administrador da praça e o
 * histórico de pagamentos e recibos. Tudo lido PELA SESSÃO — a RLS de
 * `comissoes`/`pagamentos_comissao`/`notas_avulsas` já entrega só o que é do
 * prestador logado; `aliquota_de`/`destino_da_comissao` são SECURITY DEFINER
 * mas concedidas à sessão porque a própria função confere quem pergunta.
 */
export default async function ComissaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const sb = await createServerClient();

  const [{ data: comissoesRaw }, { data: pagamentosRaw }, { data: destinoRaw }, { data: notasRaw }] = await Promise.all([
    sb
      .from("comissoes")
      .select("id, servico_id, tipo_servico, base, percentual, valor, status, created_at")
      .eq("prestador_id", user.id)
      .order("created_at", { ascending: false }),
    sb
      .from("pagamentos_comissao")
      .select("id, valor, status, informado_em, decidido_em, observacao")
      .eq("prestador_id", user.id)
      .order("informado_em", { ascending: false }),
    sb.rpc("destino_da_comissao"),
    sb
      .from("notas_avulsas")
      .select("id, numero, descricao, valor, recebido_em, forma")
      .eq("prestador_id", user.id)
      .order("recebido_em", { ascending: false }),
  ]);

  const comissoes = comissoesRaw ?? [];
  const pagamentos = pagamentosRaw ?? [];
  const notas = notasRaw ?? [];
  const destino = destinoRaw?.[0] ?? null;

  // Alíquota vigente por tipo de serviço (uma chamada por tipo — a função é
  // barata e o catálogo tem só um punhado de tipos).
  const tipos = await listarTiposServico(sb);
  const aliquotas = await Promise.all(
    tipos.map(async (t) => {
      const { data } = await sb.rpc("aliquota_de", { p_prestador: user.id, p_tipo: t.slug });
      return { tipo: t, percentual: data ?? 0 };
    }),
  );

  // Saldo em aberto (soma em centavos, pra não acumular erro de ponto
  // flutuante) e desde quando a comissão mais antiga está parada.
  const abertas = comissoes.filter((c) => c.status === "em_aberto");
  const saldoAberto = abertas.reduce((acc, c) => acc + Math.round(Number(c.valor) * 100), 0) / 100;
  const maisAntigaAberta = abertas.reduce<string | null>(
    (min, c) => (min === null || c.created_at < min ? c.created_at : min),
    null,
  );

  const pendente = pagamentos.find((p) => p.status === "informado") ?? null;
  const ultimoPagamento = pagamentos[0] ?? null;

  // Data do SERVIÇO de cada comissão (servicos.slot_id → agenda_slots.data) —
  // "por mês" agrupa por quando o trabalho aconteceu, não por quando a
  // comissão nasceu no banco (que é o mesmo dia, mas a fonte correta é a
  // agenda, não created_at).
  const servicoIds = [...new Set(comissoes.map((c) => c.servico_id))];
  const { data: servicosRaw } = servicoIds.length
    ? await sb.from("servicos").select("id, slot_id").in("id", servicoIds)
    : { data: [] };
  const slotIdDoServico = new Map((servicosRaw ?? []).map((s) => [s.id, s.slot_id]));

  const slotIds = [...new Set((servicosRaw ?? []).map((s) => s.slot_id))];
  const { data: slotsRaw } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data").in("id", slotIds)
    : { data: [] };
  const dataDoSlot = new Map((slotsRaw ?? []).map((s) => [s.id, s.data]));

  const mesDaComissao = (servicoId: string): string => {
    const slotId = slotIdDoServico.get(servicoId);
    const data = slotId ? dataDoSlot.get(slotId) : undefined;
    return data ? data.slice(0, 7) : "";
  };

  const porMes = new Map<string, typeof comissoes>();
  for (const c of comissoes) {
    const mes = mesDaComissao(c.servico_id);
    if (!mes) continue; // sem slot ainda encontrado — não deveria acontecer, mas não trava a tela.
    const grupo = porMes.get(mes) ?? [];
    grupo.push(c);
    porMes.set(mes, grupo);
  }
  const meses = [...porMes.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, linhas]) => ({ mes, resumo: resumoDoRecibo(linhas), situacao: situacaoDoMes(linhas) }));

  // Pagar: sem praça, sem chave do Administrador, ou o QR com o botão
  // "Enviei o Pix" — nunca um QR quebrado (ROADMAP §16.5).
  const hoje = hojeEmSaoPaulo();
  const podePagar = destino != null && !!destino.chave && saldoAberto > 0 && !pendente;
  let payloadPix = "";
  if (podePagar && destino) {
    try {
      payloadPix = montarPixEstatico({ chave: destino.chave, nome: destino.recebedor, cidade: destino.cidade, valor: saldoAberto });
    } catch {
      payloadPix = "";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Comissão da plataforma</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          A praça da sua cidade cobra uma porcentagem de cada serviço realizado. Pague pelo Pix e avise aqui.
        </p>
      </div>

      {/* b) Saldo — número grande, desde quando, e o aviso do pagamento em análise ou recusado. */}
      <div className="card flex flex-col gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-brand">{formatBRL(saldoAberto)}</p>
          <p className="text-sm text-muted">
            em aberto{maisAntigaAberta ? ` · desde ${formatData(maisAntigaAberta.slice(0, 10))}` : ""}
          </p>
        </div>
        {pendente ? (
          <div className="rounded-xl bg-tint-warn px-4 py-3 text-sm text-tint-warn-ink">
            Pagamento de {formatBRL(pendente.valor)} informado em {formatData(pendente.informado_em.slice(0, 10))} às{" "}
            {horaEmSaoPaulo(new Date(pendente.informado_em))} — aguardando a administração confirmar.
          </div>
        ) : ultimoPagamento?.status === "recusado" ? (
          <div className="rounded-xl bg-tint-danger px-4 py-3 text-sm text-danger">
            Seu último pagamento informado foi recusado
            {ultimoPagamento.observacao ? `: "${ultimoPagamento.observacao}".` : "."} Confira e informe de novo quando o
            Pix sair.
          </div>
        ) : null}
      </div>

      {/* c) Pagar */}
      {!destino ? (
        <p className="card-vazio">Sua cidade ainda não tem uma praça — não há comissão a pagar.</p>
      ) : !destino.chave ? (
        <p className="card-vazio">
          O Administrador da sua praça ainda não cadastrou a chave Pix — fale com ele pelas{" "}
          <Link href="/mensagens" className="font-medium text-brand underline">
            Mensagens
          </Link>
          .
        </p>
      ) : podePagar && payloadPix ? (
        <div className="card flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted">
            Pague para <strong className="font-semibold text-ink">{destino.recebedor}</strong>, responsável pela praça{" "}
            {destino.praca}.
          </p>
          <QrPix
            payload={payloadPix}
            linhas={{ nome: destino.recebedor, data: formatData(hoje), valor: formatBRL(saldoAberto) }}
            textoCompartilhar={`Pix da comissão da plataforma para ${destino.recebedor}: ${formatBRL(saldoAberto)}.`}
          />
          <EnvieiPixBotao valor={saldoAberto} recebedor={destino.recebedor} />
        </div>
      ) : saldoAberto <= 0 && !pendente ? (
        <p className="card-vazio">Nenhuma comissão em aberto — você está em dia.</p>
      ) : null}

      {/* d) Alíquotas vigentes, uma linha por tipo de serviço. */}
      <div className="card flex flex-col gap-1">
        <h2 className="mb-1 text-sm font-semibold text-muted">Alíquotas vigentes</h2>
        <div className="flex flex-col divide-y divide-line">
          {aliquotas.map(({ tipo, percentual }) => (
            <div key={tipo.slug} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>{tipo.nome}</span>
              <span className="font-semibold tabular-nums">{percentual > 0 ? `${percentual}%` : "0%"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* e) Por mês, do mais recente ao mais antigo, com o link do recibo. */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Por mês</h2>
        {meses.length === 0 ? (
          <p className="card-vazio">Nenhuma comissão ainda — ela aparece quando um serviço vira realizado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {meses.map(({ mes, resumo, situacao }) => (
              <div key={mes} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize">{mesPorExtenso(mes)}</p>
                  <p className="text-xs text-muted">
                    {resumo.quantidade} {resumo.quantidade === 1 ? "serviço" : "serviços"} ·{" "}
                    {formatBRL(resumo.totalServicos)} em serviços
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-brand">{formatBRL(resumo.totalComissao)}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${SITUACAO_MES[situacao].classe}`}
                    >
                      {SITUACAO_MES[situacao].label}
                    </span>
                  </div>
                  <Link
                    href={`/recibo/comissao/${user.id}/${mes}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-semibold text-brand underline"
                  >
                    Ver recibo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* f) Histórico de pagamentos informados. */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Histórico de pagamentos</h2>
        {pagamentos.length === 0 ? (
          <p className="card-vazio">Nenhum pagamento informado ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums">{formatBRL(p.valor)}</p>
                  <p className="text-xs text-muted">
                    Informado em {formatData(p.informado_em.slice(0, 10))}
                    {p.decidido_em ? ` · decidido em ${formatData(p.decidido_em.slice(0, 10))}` : ""}
                  </p>
                  {p.observacao ? <p className="mt-0.5 truncate text-xs text-muted">&quot;{p.observacao}&quot;</p> : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${
                    STATUS_PAGAMENTO[p.status]?.classe ?? "bg-surface text-muted"
                  }`}
                >
                  {STATUS_PAGAMENTO[p.status]?.label ?? p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* g) Recibos avulsos — só aparece se houver algum. */}
      {notas.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Recibos avulsos</h2>
          <div className="flex flex-col gap-2">
            {notas.map((n) => (
              <div key={n.id} className="card flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    Nº {numeroDaNotaAvulsa(n.numero)} · {n.descricao}
                  </p>
                  <p className="text-xs text-muted">
                    {formatData(n.recebido_em)} · {formatBRL(n.valor)}
                  </p>
                </div>
                <Link
                  href={`/recibo/nota/${n.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-semibold text-brand underline"
                >
                  Ver recibo
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
