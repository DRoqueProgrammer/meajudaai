"use client";

import { useState, useTransition } from "react";
import { definirAliquotaAction } from "@/lib/actions/comissao";
import { FormError } from "@/components/ui";

/**
 * Um campo de alíquota simples — a geral da praça, ou a de um tipo de
 * serviço — com o próprio botão de salvar. Vazio + salvar apaga a linha (a
 * action já trata isso); "usa a geral" no placeholder deixa claro que o
 * campo vazio não é 0%, é "sem regra própria" (D-044: sem nada definido, 0%
 * no fim da cadeia, não neste nível).
 */
export function CampoAliquota({
  workspaceId,
  tipo,
  valorInicial,
  placeholder,
  label,
}: {
  workspaceId: string;
  tipo: string | null;
  valorInicial: number | null;
  placeholder?: string;
  label: string;
}) {
  const [valor, setValor] = useState(valorInicial != null ? String(valorInicial).replace(".", ",") : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, start] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    start(async () => {
      const r = await definirAliquotaAction({ workspaceId, tipo, percentual: valor.trim() === "" ? null : valor });
      if (r.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      } else {
        setErro(r.erro ?? "Não foi possível salvar.");
      }
    });
  }

  const id = `aliq-${tipo ?? "geral"}`;
  return (
    <div className="flex flex-col gap-1">
      {/* Campo estreito (uma porcentagem tem no máximo "50,00"): a versão de
          largura inteira pesava a seção com sete linhas iguais. */}
      <form onSubmit={salvar} className="flex flex-col gap-1">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div className="relative w-32">
            <input
              id={id}
              className="input pr-8 tabular-nums"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={placeholder}
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              %
            </span>
          </div>
          <button type="submit" disabled={pending} className="btn-ghost">
            {pending ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
          </button>
        </div>
      </form>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}

export interface AliquotaDoPrestador {
  id: string;
  prestadorId: string;
  prestadorNome: string;
  tipo: string | null;
  percentual: number;
}

/**
 * Alíquotas "por prestador" (com ou sem tipo): lista as existentes com botão
 * Remover, e um formulário para adicionar uma nova — prestador obrigatório,
 * tipo opcional (vazio = vale para todos os tipos dele).
 */
export function AliquotasPorPrestador({
  workspaceId,
  existentes,
  prestadores,
  tipos,
}: {
  workspaceId: string;
  existentes: AliquotaDoPrestador[];
  prestadores: { id: string; nome: string }[];
  tipos: { slug: string; nome: string }[];
}) {
  const [prestadorId, setPrestadorId] = useState("");
  const [tipo, setTipo] = useState("");
  const [percentual, setPercentual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function nomeDoTipo(slug: string | null): string {
    if (!slug) return "todos os tipos";
    return tipos.find((t) => t.slug === slug)?.nome ?? slug;
  }

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!prestadorId) {
      setErro("Escolha o prestador.");
      return;
    }
    start(async () => {
      const r = await definirAliquotaAction({ workspaceId, prestadorId, tipo: tipo || null, percentual });
      if (r.ok) {
        setPrestadorId("");
        setTipo("");
        setPercentual("");
      } else {
        setErro(r.erro ?? "Não foi possível salvar.");
      }
    });
  }

  function remover(alvoPrestadorId: string, alvoTipo: string | null) {
    setErro(null);
    start(async () => {
      const r = await definirAliquotaAction({ workspaceId, prestadorId: alvoPrestadorId, tipo: alvoTipo, percentual: null });
      if (!r.ok) setErro(r.erro ?? "Não foi possível remover.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {existentes.length === 0 ? (
        <p className="card-vazio">Nenhuma alíquota por prestador ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {existentes.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{a.prestadorNome}</span>{" "}
                <span className="text-muted">· {nomeDoTipo(a.tipo)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">{a.percentual}%</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remover(a.prestadorId, a.tipo)}
                  className="btn-ghost border-danger/40 px-3 py-1 text-xs text-danger hover:bg-tint-danger"
                >
                  Remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor="aliq-prestador">
            Prestador
          </label>
          <select id="aliq-prestador" className="input" value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)}>
            <option value="">Escolha…</option>
            {prestadores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor="aliq-tipo">
            Tipo (opcional)
          </label>
          <select id="aliq-tipo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {tipos.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="label" htmlFor="aliq-percentual">
            %
          </label>
          <input
            id="aliq-percentual"
            className="input"
            inputMode="decimal"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            placeholder="8"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "Salvando…" : "Adicionar"}
        </button>
      </form>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
