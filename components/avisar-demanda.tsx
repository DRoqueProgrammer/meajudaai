"use client";

import { useState } from "react";
import { nomeCategoria } from "@/lib/categorias";
import { registrarDemandaAction } from "@/lib/actions/demanda";

/** "Avise-me quando tiver": registra a demanda reprimida (categoria+cidade) numa busca sem resultado. */
export function AvisarDemanda({
  categoria,
  cidade,
  jaAvisou,
}: {
  categoria: string;
  cidade: string;
  jaAvisou: boolean;
}) {
  const [feito, setFeito] = useState(jaAvisou);
  const [carregando, setCarregando] = useState(false);

  if (feito) {
    return (
      <p className="mt-4 text-sm font-medium text-action-dark">
        ✓ Anotado — avisaremos quando aparecer {nomeCategoria(categoria).toLowerCase()} em {cidade}.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={carregando}
      onClick={async () => {
        setCarregando(true);
        const r = await registrarDemandaAction(categoria, cidade);
        setCarregando(false);
        if (r.ok) setFeito(true);
      }}
      className="btn-ghost mt-4 disabled:opacity-60"
    >
      Avise que você procura {nomeCategoria(categoria).toLowerCase()} em {cidade}
    </button>
  );
}
