"use client";

import { useState, useTransition } from "react";
import { definirEmiteNotaFiscalAction } from "@/lib/actions/recebimentos";
import { FormError } from "@/components/ui";

/**
 * "Emito nota fiscal (MEI ou empresa)" no perfil do PRESTADOR (D-048, pedido
 * do Leonardo em 11/09/2026): sim/não que aparece no perfil público, pro
 * cliente decidir sozinho — a Me Ajuda Aí não emite nem intermedeia nota.
 * Caixinha isolada, fora do form principal de `PerfilForm`: salva ao marcar
 * (`definirEmiteNotaFiscalAction`), sem precisar apertar "Salvar" da tela toda.
 */
export function EmiteNotaFiscalToggle({ inicial }: { inicial: boolean }) {
  const [marcado, setMarcado] = useState(inicial);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function alternar(valor: boolean) {
    setMarcado(valor);
    setSalvo(false);
    setErro(null);
    start(async () => {
      const r = await definirEmiteNotaFiscalAction(valor);
      if (!r.ok) {
        setMarcado(!valor);
        setErro(r.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={marcado}
          disabled={pending}
          onChange={(e) => alternar(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-brand"
        />
        <span>
          <span className="font-medium">Emito nota fiscal (MEI ou empresa)</span>
          <span className="block text-xs text-muted">
            Aparece como &quot;sim&quot; ou &quot;não&quot; no seu perfil — é o cliente quem decide com essa
            informação. Nota fiscal, quando houver, é combinada direto com você.
          </span>
        </span>
      </label>
      {salvo && !pending ? <p className="mt-1 text-xs text-ok">Salvo.</p> : null}
      {erro ? <FormError className="mt-1">{erro}</FormError> : null}
    </div>
  );
}
