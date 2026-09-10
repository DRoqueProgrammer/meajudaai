"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EstadoForm } from "@/lib/actions/form";
import type { ActionResult } from "@/lib/actions/auth";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/**
 * Formulários de cliente da área `/admin/pracas` (só SysAdmin, R-46/R-47,
 * ADR 0013, D-016): criar praça — funciona sem JavaScript, como todo form do
 * projeto — e vincular um Administrador a uma ou mais praças com uma
 * padrão, que precisa de JavaScript pelo multi-seletor. As duas actions
 * (`criarPracaAction`, `vincularAdministradorAction`) vêm por prop de
 * `app/(app)/admin/pracas/page.tsx` — este arquivo não decide autorização
 * nenhuma, só coleta o formulário.
 */

export interface Praca {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

export interface AdministradorComVinculos {
  userId: string;
  nome: string;
  pracaIds: string[];
  padraoId: string | null;
}

/** Cria uma praça nova (nome, cidade, estado). */
export function CriarPracaForm({
  action,
}: {
  action: (estado: EstadoForm, fd: FormData) => Promise<EstadoForm>;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = estado?.valores ?? {};
  const ok = estado?.ok === true;

  return (
    <form action={formAction} className="card flex flex-col gap-2">
      <p className="text-sm font-medium">Nova praça</p>
      <div>
        <label className="label" htmlFor="praca-nome">
          Nome
        </label>
        <input id="praca-nome" name="nome" className="input text-sm" defaultValue={v.nome ?? ""} required />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label" htmlFor="praca-cidade">
            Cidade
          </label>
          <input
            id="praca-cidade"
            name="cidade"
            className="input text-sm"
            defaultValue={v.cidade ?? "Niterói"}
          />
        </div>
        <div className="w-20">
          <label className="label" htmlFor="praca-uf">
            UF
          </label>
          <input
            id="praca-uf"
            name="estado"
            className="input text-sm"
            maxLength={2}
            defaultValue={v.estado ?? "RJ"}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <BotaoEnviar className="btn-action px-4 py-2 text-sm" enviando="Criando…">
          Criar praça
        </BotaoEnviar>
        {ok ? (
          <span className="text-xs text-ok">
            Praça criada <span aria-hidden="true">✓</span>
          </span>
        ) : null}
        {estado?.erro ? <FormError className="text-xs">{estado.erro}</FormError> : null}
      </div>
    </form>
  );
}

/**
 * Vincula UM Administrador a uma ou mais praças, com uma padrão — substitui
 * o conjunto atual dele (R-47). Ação imperativa (não é `<form action>`
 * porque o alvo já é fixo e os ids vão em array), por isso usa
 * `useTransition` como o resto do painel (ex.: `WorkspaceSwitcher`).
 */
export function VincularAdministradorForm({
  vincular,
  administrador,
  pracas,
}: {
  vincular: (adminId: string, pracaIds: string[], padraoId: string) => Promise<ActionResult>;
  administrador: AdministradorComVinculos;
  pracas: Praca[];
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>(administrador.pracaIds);
  const [padrao, setPadrao] = useState<string | null>(administrador.padraoId ?? administrador.pracaIds[0] ?? null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function alternar(id: string) {
    setOk(false);
    setSelecionadas((prev) => {
      const proxima = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      // A padrão que sai do conjunto não pode continuar marcada.
      if (!proxima.includes(padrao ?? "")) setPadrao(proxima[0] ?? null);
      return proxima;
    });
  }

  function salvar() {
    setErro(null);
    setOk(false);
    if (selecionadas.length === 0) {
      setErro("Escolha ao menos uma praça.");
      return;
    }
    const padraoEfetiva = padrao && selecionadas.includes(padrao) ? padrao : selecionadas[0]!;
    start(async () => {
      const r = await vincular(administrador.userId, selecionadas, padraoEfetiva);
      if (r.ok) {
        setOk(true);
        router.refresh();
      } else {
        setErro(r.erro ?? "Não foi possível vincular.");
      }
    });
  }

  return (
    <div className="card flex flex-col gap-2">
      <p className="text-sm font-medium">{administrador.nome}</p>
      {pracas.length === 0 ? (
        <p className="text-xs text-muted">Crie uma praça antes de vincular.</p>
      ) : (
        <fieldset className="flex flex-col gap-1">
          <legend className="label">Praças (marque a padrão à direita)</legend>
          {pracas.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selecionadas.includes(p.id)}
                onChange={() => alternar(p.id)}
              />
              <span className="flex-1">{p.nome}</span>
              <input
                type="radio"
                name={`padrao-${administrador.userId}`}
                checked={padrao === p.id}
                disabled={!selecionadas.includes(p.id)}
                onChange={() => setPadrao(p.id)}
                aria-label={`${p.nome} como praça padrão de ${administrador.nome}`}
              />
              <span className="text-xs text-muted">padrão</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={pending || pracas.length === 0}
          className="btn-action px-4 py-2 text-sm"
        >
          {pending ? "Salvando…" : "Salvar vínculo"}
        </button>
        {ok ? (
          <span className="text-xs text-ok">
            Vínculo salvo <span aria-hidden="true">✓</span>
          </span>
        ) : null}
        {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      </div>
    </div>
  );
}
