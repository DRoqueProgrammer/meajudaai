import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import {
  comissoesDaPraca,
  doMes,
  saldosPorPrestador,
  pagamentosDaPraca,
  aliquotasDaPraca,
  notasAvulsasDaPraca,
} from "@/lib/admin/financeiro";
import { listarPrestadoresDaPraca } from "@/lib/admin/consultas";
import { mesValido, mesPorExtenso, mesAnterior, resumoDoRecibo, numeroDaNotaAvulsa, estaAtrasado } from "@/lib/comissao/regras";
import { formatBRL, formatData } from "@/lib/format";
import { hojeEmSaoPaulo, FUSO } from "@/lib/datas";
import { PagamentoDecidirForm } from "@/components/financeiro/pagamento-decidir-form";
import { RegistrarRecebimentoBotao } from "@/components/financeiro/registrar-recebimento-botao";
import { NotaAvulsaDialog } from "@/components/financeiro/nota-avulsa-dialog";
import { CampoAliquota, AliquotasPorPrestador } from "@/components/financeiro/aliquotas-form";
import { AssinaturaPad } from "@/components/financeiro/assinatura-pad";

const FORMA_LABEL: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro" };

/** "2026-09" → "2026-10" (mês seguinte); regras.ts só exporta o anterior. */
function mesSeguinte(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, "0")}`;
}

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false });
/** "informado em 09/09 às 14:32", no fuso do produto — não no UTC do servidor. */
function informadoEmTexto(iso: string): string {
  const d = new Date(iso);
  return `informado em ${fmtDia.format(d)} às ${fmtHora.format(d)}`;
}

/**
 * Aba Financeiro do Administrador (pedido do Leonardo em 11/09/2026,
 * D-044/D-047): resumo do mês, pagamentos de comissão para confirmar, saldo
 * por prestador com destaque de atraso, recibo mensal por prestador, notas
 * avulsas (com "Criar nota avulsa") e a assinatura que sai nos recibos. Só o
 * Administrador (não o SysAdmin — ele modera a plataforma, não uma praça
 * específica) e sempre recortado pela praça ATIVA dele.
 *
 * Leituras já prontas em `lib/admin/financeiro.ts`; esta página só decide o
 * recorte por mês (`?mes=AAAA-MM`, padrão o mês corrente em São Paulo) e
 * monta a tela — nenhuma query nova além das necessárias pra achar nome de
 * quem só aparece aqui (prestador de uma comissão, de um pagamento, de uma
 * alíquota).
 */
export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) return <SemPraca />;

  const { mes: mesParam } = await searchParams;
  const mesAtual = mesValido(mesParam) ? mesParam : hojeEmSaoPaulo().slice(0, 7);
  const mesAnteriorStr = mesAnterior(mesAtual);
  const mesSeguinteStr = mesSeguinte(mesAtual);

  const sb = await createServerClient();

  const [comissoes, pagamentos, aliquotas, notas, prestadoresDaPraca, { data: tiposRows }, { data: assinaturaRow }] =
    await Promise.all([
      comissoesDaPraca(db, praca.id),
      pagamentosDaPraca(db, praca.id),
      aliquotasDaPraca(db, praca.id),
      notasAvulsasDaPraca(db, praca.id),
      listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo),
      db.from("tipos_servico").select("slug, nome, ordem").order("ordem", { ascending: true }),
      sb.from("assinaturas").select("imagem").eq("user_id", user.id).maybeSingle(),
    ]);

  // Nomes de quem só aparece aqui como prestador (comissão, pagamento ou
  // alíquota) — uma consulta só, reaproveitada pelas seções b, c, d e f.
  const idsPessoas = new Set<string>();
  for (const c of comissoes) idsPessoas.add(c.prestadorId);
  for (const p of pagamentos) idsPessoas.add(p.prestadorId);
  for (const a of aliquotas) if (a.prestadorId) idsPessoas.add(a.prestadorId);
  const { data: perfis } = idsPessoas.size
    ? await db.from("profiles").select("user_id, nome").in("user_id", [...idsPessoas])
    : { data: [] };
  const nomePorId = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));

  const tipos = (tiposRows ?? []).map((t) => ({ slug: t.slug, nome: t.nome }));
  const prestadoresOpcoes = prestadoresDaPraca.map((p) => ({ id: p.user_id, nome: p.nome }));

  // a. Resumo do mês: lançada/recebida são DO MÊS (pela data do serviço); em
  // aberto/aguardando são o saldo CORRENTE da praça (não travam num mês).
  const resumoMesAtual = resumoDoRecibo(doMes(comissoes, mesAtual));
  const saldos = saldosPorPrestador(comissoes);
  const totalEmAbertoPraca = saldos.reduce((acc, s) => acc + s.emAberto, 0);
  const totalInformadaPraca = saldos.reduce((acc, s) => acc + s.informada, 0);

  // b. Pagamentos "informado" aguardam confirmação do Administrador.
  const pagamentosInformados = pagamentos
    .filter((p) => p.status === "informado")
    .map((p) => ({ ...p, nome: nomePorId.get(p.prestadorId) ?? "—" }));

  // c. Saldo por prestador, com o nome.
  const saldosComNome = saldos
    .map((s) => ({ ...s, nome: nomePorId.get(s.prestadorId) ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // d. Recibos do mês: agrupa as comissões do mês por prestador.
  const comissoesDoMes = doMes(comissoes, mesAtual);
  const porPrestador = new Map<string, typeof comissoesDoMes>();
  for (const c of comissoesDoMes) {
    const arr = porPrestador.get(c.prestadorId) ?? [];
    arr.push(c);
    porPrestador.set(c.prestadorId, arr);
  }
  const recibosDoMes = [...porPrestador.entries()]
    .map(([prestadorId, linhas]) => ({ prestadorId, nome: nomePorId.get(prestadorId) ?? "—", resumo: resumoDoRecibo(linhas) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // f. Alíquotas nos 4 níveis (D-044): geral, por tipo, por prestador (com ou sem tipo).
  const aliquotaGeral = aliquotas.find((a) => !a.prestadorId && !a.tipo)?.percentual ?? null;
  const aliquotaPorTipo = new Map(aliquotas.filter((a) => !a.prestadorId && a.tipo).map((a) => [a.tipo as string, a.percentual]));
  const aliquotasPorPrestador = aliquotas
    .filter((a) => a.prestadorId)
    .map((a) => ({
      id: a.id,
      prestadorId: a.prestadorId as string,
      prestadorNome: nomePorId.get(a.prestadorId as string) ?? "—",
      tipo: a.tipo,
      percentual: a.percentual,
    }))
    .sort((a, b) => a.prestadorNome.localeCompare(b.prestadorNome, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      <PracaAbas atual="/praca/financeiro" pracaNome={praca.nome} cidade={praca.cidade} estado={praca.estado} />

      {/* a. Resumo do mês + troca de mês */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold">Financeiro — {mesPorExtenso(mesAtual)}</h1>
          <nav aria-label="Mês do recibo" className="flex items-center gap-2 text-sm">
            <Link href={`?mes=${mesAnteriorStr}`} className="link-touch">
              ‹ {mesPorExtenso(mesAnteriorStr)}
            </Link>
            <span className="text-muted">|</span>
            <span className="font-medium">{mesPorExtenso(mesAtual)}</span>
            <Link href={`?mes=${mesSeguinteStr}`} className="link-touch" aria-label={`Ir para ${mesPorExtenso(mesSeguinteStr)}`}>
              ›
            </Link>
          </nav>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold tabular-nums text-brand">{formatBRL(resumoMesAtual.totalComissao)}</p>
            <p className="text-xs text-muted">lançada no mês</p>
          </div>
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold tabular-nums text-ok">{formatBRL(resumoMesAtual.confirmado)}</p>
            <p className="text-xs text-muted">confirmada no mês</p>
          </div>
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold tabular-nums text-brand">{formatBRL(totalEmAbertoPraca)}</p>
            <p className="text-xs text-muted">em aberto na praça</p>
          </div>
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold tabular-nums text-tint-warn-ink">{formatBRL(totalInformadaPraca)}</p>
            <p className="text-xs text-muted">aguardando confirmação</p>
          </div>
        </div>
      </section>

      {/* b. Pagamentos para confirmar */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pagamentos para confirmar{pagamentosInformados.length > 0 ? ` (${pagamentosInformados.length})` : ""}
        </h2>
        {pagamentosInformados.length === 0 ? (
          <p className="card-vazio">Nenhum pagamento informado aguardando confirmação.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pagamentosInformados.map((p) => (
              <li key={p.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-sm tabular-nums text-brand">{formatBRL(p.valor)}</p>
                  <p className="text-xs text-muted">{informadoEmTexto(p.informadoEm)}</p>
                </div>
                <PagamentoDecidirForm pagamentoId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* c. Saldos por prestador */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Saldos por prestador</h2>
        {saldosComNome.length === 0 ? (
          <p className="card-vazio">Nenhuma comissão lançada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {saldosComNome.map((s) => (
              <li key={s.prestadorId} className="card flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{s.nome}</p>
                  {estaAtrasado(s.maisAntigoEmAberto) ? (
                    <span className="inline-block rounded-full bg-tint-danger px-2.5 py-0.5 text-xs font-medium text-danger">
                      Em aberto há mais de 7 dias
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="font-semibold tabular-nums">{formatBRL(s.emAberto)}</p>
                    <p className="text-xs text-muted">em aberto</p>
                  </div>
                  <div>
                    <p className="font-semibold tabular-nums text-tint-warn-ink">{formatBRL(s.informada)}</p>
                    <p className="text-xs text-muted">informada</p>
                  </div>
                  <div>
                    <p className="font-semibold tabular-nums text-ok">{formatBRL(s.pago)}</p>
                    <p className="text-xs text-muted">pago</p>
                  </div>
                </div>
                {s.emAberto > 0 ? <RegistrarRecebimentoBotao workspaceId={praca.id} prestadorId={s.prestadorId} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* d. Recibos do mês */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recibos de {mesPorExtenso(mesAtual)}</h2>
        {recibosDoMes.length === 0 ? (
          <p className="card-vazio">Nenhum serviço com comissão realizado em {mesPorExtenso(mesAtual)}.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recibosDoMes.map((r) => (
              <li key={r.prestadorId} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{r.nome}</p>
                  <p className="text-xs text-muted">
                    {r.resumo.quantidade} {r.resumo.quantidade === 1 ? "serviço" : "serviços"} · total {formatBRL(r.resumo.totalServicos)}{" "}
                    · comissão {formatBRL(r.resumo.totalComissao)} · confirmado {formatBRL(r.resumo.confirmado)}
                  </p>
                </div>
                <Link
                  href={`/recibo/comissao/${r.prestadorId}/${mesAtual}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  Abrir recibo
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* e. Notas avulsas */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Notas avulsas</h2>
          <NotaAvulsaDialog workspaceId={praca.id} prestadores={prestadoresOpcoes} />
        </div>
        {notas.length === 0 ? (
          <p className="card-vazio">Nenhuma nota avulsa emitida ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notas.map((n) => (
              <li key={n.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    Nº {numeroDaNotaAvulsa(n.numero)} · {n.pagadorNome}
                  </p>
                  <p className="text-sm text-muted">{n.descricao}</p>
                  <p className="text-xs text-muted">
                    {formatBRL(n.valor)} · {formatData(n.recebidoEm)} · {FORMA_LABEL[n.forma] ?? n.forma}
                  </p>
                </div>
                <Link href={`/recibo/nota/${n.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  Abrir recibo
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* f. Alíquotas da comissão */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Alíquotas da comissão</h2>
          <p className="mt-1 text-sm text-muted">
            Vale o mais específico: prestador + tipo &gt; prestador &gt; tipo &gt; geral. Sem nada, 0%. Mudanças valem
            para serviços realizados daqui em diante.
          </p>
        </div>

        <div className="card flex flex-col gap-3">
          <CampoAliquota workspaceId={praca.id} tipo={null} valorInicial={aliquotaGeral} placeholder="0" label="Geral da praça" />
          {tipos.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              {tipos.map((t) => (
                <CampoAliquota
                  key={t.slug}
                  workspaceId={praca.id}
                  tipo={t.slug}
                  valorInicial={aliquotaPorTipo.get(t.slug) ?? null}
                  placeholder="usa a geral"
                  label={t.nome}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">Por prestador</h3>
          <AliquotasPorPrestador workspaceId={praca.id} existentes={aliquotasPorPrestador} prestadores={prestadoresOpcoes} tipos={tipos} />
        </div>
      </section>

      {/* g. Assinatura do Administrador */}
      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sua assinatura nos recibos</h2>
          <p className="mt-1 text-sm text-muted">Desenhe com o mouse, o dedo ou a caneta. Sem assinatura, os recibos usam seu nome em letra cursiva.</p>
        </div>
        <div className="card">
          <AssinaturaPad assinaturaAtual={assinaturaRow?.imagem ?? null} exemplo={user.exemplo} />
        </div>
      </section>
    </div>
  );
}
