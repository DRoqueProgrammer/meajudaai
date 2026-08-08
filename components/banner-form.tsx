"use client";

import { useState } from "react";
import { salvarBannerAction } from "@/lib/actions/demanda";

export function BannerForm({ texto, ativo }: { texto: string; ativo: boolean }) {
  const [t, setT] = useState(texto);
  const [a, setA] = useState(ativo);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold">Banner da home</p>
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={2}
        placeholder="Ex.: Falta encanador em Recife — avise seu amigo que aqui tem trabalho."
        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} />
        Mostrar na home para todos
      </label>
      <button
        type="button"
        disabled={salvando}
        onClick={async () => {
          setSalvando(true);
          const r = await salvarBannerAction(t, a);
          setSalvando(false);
          setMsg(r.ok ? "Salvo." : (r.erro ?? "Erro."));
        }}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Salvar
      </button>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
