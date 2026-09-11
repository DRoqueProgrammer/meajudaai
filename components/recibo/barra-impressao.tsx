"use client";

/**
 * Barra fixa acima do papel do recibo — "Imprimir / Salvar PDF" (o próprio
 * `window.print()`, que no Chrome/Edge/Firefox já oferece "Salvar como PDF"
 * no destino) e "Fechar". `.no-print` some no papel: some ao imprimir (regra
 * em cada página de recibo) e também não faz sentido no PDF salvo.
 */
export function BarraImpressao({ voltar = "/praca/financeiro" }: { voltar?: string }) {
  function fechar() {
    // A maioria dos recibos abre numa aba nova (window.open) — essas o script
    // pode fechar. Se não conseguir (aba não veio de script), volta pro app.
    window.close();
    setTimeout(() => {
      if (!window.closed) window.location.assign(voltar);
    }, 150);
  }

  return (
    <div className="no-print sticky top-3 z-50 mx-auto mb-4 flex max-w-[720px] items-center justify-end gap-2 rounded-xl border border-line bg-card px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={() => window.print()} className="btn-brand">
        Imprimir / Salvar PDF
      </button>
      <button type="button" onClick={fechar} className="btn-ghost">
        Fechar
      </button>
    </div>
  );
}
