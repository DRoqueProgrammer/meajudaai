"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Barra de filtros das abas Financeiro (D-048 — "nas abas Financeiro precisa
 * ter filtro"), no molde da `FinanceiroFilters` do careconnect: cada escolha
 * vai para a URL (`?ano=&situacao=&pessoa=&tipo=&q=`) e a página filtra no
 * servidor — funciona com o botão voltar e dá para mandar o link filtrado.
 * O parâmetro `aba` (sub-aba da página) é preservado.
 */
export function FiltrosFinanceiro({
  anos,
  pessoas,
  rotuloPessoa,
  tipos,
}: {
  anos: number[];
  pessoas: { id: string; nome: string }[];
  /** "cliente" / "prestador" — no texto das opções. */
  rotuloPessoa: string;
  tipos?: { slug: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const cur = (k: string) => params.get(k) ?? "";
  const [busca, setBusca] = useState(cur("q"));

  function aplicar(mudancas: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Busca por nome com uma pausa curta: não recarrega a cada letra.
  useEffect(() => {
    if (busca === cur("q")) return;
    const t = setTimeout(() => aplicar({ q: busca.trim() }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const temFiltro = Boolean(cur("situacao") || cur("pessoa") || cur("tipo") || cur("q"));
  const sel = "input h-11 w-auto min-w-[9rem] py-0 pr-8 text-sm";

  return (
    <form
      role="search"
      aria-label="Filtros do Financeiro"
      onSubmit={(e) => {
        e.preventDefault();
        aplicar({ q: busca.trim() });
      }}
      className="flex flex-wrap items-end gap-2"
      data-pending={pending ? "" : undefined}
    >
      <label className="flex flex-col gap-1">
        <span className="text-rotulo font-semibold uppercase tracking-wide text-muted">Ano</span>
        <select className={sel} value={cur("ano") || String(anos[0] ?? "")} onChange={(e) => aplicar({ ano: e.target.value })}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-rotulo font-semibold uppercase tracking-wide text-muted">Situação</span>
        <select className={sel} value={cur("situacao")} onChange={(e) => aplicar({ situacao: e.target.value })}>
          <option value="">Todas</option>
          <option value="ok">Pagos</option>
          <option value="pendente">A receber</option>
          <option value="atrasada">Em atraso (7+ dias)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-rotulo font-semibold uppercase tracking-wide text-muted">{rotuloPessoa.replace(/^./, (c) => c.toUpperCase())}</span>
        <select className={sel} value={cur("pessoa")} onChange={(e) => aplicar({ pessoa: e.target.value })}>
          <option value="">Todos</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      {tipos && tipos.length > 0 ? (
        <label className="flex flex-col gap-1">
          <span className="text-rotulo font-semibold uppercase tracking-wide text-muted">Tipo de serviço</span>
          <select className={sel} value={cur("tipo")} onChange={(e) => aplicar({ tipo: e.target.value })}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
        <span className="text-rotulo font-semibold uppercase tracking-wide text-muted">Buscar</span>
        <input
          type="search"
          className="input h-11 text-sm"
          placeholder={`Nome do ${rotuloPessoa}…`}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>

      {temFiltro ? (
        <button
          type="button"
          className="btn-ghost h-11 px-4 text-sm"
          onClick={() => {
            setBusca("");
            aplicar({ situacao: "", pessoa: "", tipo: "", q: "" });
          }}
        >
          Limpar filtros
        </button>
      ) : null}
    </form>
  );
}
