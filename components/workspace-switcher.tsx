"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setActiveWorkspaceAction,
  criarEmpresaAction,
  excluirEquipeAction,
} from "@/lib/actions/workspace";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

type Ws = { workspace_id: string; role: string; nome: string };

/** Seletor da empresa ativa (para admin com várias), com atalhos para criar e excluir equipe. */
export function WorkspaceSwitcher({ workspaces, active }: { workspaces: Ws[]; active?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const idAtivo = active ?? workspaces[0]?.workspace_id;
  const ativa = workspaces.find((w) => w.workspace_id === idAtivo);
  // Só o dono da equipe ativa vê a opção de excluir; a action reforça no servidor.
  const podeExcluir = ativa?.role === "owner";
  const vazio = workspaces.length === 0;

  function trocar(id: string) {
    if (id === active) return;
    setErro(null);
    start(async () => {
      const r = await setActiveWorkspaceAction(id);
      if (r.ok) router.refresh();
      else setErro(r.erro ?? "Erro ao trocar de equipe.");
    });
  }

  function excluir() {
    if (!ativa) return;
    setErro(null);
    start(async () => {
      const r = await excluirEquipeAction(ativa.workspace_id);
      if (r.ok) {
        setExcluindo(false);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível excluir a equipe.");
    });
  }

  const [estadoCriar, criarAction] = useActionState(criarEmpresaAction, null);

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="workspace-ativo"
          className="text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Equipe
        </label>
        {vazio ? (
          <span className="flex-1 text-sm text-muted">Você ainda não tem uma equipe.</span>
        ) : (
          <select
            id="workspace-ativo"
            name="workspace-ativo"
            value={idAtivo ?? ""}
            onChange={(e) => trocar(e.target.value)}
            disabled={pending}
            className="input flex-1 text-sm"
          >
            {workspaces.map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.nome}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setCriando((v) => !v)}
          className="btn-ghost whitespace-nowrap px-2 py-1.5 text-xs"
        >
          {criando ? "Cancelar" : vazio ? "Criar equipe" : "＋ Nova"}
        </button>
      </div>

      {criando ? (
        <form action={criarAction} className="flex flex-col gap-2 border-t border-line pt-2">
          <div>
            <label className="label" htmlFor="nova-empresa-nome">
              Nome da equipe
            </label>
            <input
              id="nova-empresa-nome"
              name="nome"
              className="input text-sm"
              defaultValue={estadoCriar?.valores?.nome ?? ""}
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label" htmlFor="nova-empresa-cidade">
                Cidade
              </label>
              <input
                id="nova-empresa-cidade"
                name="cidade"
                className="input text-sm"
                defaultValue={estadoCriar?.valores?.cidade ?? "Niterói"}
              />
            </div>
            <div className="w-20">
              <label className="label" htmlFor="nova-empresa-uf">
                UF
              </label>
              <input
                id="nova-empresa-uf"
                name="estado"
                className="input text-sm"
                maxLength={2}
                defaultValue={estadoCriar?.valores?.estado ?? "RJ"}
              />
            </div>
          </div>
          <BotaoEnviar className="btn-action px-3 py-1.5 text-xs" enviando="Criando…">
            Criar equipe
          </BotaoEnviar>
          {estadoCriar?.erro ? <FormError className="text-xs">{estadoCriar.erro}</FormError> : null}
        </form>
      ) : null}

      {podeExcluir && !criando ? (
        excluindo ? (
          // gap-3: Voltar e Excluir têm consequências opostas e a exclusão não volta.
          <div className="flex flex-col gap-3 border-t border-line pt-2">
            <p className="text-sm">
              Excluir a equipe <strong className="font-semibold">{ativa!.nome}</strong>? A equipe e o
              histórico de vagas já encerradas somem, e não dá para desfazer.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExcluindo(false)}
                disabled={pending}
                className="btn-ghost px-4 text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={excluir}
                disabled={pending}
                className="btn-ghost border-danger px-4 text-xs text-danger"
              >
                {pending ? "Excluindo…" : "Excluir equipe"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExcluindo(true)}
            className="min-h-11 self-start text-xs font-medium text-danger underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Excluir esta equipe
          </button>
        )
      ) : null}

      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
