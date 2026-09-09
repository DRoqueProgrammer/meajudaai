"use client";

import { useActionState } from "react";
import { reativarContaAction } from "@/lib/actions/auth";
import { CidadeSelect } from "@/components/cidade-select";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/** Formulário de reativação — confirma nome/telefone/cidade; foto continua opcional (edita depois em /perfil/editar). */
export function ReativarForm({ nome, telefone, cidadeUf }: { nome: string; telefone: string; cidadeUf: string }) {
  const [estado, formAction] = useActionState(reativarContaAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6">
      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" className="input" defaultValue={estado?.valores?.nome ?? nome} required />
      </div>
      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input id="telefone" name="telefone" className="input" defaultValue={estado?.valores?.telefone ?? telefone} required />
      </div>
      <div>
        <label className="label" htmlFor="cidadeUf">Cidade</label>
        <CidadeSelect id="cidadeUf" name="cidadeUf" defaultValue={estado?.valores?.cidadeUf ?? cidadeUf} />
      </div>
      {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
      <BotaoEnviar className="btn-brand" enviando="Reativando…">
        CONFIRMAR E VOLTAR
      </BotaoEnviar>
    </form>
  );
}
