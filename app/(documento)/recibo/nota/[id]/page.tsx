import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { pracasDoAtor, pracaAlcancada } from "@/lib/admin/alcance";
import { notaAvulsaPorId, emissorDoRecibo } from "@/lib/admin/financeiro";
import { numeroDaNotaAvulsa, valorPorExtenso } from "@/lib/comissao/regras";
import { formatBRL, formatData } from "@/lib/format";
import { dataEmSaoPaulo, horaEmSaoPaulo } from "@/lib/datas";
import { AVISO_SEM_VALOR_FISCAL } from "@/lib/financeiro/avisos";
import { BarraImpressao } from "@/components/recibo/barra-impressao";
import { Logo } from "@/components/logo";
import { fonteAssinatura } from "@/lib/fonte-assinatura";

const FORMA_LABEL: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro" };

/**
 * Recibo de uma nota avulsa (pedido do Leonardo em 11/09/2026, D-047):
 * recebimento fora da comissão automática — taxa de cadastro, material,
 * comissão paga em dinheiro. Meia folha A4, mesma linguagem visual do recibo
 * mensal. Rota sem menu, pra imprimir ou salvar como PDF.
 *
 * Autorização: a administração (Administrador ou SysAdmin) que alcança a
 * praça da nota, ou o prestador pagador (`nota.prestadorId`) — nunca outra
 * pessoa, mesmo sendo alguém de fora que só "pagou" (sem conta ligada, não
 * há como logar como ela).
 */
export default async function ReciboNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = createAdminClient();
  const nota = await notaAvulsaPorId(db, id);
  if (!nota) notFound();

  const podeVer =
    (nota.prestadorId != null && nota.prestadorId === user.id) ||
    pracaAlcancada(user, await pracasDoAtor(db, user), nota.workspaceId) != null;
  if (!podeVer) notFound();

  const emissor = await emissorDoRecibo(db, nota.workspaceId, nota.emitidoPor);
  if (!emissor) notFound();

  const numero = numeroDaNotaAvulsa(nota.numero);
  const emitidoEmTexto = `${formatData(dataEmSaoPaulo())} às ${horaEmSaoPaulo()}`;

  return (
    <>
      <BarraImpressao />
      <div className="na-fundo">
        <article className="na-folha">
          <header className="na-cabecalho">
            <div className="na-marca">
              <Logo />
              <div>
                <p className="na-praca-nome">{emissor.pracaNome}</p>
                <p className="na-praca-sub">{[emissor.cidade, emissor.estado].filter(Boolean).join(" / ")}</p>
              </div>
            </div>
            <div className="na-meta">
              <p className="na-eyebrow">Recibo avulso</p>
              <p className="na-numero">Nº {numero}</p>
              <p className="na-linha-meta">Emitido em {emitidoEmTexto}</p>
            </div>
          </header>

          <div className="na-hr" />

          <section className="na-secao">
            <p className="na-rotulo">Recebemos de</p>
            <p className="na-nome-parte">{nota.pagadorNome}</p>
          </section>

          <section className="na-valor-card">
            <p className="na-valor-rotulo">A importância de</p>
            <p className="na-valor-numero tabular">{formatBRL(nota.valor)}</p>
            <p className="na-valor-extenso">({valorPorExtenso(nota.valor)})</p>
          </section>

          <section className="na-secao">
            <p className="na-rotulo">Referente a</p>
            <p className="na-corpo">{nota.descricao}</p>
            <p className="na-muted">
              {FORMA_LABEL[nota.forma] ?? nota.forma} · recebido em {formatData(nota.recebidoEm)}
            </p>
          </section>

          <section className="na-declaracao">
            <p>
              Para clareza e devida quitação, firmamos o presente recibo comprovando o recebimento da importância
              acima, referente ao descrito, dando plena e geral quitação.
            </p>
          </section>

          <section className="na-assinatura-linha">
            <div className="na-assinatura-bloco">
              {emissor.assinaturaImagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emissor.assinaturaImagem} alt="Assinatura" className="na-assinatura-img" />
              ) : (
                <p className={`na-assinatura-cursiva ${fonteAssinatura.className}`}>{emissor.assinanteNome}</p>
              )}
              <div className="na-assinatura-filete" />
              <p className="na-assinatura-nome">{emissor.assinanteNome}</p>
              <p className="na-assinatura-sub">Administrador(a) responsável · {emissor.pracaNome}</p>
            </div>
          </section>

          <footer className="na-rodape">
            <span>Documento gerado eletronicamente pelo Me Ajuda Aí · guarde por 5 anos</span>
            <span>{emitidoEmTexto}</span>
          </footer>
          <p className="na-aviso-fiscal">{AVISO_SEM_VALOR_FISCAL}</p>
        </article>
      </div>

      <style>{`
        html, body { background:#fff !important; color:#18181b !important; color-scheme:light !important; }
        .na-fundo { min-height:100vh; background:#e9edf3; padding:28px 16px 56px; color:#18181b; font-family: var(--font-poppins), Poppins, sans-serif; }
        .na-folha { position:relative; width:210mm; min-height:148.5mm; max-width:100%; margin:0 auto; background:#fff; border:1px solid #d8dee7; border-radius:2px; padding:11mm 16mm; box-shadow:0 1px 2px rgba(15,23,42,.06), 0 10px 28px rgba(15,23,42,.10); overflow:hidden; }
        .na-folha::before { content:""; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg, #0D47A1 0%, #0D47A1 82%, #FFC107 82%, #FFC107 100%); }
        .na-cabecalho { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:12px; position:relative; z-index:1; }
        .na-marca { display:flex; align-items:center; gap:10px; }
        .na-praca-nome { font-size:16px; font-weight:600; line-height:1.15; color:#111827; }
        .na-praca-sub { font-size:11px; color:#52525b; margin-top:1px; }
        .na-meta { text-align:right; }
        .na-eyebrow { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; }
        .na-numero { font-family:ui-monospace, Menlo, monospace; font-size:13px; letter-spacing:-.02em; margin-top:4px; color:#111827; }
        .na-linha-meta { font-size:11px; color:#52525b; margin-top:2px; }
        .na-hr { height:1px; background:linear-gradient(90deg, transparent 0%, #d4d4d8 12%, #d4d4d8 88%, transparent 100%); margin:4px 0 14px; position:relative; z-index:1; }
        .na-secao { margin-bottom:12px; position:relative; z-index:1; }
        .na-rotulo { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; margin-bottom:3px; }
        .na-nome-parte { font-size:17px; font-weight:500; color:#111827; }
        .na-corpo { font-size:14px; line-height:1.45; color:#27272a; }
        .na-muted { font-size:12px; color:#52525b; margin-top:2px; }
        .na-valor-card { background:#ecfdf5; border:1px solid #6ee7b7; border-radius:4px; padding:12px 18px; margin:14px 0; position:relative; z-index:1; }
        .na-valor-rotulo { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#065f46; margin-bottom:3px; }
        .na-valor-numero { font-size:28px; font-weight:600; letter-spacing:-.02em; color:#18181b; }
        .na-valor-extenso { font-style:italic; font-size:13px; color:#52525b; margin-top:3px; }
        .na-declaracao { font-size:12.5px; line-height:1.5; color:#27272a; margin:12px 0 14px; position:relative; z-index:1; }
        .na-assinatura-linha { margin-top:20px; display:flex; justify-content:flex-end; position:relative; z-index:1; }
        .na-assinatura-bloco { width:260px; text-align:center; }
        .na-assinatura-img { max-height:56px; max-width:220px; margin:0 auto 2px; object-fit:contain; }
        .na-assinatura-cursiva { font-size:28px; line-height:1.1; color:#111827; margin-bottom:2px; }
        .na-assinatura-filete { height:1px; background:#18181b; margin:0 auto; width:100%; }
        .na-assinatura-nome { margin-top:6px; font-size:13px; font-weight:500; color:#111827; }
        .na-assinatura-sub { font-size:11px; color:#52525b; }
        .na-rodape { margin-top:16px; padding-top:10px; border-top:1px solid #e4e4e7; display:flex; justify-content:space-between; gap:12px; font-size:10px; color:#71717a; position:relative; z-index:1; }
        .na-aviso-fiscal { margin-top:6px; font-size:9px; line-height:1.4; color:#a1a1aa; text-align:center; position:relative; z-index:1; }
        @media print {
          html, body { background:#fff !important; margin:0 !important; padding:0 !important; }
          .no-print { display:none !important; }
          .na-fundo { background:#fff !important; padding:0 !important; min-height:0 !important; }
          .na-folha { width:auto; min-height:0; margin:0; border:none; border-radius:0; box-shadow:none; padding:10mm 14mm; max-width:none; }
          @page { size:210mm 148.5mm; margin:0; }
        }
      `}</style>
    </>
  );
}
