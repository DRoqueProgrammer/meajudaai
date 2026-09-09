"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { carregarCidadesIbge, normalizarBusca, ESTADOS_BR, type IbgeCity } from "@/lib/ibge";

function parseCidadeUf(v: string | undefined): { nome: string; uf: string } {
  const [nome, uf] = (v ?? "").split("|");
  return { nome: nome ?? "", uf: uf ?? "" };
}

/**
 * Combobox de cidade com busca, sobre os ~5.570 municípios do IBGE (ROADMAP §7)
 * — substitui o antigo `<select>` de 14 cidades fixas. Mantém o mesmo contrato
 * dos formulários existentes: um input escondido `name="cidadeUf"` com o valor
 * combinado `"Cidade|UF"`, então nenhuma Server Action precisou mudar.
 */
export function CidadeSelect({
  name,
  id,
  defaultValue,
  required,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const inicial = parseCidadeUf(defaultValue);
  const [selecionada, setSelecionada] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ufFiltro, setUfFiltro] = useState("");
  const [cidades, setCidades] = useState<IbgeCity[]>([]);
  const [carregando, setCarregando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto || cidades.length > 0) return;
    setCarregando(true);
    carregarCidadesIbge()
      .then(setCidades)
      .catch(() => setCidades([]))
      .finally(() => setCarregando(false));
  }, [aberto, cidades.length]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const filtradas = useMemo(() => {
    if (!cidades.length) return [];
    const q = normalizarBusca(busca);
    return cidades
      .filter((c) => (!ufFiltro || c.uf === ufFiltro) && (!q || normalizarBusca(c.nome).includes(q)))
      .slice(0, 100);
  }, [cidades, busca, ufFiltro]);

  const rotulo = selecionada.nome ? `${selecionada.nome} - ${selecionada.uf}` : "Selecione a cidade";

  return (
    <div ref={ref} className="relative">
      <input type="hidden" id={id} name={name} required={required} value={`${selecionada.nome}|${selecionada.uf}`} readOnly />
      <button type="button" onClick={() => setAberto((a) => !a)} className="input flex items-center justify-between text-left">
        <span className={selecionada.nome ? "" : "text-muted"}>{rotulo}</span>
        <span aria-hidden="true" className="text-muted">{aberto ? "▴" : "▾"}</span>
      </button>

      {aberto ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-card shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
          <div className="flex gap-1.5 border-b border-line p-2">
            <select
              value={ufFiltro}
              onChange={(e) => setUfFiltro(e.target.value)}
              className="rounded-lg border border-line-strong bg-card px-2 text-sm"
            >
              <option value="">UF</option>
              {ESTADOS_BR.map((e) => (
                <option key={e.uf} value={e.uf}>{e.uf}</option>
              ))}
            </select>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cidade…"
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {carregando ? (
              <p className="px-3 py-4 text-sm text-muted">Carregando municípios do IBGE…</p>
            ) : filtradas.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                {cidades.length === 0 ? "Não foi possível carregar as cidades." : "Nenhuma cidade encontrada."}
              </p>
            ) : (
              <ul role="listbox">
                {filtradas.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelecionada({ nome: c.nome, uf: c.uf });
                        setAberto(false);
                        setBusca("");
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      <span className="truncate">{c.nome}</span>
                      <span className="shrink-0 text-xs text-muted">{c.uf}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
