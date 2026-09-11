import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { formatBRL, formatData } from "@/lib/format";
import { valorPorExtenso, numeroDaNotaAvulsa } from "@/lib/comissao/regras";
import { AVISO_SEM_VALOR_FISCAL, AVISO_MARKETPLACE } from "@/lib/financeiro/avisos";
import { nomeCategoria } from "@/lib/categorias";
import { papelLabel } from "@/lib/papel-label";
import { BarraImpressao } from "@/components/recibo/barra-impressao";
import { Logo } from "@/components/logo";
import { fonteAssinatura } from "@/lib/fonte-assinatura";
import { AjustarRecebimento } from "@/components/recibo/ajustar-recebimento";
import { CompartilharReciboWhatsApp } from "@/components/recibo/compartilhar-recibo-whatsapp";

const FORMA_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

/**
 * Recibo que o PRESTADOR manda ao cliente pelo WhatsApp (D-048, pedido do
 * Leonardo em 11/09/2026): meia folha A4, papel sempre claro, sem valor
 * fiscal e sem responsabilidade da Me Ajuda Aí (mero marketplace) — o
 * cliente NUNCA vê esta rota pelo app, só recebe a imagem ou o link direto
 * por fora. A sessão é quem decide o que aparece: a RLS de `recebimentos`
 * (migration 0059) só devolve a linha se `prestador_id = auth.uid()`, então
 * outro prestador (ou o cliente) tentando este id cai no `notFound()` — nunca
 * "sem permissão", que revelaria que o id existe.
 */
export default async function ReciboRecebimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();

  const { data: recebimento } = await sb
    .from("recebimentos")
    .select("id, numero, prestador_id, servico_id, cliente_id, pagador_nome, descricao, valor, forma, recebido_em")
    .eq("id", id)
    .maybeSingle();
  if (!recebimento) notFound();

  const { data: prestador } = await sb
    .from("profiles")
    .select("nome, categoria, genero")
    .eq("user_id", recebimento.prestador_id)
    .maybeSingle();
  if (!prestador) notFound();

  // Serviço vinculado (se houver): tipo e a data do horário — pra completar
  // o "referente a" com o que foi feito e quando, além da descrição gravada.
  let referenciaServico: string | null = null;
  if (recebimento.servico_id) {
    const { data: servico } = await sb
      .from("servicos")
      .select("tipo, slot_id")
      .eq("id", recebimento.servico_id)
      .maybeSingle();
    if (servico) {
      const [{ data: tipoRow }, { data: slot }] = await Promise.all([
        sb.from("tipos_servico").select("nome").eq("slug", servico.tipo).maybeSingle(),
        sb.from("agenda_slots").select("data").eq("id", servico.slot_id).maybeSingle(),
      ]);
      const tipoNome = tipoRow?.nome ?? servico.tipo;
      referenciaServico = slot ? `serviço de ${tipoNome} em ${formatData(slot.data)}` : `serviço de ${tipoNome}`;
    }
  }

  const numero = `P-${numeroDaNotaAvulsa(recebimento.numero)}`;
  const valor = Number(recebimento.valor);
  const funcao = prestador.categoria ? nomeCategoria(prestador.categoria) : papelLabel("prestador_servico", prestador.genero);
  const formaLabel = FORMA_LABEL[recebimento.forma] ?? recebimento.forma;
  const referenteA = referenciaServico ? `${recebimento.descricao} — ${referenciaServico}` : recebimento.descricao;
  const dataTexto = formatData(recebimento.recebido_em);
  const valorTexto = formatBRL(valor);
  const valorExtenso = valorPorExtenso(valor);
  const textoResumo = `Recibo Nº ${numero} — ${valorTexto} — ${recebimento.descricao}`;

  return (
    <>
      <BarraImpressao voltar="/meu-financeiro" />
      <div className="no-print mx-auto mb-4 flex max-w-[720px] flex-col gap-3 px-4">
        <CompartilharReciboWhatsApp
          dados={{
            numero,
            pagadorNome: recebimento.pagador_nome,
            valorTexto,
            valorExtenso,
            referenteA,
            formaLabel,
            dataTexto,
            prestadorNome: prestador.nome,
            funcao,
          }}
          textoResumo={textoResumo}
        />
        <AjustarRecebimento id={recebimento.id} valor={valor} forma={recebimento.forma} recebidoEm={recebimento.recebido_em} />
      </div>

      <div className="rr-fundo">
        <article className="rr-folha">
          <header className="rr-cabecalho">
            <Logo />
            <div className="rr-meta">
              <p className="rr-eyebrow">Recibo</p>
              <p className="rr-numero">Nº {numero}</p>
              <p className="rr-linha-meta">Recebido em {dataTexto}</p>
            </div>
          </header>

          <div className="rr-hr" />

          <section className="rr-secao">
            <p className="rr-rotulo">Recebi de</p>
            <p className="rr-nome-parte">{recebimento.pagador_nome}</p>
          </section>

          <section className="rr-valor-card">
            <p className="rr-valor-rotulo">A importância de</p>
            <p className="rr-valor-numero tabular">{valorTexto}</p>
            <p className="rr-valor-extenso">({valorExtenso})</p>
          </section>

          <section className="rr-secao">
            <p className="rr-rotulo">Referente a</p>
            <p className="rr-corpo">{referenteA}</p>
            <p className="rr-muted">
              {formaLabel} · recebido em {dataTexto}
            </p>
          </section>

          <section className="rr-declaracao">
            <p>
              Para clareza e devida quitação, firmamos o presente recibo comprovando o recebimento da importância
              acima, referente ao descrito, dando plena e geral quitação.
            </p>
          </section>

          <section className="rr-assinatura-linha">
            <div className="rr-assinatura-bloco">
              <p className={`rr-assinatura-cursiva ${fonteAssinatura.className}`}>{prestador.nome}</p>
              <div className="rr-assinatura-filete" />
              <p className="rr-assinatura-nome">{prestador.nome}</p>
              <p className="rr-assinatura-sub">{funcao}</p>
            </div>
          </section>

          <section className="rr-avisos">
            <p>{AVISO_SEM_VALOR_FISCAL}</p>
            <p>{AVISO_MARKETPLACE}</p>
          </section>

          <footer className="rr-rodape">
            <span>Documento gerado eletronicamente pelo Me Ajuda Aí · não é nota fiscal</span>
            <span>{dataTexto}</span>
          </footer>
        </article>
      </div>

      <style>{`
        html, body { background:#fff !important; color:#18181b !important; color-scheme:light !important; }
        .rr-fundo { min-height:100vh; background:#e9edf3; padding:28px 16px 56px; color:#18181b; font-family: var(--font-poppins), Poppins, sans-serif; }
        .rr-folha { position:relative; width:210mm; min-height:148.5mm; max-width:100%; margin:0 auto; background:#fff; border:1px solid #d8dee7; border-radius:2px; padding:11mm 16mm; box-shadow:0 1px 2px rgba(15,23,42,.06), 0 10px 28px rgba(15,23,42,.10); overflow:hidden; }
        .rr-folha::before { content:""; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg, #0D47A1 0%, #0D47A1 82%, #FFC107 82%, #FFC107 100%); }
        .rr-cabecalho { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:12px; position:relative; z-index:1; }
        .rr-meta { text-align:right; }
        .rr-eyebrow { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; }
        .rr-numero { font-family:ui-monospace, Menlo, monospace; font-size:13px; letter-spacing:-.02em; margin-top:4px; color:#111827; }
        .rr-linha-meta { font-size:11px; color:#52525b; margin-top:2px; }
        .rr-hr { height:1px; background:linear-gradient(90deg, transparent 0%, #d4d4d8 12%, #d4d4d8 88%, transparent 100%); margin:4px 0 14px; position:relative; z-index:1; }
        .rr-secao { margin-bottom:12px; position:relative; z-index:1; }
        .rr-rotulo { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#71717a; margin-bottom:3px; }
        .rr-nome-parte { font-size:17px; font-weight:500; color:#111827; }
        .rr-corpo { font-size:14px; line-height:1.45; color:#27272a; }
        .rr-muted { font-size:12px; color:#52525b; margin-top:2px; }
        .rr-valor-card { background:#ecfdf5; border:1px solid #6ee7b7; border-radius:4px; padding:12px 18px; margin:14px 0; position:relative; z-index:1; }
        .rr-valor-rotulo { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#065f46; margin-bottom:3px; }
        .rr-valor-numero { font-size:28px; font-weight:600; letter-spacing:-.02em; color:#18181b; }
        .rr-valor-extenso { font-style:italic; font-size:13px; color:#52525b; margin-top:3px; }
        .rr-declaracao { font-size:12.5px; line-height:1.5; color:#27272a; margin:12px 0 14px; position:relative; z-index:1; }
        .rr-assinatura-linha { margin-top:20px; display:flex; justify-content:flex-end; position:relative; z-index:1; }
        .rr-assinatura-bloco { width:260px; text-align:center; }
        .rr-assinatura-cursiva { font-size:28px; line-height:1.1; color:#111827; margin-bottom:2px; }
        .rr-assinatura-filete { height:1px; background:#18181b; margin:0 auto; width:100%; }
        .rr-assinatura-nome { margin-top:6px; font-size:13px; font-weight:500; color:#111827; }
        .rr-assinatura-sub { font-size:11px; color:#52525b; }
        .rr-avisos { margin-top:14px; padding-top:10px; border-top:1px solid #e4e4e7; display:flex; flex-direction:column; gap:6px; font-size:11px; line-height:1.5; color:#3f3f46; position:relative; z-index:1; }
        .rr-rodape { margin-top:12px; padding-top:8px; border-top:1px solid #e4e4e7; display:flex; justify-content:space-between; gap:12px; font-size:10px; color:#71717a; position:relative; z-index:1; }
        @media print {
          html, body { background:#fff !important; margin:0 !important; padding:0 !important; }
          .no-print { display:none !important; }
          .rr-fundo { background:#fff !important; padding:0 !important; min-height:0 !important; }
          .rr-folha { width:auto; min-height:0; margin:0; border:none; border-radius:0; box-shadow:none; padding:10mm 14mm; max-width:none; }
          @page { size:210mm 148.5mm; margin:0; }
        }
      `}</style>
    </>
  );
}
