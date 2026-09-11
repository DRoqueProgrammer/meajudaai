import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { pracasDoAtor, pracaAlcancada } from "@/lib/admin/alcance";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { reciboMensal } from "@/lib/admin/financeiro";
import { mesValido, mesPorExtenso, intervaloDoMes, numeroDoReciboMensal, valorPorExtenso } from "@/lib/comissao/regras";
import { formatBRL, formatData } from "@/lib/format";
import { dataEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";
import { BarraImpressao } from "@/components/recibo/barra-impressao";
import { Logo } from "@/components/logo";
import { fonteAssinatura } from "@/lib/fonte-assinatura";

const SITUACAO_LABEL: Record<string, string> = { em_aberto: "Em aberto", informada: "Informada", paga: "Paga" };

/** "8" → "8%"; "7.5" → "7,5%" — sem zeros à direita desnecessários. */
function fmtPct(n: number): string {
  return `${(Math.round(n * 100) / 100).toString().replace(".", ",")}%`;
}

/**
 * Recibo mensal da comissão (pedido do Leonardo em 11/09/2026, D-044/D-047):
 * todos os serviços realizados pelo prestador naquela praça e mês, em ordem
 * de data, com a taxa de cada um, os totais, a taxa média ponderada e o que
 * já foi confirmado (Pix recebido pelo Administrador) — mais a assinatura de
 * quem responde pela praça. Rota sem menu (grupo `(documento)`), pra
 * imprimir ou salvar como PDF.
 *
 * Autorização: o PRÓPRIO prestador, ou a administração (Administrador ou
 * SysAdmin) que alcança a praça — nunca outra pessoa. A praça vem de
 * `?praca=`, ou, faltando, da praça ativa do Administrador; para o
 * prestador, da comissão mais recente DELE NESSE MÊS (ele pode ter mudado de
 * cidade, então não é fixo).
 */
export default async function ReciboComissaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ prestadorId: string; mes: string }>;
  searchParams: Promise<{ praca?: string }>;
}) {
  const { prestadorId, mes } = await params;
  const { praca: pracaQuery } = await searchParams;
  if (!mesValido(mes)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = createAdminClient();

  let workspaceId: string | null = pracaQuery || null;
  if (!workspaceId && user.role === "admin") workspaceId = (await pracaAtivaDoAdmin(db))?.id ?? null;
  const daAdministracao = workspaceId != null && pracaAlcancada(user, await pracasDoAtor(db, user), workspaceId) != null;
  if (!daAdministracao) {
    // Sem alcance administrativo, só o PRÓPRIO prestador — e só na praça que o
    // cobrou nesse mês: uma `?praca=` qualquer mostraria o cabeçalho e a
    // assinatura de outra praça (revisão do controller).
    if (user.id !== prestadorId) notFound();
    workspaceId = await pracaDaComissaoDoMes(db, prestadorId, mes);
  }
  if (!workspaceId) notFound();

  const recibo = await reciboMensal(db, workspaceId, prestadorId, mes);
  if (!recibo) notFound();

  const { data: tiposRows } = await db.from("tipos_servico").select("slug, nome");
  const nomeDoTipo = new Map((tiposRows ?? []).map((t) => [t.slug, t.nome]));

  const resumo = recibo.resumo;
  const emitidoEmTexto = `${formatData(dataEmSaoPaulo())} às ${horaEmSaoPaulo()}`;
  const quitado = resumo.pendente === 0 && resumo.totalComissao > 0;
  const rotuloDocumento = resumo.confirmado > 0 ? "Recibo de comissão" : "Demonstrativo de comissão";

  return (
    <>
      <BarraImpressao />
      <div className="recibo-fundo">
        <article className="recibo-folha">
          {quitado ? (
            <span className="recibo-marca-agua" aria-hidden="true">
              QUITADO
            </span>
          ) : null}

          <header className="recibo-cabecalho">
            <div className="recibo-marca">
              <Logo />
              <div>
                <p className="recibo-praca-nome">{recibo.emissor.pracaNome}</p>
                <p className="recibo-praca-sub">{[recibo.emissor.cidade, recibo.emissor.estado].filter(Boolean).join(" / ")}</p>
              </div>
            </div>
            <div className="recibo-meta">
              <p className="recibo-eyebrow">{rotuloDocumento}</p>
              <p className="recibo-numero">{numeroDoReciboMensal(prestadorId, mes)}</p>
              <p className="recibo-linha-meta">Competência: {mesPorExtenso(mes)}</p>
              <p className="recibo-linha-meta">Emitido em {emitidoEmTexto}</p>
            </div>
          </header>

          <div className="recibo-hr" />

          <section className="recibo-partes">
            <div>
              <p className="recibo-rotulo">Recebedor</p>
              <p className="recibo-nome-parte">{recibo.emissor.pracaNome}</p>
              <p className="recibo-sub-parte">Administrador(a) responsável: {recibo.emissor.assinanteNome}</p>
            </div>
            <div>
              <p className="recibo-rotulo">Pagador</p>
              <p className="recibo-nome-parte">{recibo.prestadorNome}</p>
              <p className="recibo-sub-parte">Prestador de serviço</p>
            </div>
          </section>

          {recibo.linhas.length === 0 ? (
            <p className="recibo-vazio">Nenhum serviço com comissão realizado em {mesPorExtenso(mes)}.</p>
          ) : (
            <table className="recibo-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Serviço</th>
                  <th>Cliente</th>
                  <th className="text-right">Valor do serviço</th>
                  <th className="text-right">Taxa</th>
                  <th className="text-right">Comissão</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {recibo.linhas.map((l) => (
                  <tr key={l.id}>
                    <td>{formatData(l.dataServico)}</td>
                    <td>{(l.tipo && nomeDoTipo.get(l.tipo)) || l.tipo || "—"}</td>
                    <td>{(l.clienteId && recibo.clientes[l.clienteId]) || "—"}</td>
                    <td className="text-right tabular">{formatBRL(l.base)}</td>
                    <td className="text-right tabular">{fmtPct(l.percentual)}</td>
                    <td className="text-right tabular">{formatBRL(l.valor)}</td>
                    <td>
                      <span className={`recibo-chip recibo-chip-${l.status}`}>{SITUACAO_LABEL[l.status] ?? l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <section className="recibo-totais-linha-wrap">
            <div className="recibo-totais">
              <div className="recibo-totais-item">
                <span>Total dos serviços</span>
                <span className="tabular">{formatBRL(resumo.totalServicos)}</span>
              </div>
              <div className="recibo-totais-item">
                <span>Taxa média</span>
                <span className="tabular">{fmtPct(resumo.taxaMedia)}</span>
              </div>
              <div className="recibo-totais-item recibo-totais-destaque">
                <span>Comissão total</span>
                <span className="tabular">{formatBRL(resumo.totalComissao)}</span>
              </div>
              <div className="recibo-totais-item recibo-totais-ok">
                <span>Confirmado (Pix recebido)</span>
                <span className="tabular">{formatBRL(resumo.confirmado)}</span>
              </div>
              {resumo.pendente > 0 ? (
                <div className="recibo-totais-item recibo-totais-pendente">
                  <span>Pendente</span>
                  <span className="tabular">{formatBRL(resumo.pendente)}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="recibo-valor-card">
            {resumo.confirmado > 0 ? (
              <p>
                Recebemos de <strong>{recibo.prestadorNome}</strong> a importância de{" "}
                <strong>{formatBRL(resumo.confirmado)}</strong> ({valorPorExtenso(resumo.confirmado)}), referente à comissão
                da plataforma sobre {resumo.quantidade} {resumo.quantidade === 1 ? "serviço realizado" : "serviços realizados"}{" "}
                em {mesPorExtenso(mes)}.{resumo.pendente > 0 ? <> Permanece pendente {formatBRL(resumo.pendente)}.</> : null}
              </p>
            ) : (
              <p>
                Demonstrativo da comissão da plataforma sobre {resumo.quantidade}{" "}
                {resumo.quantidade === 1 ? "serviço realizado" : "serviços realizados"} por{" "}
                <strong>{recibo.prestadorNome}</strong> em {mesPorExtenso(mes)}, no valor de{" "}
                <strong>{formatBRL(resumo.totalComissao)}</strong> ({valorPorExtenso(resumo.totalComissao)}). Nenhum valor
                confirmado até {emitidoEmTexto}.
              </p>
            )}
          </section>

          <section className="recibo-assinatura-linha">
            <div className="recibo-assinatura-bloco">
              {recibo.emissor.assinaturaImagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recibo.emissor.assinaturaImagem} alt="Assinatura" className="recibo-assinatura-img" />
              ) : (
                <p className={`recibo-assinatura-cursiva ${fonteAssinatura.className}`}>{recibo.emissor.assinanteNome}</p>
              )}
              <div className="recibo-assinatura-filete" />
              <p className="recibo-assinatura-nome">{recibo.emissor.assinanteNome}</p>
              <p className="recibo-assinatura-sub">Administrador(a) responsável · {recibo.emissor.pracaNome}</p>
            </div>
          </section>

          <footer className="recibo-rodape">
            <span>Documento gerado eletronicamente pelo Me Ajuda Aí · guarde por 5 anos</span>
            <span>{emitidoEmTexto}</span>
          </footer>
        </article>
      </div>

      <style>{`
        html, body { background:#fff !important; color:#18181b !important; color-scheme:light !important; }
        .recibo-fundo { min-height:100vh; background:#e9edf3; padding:28px 16px 56px; color:#18181b; font-family: var(--font-poppins), Poppins, sans-serif; }
        .recibo-folha { position:relative; width:210mm; min-height:280mm; max-width:100%; margin:0 auto; background:#fff; border:1px solid #d8dee7; border-radius:2px; padding:14mm 16mm; box-shadow:0 1px 2px rgba(15,23,42,.06), 0 10px 28px rgba(15,23,42,.10); overflow:hidden; }
        .recibo-folha::before { content:""; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg, #0D47A1 0%, #0D47A1 82%, #FFC107 82%, #FFC107 100%); }
        .recibo-marca-agua { position:absolute; top:42%; left:50%; transform:translate(-50%,-50%) rotate(-22deg); font-size:150px; font-weight:700; color:#0D47A1; opacity:.05; letter-spacing:.1em; pointer-events:none; user-select:none; z-index:0; }
        .recibo-cabecalho { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:12px; position:relative; z-index:1; }
        .recibo-marca { display:flex; align-items:center; gap:10px; }
        .recibo-praca-nome { font-size:16px; font-weight:600; line-height:1.15; color:#111827; }
        .recibo-praca-sub { font-size:11px; color:#52525b; margin-top:1px; }
        .recibo-meta { text-align:right; }
        .recibo-eyebrow { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; }
        .recibo-numero { font-family:ui-monospace, Menlo, monospace; font-size:13px; letter-spacing:-.02em; margin-top:4px; color:#111827; }
        .recibo-linha-meta { font-size:11px; color:#52525b; margin-top:2px; }
        .recibo-hr { height:1px; background:linear-gradient(90deg, transparent 0%, #d4d4d8 8%, #d4d4d8 92%, transparent 100%); margin:2px 0 14px; position:relative; z-index:1; }
        .recibo-partes { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; position:relative; z-index:1; }
        .recibo-rotulo { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; margin-bottom:3px; }
        .recibo-nome-parte { font-size:15px; font-weight:500; color:#111827; }
        .recibo-sub-parte { font-size:11.5px; color:#52525b; margin-top:2px; }
        .recibo-vazio { font-size:13px; color:#71717a; padding:16px 0; position:relative; z-index:1; }
        .recibo-tabela { width:100%; border-collapse:collapse; font-size:11.5px; position:relative; z-index:1; }
        .recibo-tabela thead { display:table-header-group; }
        .recibo-tabela th { text-align:left; font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:#71717a; font-weight:600; padding:6px 8px; border-bottom:1.5px solid #d4d4d8; }
        .recibo-tabela td { padding:6px 8px; border-bottom:1px solid #eceef1; color:#27272a; }
        .recibo-tabela tr { break-inside:avoid; }
        .recibo-tabela tbody tr:nth-child(even) { background:#f8fafc; }
        .recibo-tabela .text-right { text-align:right; }
        .tabular { font-variant-numeric:tabular-nums; }
        .recibo-chip { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:600; }
        .recibo-chip-paga { background:#e7f5e9; color:#2e7d32; }
        .recibo-chip-informada { background:#fff5da; color:#8a6d00; }
        .recibo-chip-em_aberto { background:#eef1f5; color:#5b6472; }
        .recibo-totais-linha-wrap { display:flex; justify-content:flex-end; margin:16px 0; position:relative; z-index:1; }
        .recibo-totais { width:280px; display:flex; flex-direction:column; gap:5px; border:1px solid #e4e4e7; border-radius:6px; padding:10px 14px; }
        .recibo-totais-item { display:flex; justify-content:space-between; font-size:12px; color:#3f3f46; }
        .recibo-totais-destaque { font-weight:600; color:#111827; border-top:1px solid #e4e4e7; padding-top:5px; margin-top:2px; }
        .recibo-totais-ok { color:#2e7d32; font-weight:600; }
        .recibo-totais-pendente { color:#b45309; font-weight:600; }
        .recibo-valor-card { background:#ecfdf5; border:1px solid #6ee7b7; border-radius:4px; padding:12px 18px; margin:0 0 16px; font-size:13px; line-height:1.5; color:#134e2b; position:relative; z-index:1; }
        .recibo-assinatura-linha { margin-top:8px; display:flex; justify-content:flex-end; position:relative; z-index:1; }
        .recibo-assinatura-bloco { width:260px; text-align:center; }
        .recibo-assinatura-img { max-height:56px; max-width:220px; margin:0 auto 2px; object-fit:contain; }
        .recibo-assinatura-cursiva { font-size:30px; line-height:1.1; color:#111827; margin-bottom:2px; }
        .recibo-assinatura-filete { height:1px; background:#18181b; margin:0 auto; width:100%; }
        .recibo-assinatura-nome { margin-top:6px; font-size:13px; font-weight:500; color:#111827; }
        .recibo-assinatura-sub { font-size:11px; color:#52525b; }
        .recibo-rodape { margin-top:18px; padding-top:10px; border-top:1px solid #e4e4e7; display:flex; justify-content:space-between; gap:12px; font-size:9.5px; color:#71717a; position:relative; z-index:1; }
        @media print {
          html, body { background:#fff !important; margin:0 !important; padding:0 !important; }
          .no-print { display:none !important; }
          .recibo-fundo { background:#fff !important; padding:0 !important; min-height:0 !important; }
          .recibo-folha { width:auto; min-height:0; margin:0; border:none; border-radius:0; box-shadow:none; max-width:none; }
          @page { size:A4; margin:12mm; }
        }
      `}</style>
    </>
  );
}

type LinhaWorkspacePrestador = { workspace_id: string; created_at: string; servicos: { agenda_slots: { data: string } | null } | null };

/**
 * A praça que cobrou o prestador NESTE mês (ele pode ter mudado de cidade —
 * não dá pra assumir a praça atual dele): consulta `comissoes` direto pela
 * chave de serviço, filtra pela data do serviço (não `comissoesDaPraca`, que
 * já exige a praça — é exatamente o que ainda não temos aqui) e pega a mais
 * recente dentro do mês.
 */
async function pracaDaComissaoDoMes(
  db: ReturnType<typeof createAdminClient>,
  prestadorId: string,
  mes: string,
): Promise<string | null> {
  const { data } = await db
    .from("comissoes")
    .select("workspace_id, created_at, servicos(agenda_slots(data))")
    .eq("prestador_id", prestadorId);
  const linhas = (data ?? []) as unknown as LinhaWorkspacePrestador[];
  const { inicio, fim } = intervaloDoMes(mes);
  const doMes = linhas
    .filter((l) => {
      const d = l.servicos?.agenda_slots?.data;
      return d != null && d >= inicio && d <= fim;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return doMes[0]?.workspace_id ?? null;
}
