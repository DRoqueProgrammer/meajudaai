import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import {
  comissoesDaPraca,
  saldosPorPrestador,
  pagamentosDaPraca,
  aliquotasDaPraca,
  notasAvulsasDaPraca,
  type ComissaoDetalhada,
} from "@/lib/admin/financeiro";
import { listarPrestadoresDaPraca } from "@/lib/admin/consultas";
import { listarTiposServico } from "@/lib/tipos-servico";
import { mesPorExtenso, resumoDoRecibo, numeroDaNotaAvulsa, estaAtrasado } from "@/lib/comissao/regras";
import { montarMatriz, filtrarMatriz, lerAno, lerSituacao, anosDisponiveis, itemAtrasado, type ItemDaPessoa } from "@/lib/financeiro/matriz";
import { formatBRL, formatData } from "@/lib/format";
import { hojeEmSaoPaulo, FUSO } from "@/lib/datas";
import { MatrizFinanceira } from "@/components/financeiro/matriz-financeira";
import { FiltrosFinanceiro } from "@/components/financeiro/filtros-financeiro";
import { alternarComissaoPagaAction, marcarMesPagoAction } from "@/lib/actions/comissao";
import { PagamentoDecidirForm } from "@/components/financeiro/pagamento-decidir-form";
import { RegistrarRecebimentoBotao } from "@/components/financeiro/registrar-recebimento-botao";
import { NotaAvulsaDialog } from "@/components/financeiro/nota-avulsa-dialog";
import { CampoAliquota, AliquotasPorPrestador } from "@/components/financeiro/aliquotas-form";
import { AssinaturaPad } from "@/components/financeiro/assinatura-pad";

const FORMA_LABEL: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro" };

/** Percentual pt-BR sem zero à direita desnecessário: 7.5 → "7,5%"; 8 → "8%". */
function fmtPct(n: number): string {
  return `${(Math.round(n * 100) / 100).toString().replace(".", ",")}%`;
}

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false });
/** "informado em 09/09 às 14:32", no fuso do produto — não no UTC do servidor. */
function informadoEmTexto(iso: string): string {
  const d = new Date(iso);
  return `informado em ${fmtDia.format(d)} às ${fmtHora.format(d)}`;
}

/** Filtros e sub-aba que vêm da URL (D-048: "nas abas Financeiro precisa ter filtro"). */
interface FiltrosURL {
  ano?: string;
  situacao?: string;
  pessoa?: string;
  tipo?: string;
  q?: string;
  aba?: string;
}

const SUB_ABAS = [
  { chave: "grade", rotulo: "Grade" },
  { chave: "entradas", rotulo: "Entradas" },
  { chave: "pendencias", rotulo: "Pendências" },
  { chave: "recibos", rotulo: "Recibos" },
  { chave: "ajustes", rotulo: "Ajustes" },
] as const;
type SubAba = (typeof SUB_ABAS)[number]["chave"];

/** Href de uma sub-aba preservando os filtros ativos — só troca `?aba=` (omitido na Grade, a padrão). */
function hrefSubAba(filtros: FiltrosURL, aba: SubAba): string {
  const sp = new URLSearchParams();
  if (filtros.ano) sp.set("ano", filtros.ano);
  if (filtros.situacao) sp.set("situacao", filtros.situacao);
  if (filtros.pessoa) sp.set("pessoa", filtros.pessoa);
  if (filtros.tipo) sp.set("tipo", filtros.tipo);
  if (filtros.q) sp.set("q", filtros.q);
  if (aba !== "grade") sp.set("aba", aba);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

const TOM_KPI: Record<"brand" | "ok" | "danger" | "warn" | "ink", string> = {
  brand: "text-brand",
  ok: "text-ok",
  danger: "text-danger",
  warn: "text-tint-warn-ink",
  ink: "text-ink",
};

/** Um cartão de KPI do resumo do ano — cor conforme o significado (D-048: recebida verde, atraso vermelho, aguardando âmbar). */
function Kpi({ label, valor, tom }: { label: string; valor: number; tom: keyof typeof TOM_KPI }) {
  return (
    <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${TOM_KPI[tom]}`}>{formatBRL(valor)}</p>
      <p className="text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}

/**
 * Aba Financeiro do Administrador, reestruturada em GRADE (D-048, molde
 * `ManagementGrid`/`finance-body` do amazing-school e filtros na URL do
 * careconnect): uma linha por prestador, uma coluna por mês, célula com a
 * comissão do mês e o ✓ OK/✗ não recebido por serviço no hover; "marcar o mês
 * como pago" dá o OK em todos os serviços do mês de uma vez. Só ENTRADAS do
 * workspace (comissões pagas + notas avulsas) — nunca saída. Só o
 * Administrador (não o SysAdmin — ele modera a plataforma, não uma praça
 * específica), sempre recortado pela praça ATIVA dele.
 *
 * Filtros (ano, situação, prestador, tipo de serviço, busca) e sub-aba vêm
 * todos da URL — a página lê, filtra no servidor e devolve HTML pronto;
 * funciona com o botão voltar e dá para mandar o link filtrado. Sub-abas:
 * Grade (padrão), Entradas (livro-caixa do ano), Pendências (pagamentos
 * informados e saldos em aberto), Recibos (por prestador × mês, e as notas
 * avulsas) e Ajustes (alíquotas e assinatura).
 */
export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosURL>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) return <SemPraca />;

  const sp = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const anoCorrente = Number(hoje.slice(0, 4));

  const sb = await createServerClient();
  const [comissoes, pagamentos, aliquotas, notas, prestadoresDaPraca, tipos, { data: assinaturaRow }] = await Promise.all([
    comissoesDaPraca(db, praca.id),
    pagamentosDaPraca(db, praca.id),
    aliquotasDaPraca(db, praca.id),
    notasAvulsasDaPraca(db, praca.id),
    listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo),
    listarTiposServico(sb),
    sb.from("assinaturas").select("imagem").eq("user_id", user.id).maybeSingle(),
  ]);

  // Nomes de quem só aparece como prestador ou cliente (comissão, pagamento,
  // alíquota) — uma consulta só, reaproveitada por todas as sub-abas.
  const idsPessoas = new Set<string>();
  for (const c of comissoes) {
    idsPessoas.add(c.prestadorId);
    if (c.clienteId) idsPessoas.add(c.clienteId);
  }
  for (const p of pagamentos) idsPessoas.add(p.prestadorId);
  for (const a of aliquotas) if (a.prestadorId) idsPessoas.add(a.prestadorId);
  const { data: perfis } = idsPessoas.size
    ? await db.from("profiles").select("user_id, nome").in("user_id", [...idsPessoas])
    : { data: [] };
  const nomePorId = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));
  const nomeDoTipo = new Map(tipos.map((t) => [t.slug, t.nome]));
  const prestadoresOpcoes = prestadoresDaPraca.map((p) => ({ id: p.user_id, nome: p.nome }));

  // Filtros da URL (D-048) ---------------------------------------------------
  const ano = lerAno(sp.ano, anoCorrente);
  const situacao = lerSituacao(sp.situacao);
  const pessoasComComissao = [...new Set(comissoes.map((c) => c.prestadorId))]
    .map((id) => ({ id, nome: nomePorId.get(id) ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const pessoaId = sp.pessoa && pessoasComComissao.some((p) => p.id === sp.pessoa) ? sp.pessoa : undefined;
  const tipoSlug = sp.tipo && tipos.some((t) => t.slug === sp.tipo) ? sp.tipo : undefined;
  const busca = (sp.q ?? "").trim();
  const abaAtual: SubAba = SUB_ABAS.some((a) => a.chave === sp.aba) ? (sp.aba as SubAba) : "grade";
  const anos = anosDisponiveis(
    comissoes.map((c) => c.dataServico).filter((d): d is string => Boolean(d)),
    anoCorrente,
  );

  // Grade: uma comissão = um item; pessoa e tipo recortam ANTES de montar as
  // linhas do ano, situação e busca recortam DEPOIS (na própria grade).
  const itensGrade: ItemDaPessoa[] = comissoes
    .filter((c): c is ComissaoDetalhada & { dataServico: string } => c.dataServico != null)
    .filter((c) => !pessoaId || c.prestadorId === pessoaId)
    .filter((c) => !tipoSlug || c.tipo === tipoSlug)
    .map((c) => {
      const clienteNome = (c.clienteId && nomePorId.get(c.clienteId)) || "Cliente";
      return {
        id: c.id,
        pessoaId: c.prestadorId,
        pessoaNome: nomePorId.get(c.prestadorId) ?? "—",
        data: c.dataServico,
        titulo: (c.tipo && nomeDoTipo.get(c.tipo)) || c.tipo || "Serviço",
        detalhe: `${clienteNome} · ${fmtPct(c.percentual)} de ${formatBRL(c.base)}`,
        valor: c.valor,
        estado: c.status === "paga" ? "ok" : c.status === "informada" ? "informado" : "pendente",
        reciboHref: `/recibo/comissao/${c.prestadorId}/${c.dataServico.slice(0, 7)}?praca=${praca.id}&servico=${c.servicoId}`,
      };
    });
  const linhasGrade = filtrarMatriz(montarMatriz(itensGrade, ano), { busca, situacao }, hoje);

  // KPIs do ano filtrado (D-048): a comissão lançada se reparte inteira entre
  // recebida, a receber, em atraso (7+ dias, mesma régua da matriz) e
  // aguardando OK — nenhuma sobra fora dessas quatro.
  const comissoesDoAno = comissoes.filter(
    (c): c is ComissaoDetalhada & { dataServico: string } => c.dataServico != null && c.dataServico.startsWith(`${ano}-`),
  );
  const notasDoAno = notas.filter((n) => n.recebidoEm.startsWith(`${ano}-`));
  const cent = (v: number) => Math.round(v * 100);
  let lancadaC = 0;
  let recebidaC = 0;
  let aReceberC = 0;
  let atrasoC = 0;
  let aguardandoC = 0;
  for (const c of comissoesDoAno) {
    const v = cent(c.valor);
    lancadaC += v;
    if (c.status === "paga") recebidaC += v;
    else if (c.status === "informada") aguardandoC += v;
    else if (itemAtrasado({ estado: "pendente", data: c.dataServico }, hoje)) atrasoC += v;
    else aReceberC += v;
  }
  const kpis = {
    lancada: lancadaC / 100,
    recebida: recebidaC / 100,
    aReceber: aReceberC / 100,
    atraso: atrasoC / 100,
    entradasAvulsas: notasDoAno.reduce((s, n) => s + cent(n.valor), 0) / 100,
    aguardando: aguardandoC / 100,
  };

  // Entradas: livro-caixa do ano — comissões pagas (data = quando o Adm deu o
  // OK) + notas avulsas (data = quando recebeu), mais recente primeiro.
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const buscaNorm = norm(busca);
  interface Lancamento {
    id: string;
    data: string;
    pessoa: string;
    descricao: string;
    valor: number;
    href?: string;
  }
  const entradasComissao: Lancamento[] = comissoes
    .filter((c): c is ComissaoDetalhada & { pagaEm: string } => c.status === "paga" && c.pagaEm != null && c.pagaEm.startsWith(`${ano}-`))
    .filter((c) => !pessoaId || c.prestadorId === pessoaId)
    .map((c) => ({
      id: `c-${c.id}`,
      data: c.pagaEm,
      pessoa: nomePorId.get(c.prestadorId) ?? "—",
      descricao: `Comissão · ${(c.tipo && nomeDoTipo.get(c.tipo)) || c.tipo || "serviço"}`,
      valor: c.valor,
      href: c.dataServico ? `/recibo/comissao/${c.prestadorId}/${c.dataServico.slice(0, 7)}?praca=${praca.id}&servico=${c.servicoId}` : undefined,
    }));
  const entradasNota: Lancamento[] = notasDoAno
    .filter((n) => !pessoaId || n.prestadorId === pessoaId)
    .map((n) => ({
      id: `n-${n.id}`,
      data: n.recebidoEm,
      pessoa: n.pagadorNome,
      descricao: `${n.descricao} · ${FORMA_LABEL[n.forma] ?? n.forma}`,
      valor: n.valor,
      href: `/recibo/nota/${n.id}`,
    }));
  const entradas = [...entradasComissao, ...entradasNota]
    .filter((e) => !buscaNorm || norm(e.pessoa).includes(buscaNorm) || norm(e.descricao).includes(buscaNorm))
    .sort((a, b) => b.data.localeCompare(a.data));
  const totalEntradas = entradas.reduce((s, e) => s + cent(e.valor), 0) / 100;

  // Pendências: pagamentos "informado" aguardando decisão + saldo por prestador.
  const pagamentosInformados = pagamentos
    .filter((p) => p.status === "informado")
    .filter((p) => !pessoaId || p.prestadorId === pessoaId)
    .map((p) => ({ ...p, nome: nomePorId.get(p.prestadorId) ?? "—" }));
  const saldosComNome = saldosPorPrestador(comissoes)
    .filter((s) => !pessoaId || s.prestadorId === pessoaId)
    .map((s) => ({ ...s, nome: nomePorId.get(s.prestadorId) ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Recibos: comissões do ano agrupadas por prestador × mês, mais o link de cada nota avulsa.
  const porPrestadorMes = new Map<string, ComissaoDetalhada[]>();
  for (const c of comissoesDoAno) {
    if (pessoaId && c.prestadorId !== pessoaId) continue;
    const mes = c.dataServico.slice(0, 7);
    const chave = `${c.prestadorId}|${mes}`;
    const arr = porPrestadorMes.get(chave) ?? [];
    arr.push(c);
    porPrestadorMes.set(chave, arr);
  }
  const recibosDoAno = [...porPrestadorMes.entries()]
    .map(([chave, linhasMes]) => {
      const [pId, mes] = chave.split("|") as [string, string];
      return { prestadorId: pId, mes, nome: nomePorId.get(pId) ?? "—", resumo: resumoDoRecibo(linhasMes) };
    })
    .sort((a, b) => (a.mes === b.mes ? a.nome.localeCompare(b.nome, "pt-BR") : b.mes.localeCompare(a.mes)));
  const notasDoAnoFiltradas = notasDoAno.filter((n) => !pessoaId || n.prestadorId === pessoaId);

  // Ajustes: alíquotas nos 4 níveis (D-044) — geral, por tipo, por prestador (com ou sem tipo).
  const aliquotaGeral = aliquotas.find((a) => !a.prestadorId && !a.tipo)?.percentual ?? null;
  const aliquotaPorTipo = new Map(aliquotas.filter((a) => !a.prestadorId && a.tipo).map((a) => [a.tipo as string, a.percentual]));
  const aliquotasPorPrestadorList = aliquotas
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

      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Financeiro — {ano}</h1>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="comissão lançada" valor={kpis.lancada} tom="brand" />
          <Kpi label="recebida (OK)" valor={kpis.recebida} tom="ok" />
          <Kpi label="a receber" valor={kpis.aReceber} tom="ink" />
          <Kpi label="em atraso (7+ dias)" valor={kpis.atraso} tom="danger" />
          <Kpi label="entradas avulsas" valor={kpis.entradasAvulsas} tom="brand" />
          <Kpi label="aguardando OK" valor={kpis.aguardando} tom="warn" />
        </div>
      </section>

      <FiltrosFinanceiro anos={anos} pessoas={pessoasComComissao} rotuloPessoa="prestador" tipos={tipos} />

      <nav aria-label="Sub-abas do Financeiro" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex min-w-max gap-2">
          {SUB_ABAS.map((a) => (
            <li key={a.chave}>
              <Link
                href={`/praca/financeiro${hrefSubAba(sp, a.chave)}`}
                className={`chip ${abaAtual === a.chave ? "chip-on" : "chip-off"}`}
                aria-current={abaAtual === a.chave ? "page" : undefined}
              >
                {a.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {abaAtual === "grade" ? (
        <MatrizFinanceira
          linhas={linhasGrade}
          ano={ano}
          hoje={hoje}
          rotuloPessoa="Prestador"
          rotulos={{ ok: "Pago", pendente: "Não recebido", informado: "o prestador disse que pagou" }}
          sufixoValor="de comissão"
          alternarItem={alternarComissaoPagaAction}
          marcarMesPago={marcarMesPagoAction.bind(null, praca.id)}
          perfilHref="/perfil/{pessoa}"
          reciboMesHref={"/recibo/comissao/{pessoa}/{mes}?praca=" + praca.id}
          vazio="Nenhuma comissão encontrada com estes filtros."
        />
      ) : null}

      {abaAtual === "entradas" ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Entradas de {ano}</h2>
              <p className="text-xl font-bold tabular-nums text-ok">{formatBRL(totalEntradas)}</p>
            </div>
            <NotaAvulsaDialog workspaceId={praca.id} prestadores={prestadoresOpcoes} />
          </div>
          {entradas.length === 0 ? (
            <p className="card-vazio">Nenhuma entrada em {ano} com estes filtros.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entradas.map((e) => (
                <li key={e.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{e.pessoa}</p>
                    <p className="text-xs text-muted">
                      {e.descricao} · {formatData(e.data.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums text-ok">{formatBRL(e.valor)}</span>
                    {e.href ? (
                      <Link href={e.href} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                        Recibo
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {abaAtual === "pendencias" ? (
        <div className="flex flex-col gap-6">
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
        </div>
      ) : null}

      {abaAtual === "recibos" ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recibos de {ano}</h2>
              <NotaAvulsaDialog workspaceId={praca.id} prestadores={prestadoresOpcoes} />
            </div>
            {recibosDoAno.length === 0 ? (
              <p className="card-vazio">Nenhum serviço com comissão realizado em {ano} com estes filtros.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recibosDoAno.map((r) => (
                  <li key={`${r.prestadorId}-${r.mes}`} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {r.nome} · {mesPorExtenso(r.mes)}
                      </p>
                      <p className="text-xs text-muted">
                        {r.resumo.quantidade} {r.resumo.quantidade === 1 ? "serviço" : "serviços"} · total {formatBRL(r.resumo.totalServicos)}{" "}
                        · comissão {formatBRL(r.resumo.totalComissao)} · confirmado {formatBRL(r.resumo.confirmado)}
                      </p>
                    </div>
                    <Link href={`/recibo/comissao/${r.prestadorId}/${r.mes}?praca=${praca.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      Abrir recibo
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Notas avulsas</h2>
            {notasDoAnoFiltradas.length === 0 ? (
              <p className="card-vazio">Nenhuma nota avulsa emitida em {ano} com estes filtros.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notasDoAnoFiltradas.map((n) => (
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
        </div>
      ) : null}

      {abaAtual === "ajustes" ? (
        <div className="flex flex-col gap-6">
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
                <div className="grid gap-4 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <AliquotasPorPrestador workspaceId={praca.id} existentes={aliquotasPorPrestadorList} prestadores={prestadoresOpcoes} tipos={tipos} />
            </div>
          </section>

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
      ) : null}
    </div>
  );
}
