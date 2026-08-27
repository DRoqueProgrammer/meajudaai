"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { definirSenhaAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/**
 * Híbrido de propósito: o envio é Server Action (funciona sem JavaScript e o
 * redirect vem do servidor), mas as dicas ao vivo — "faltam N caracteres", "as
 * senhas ainda estão diferentes" — continuam sendo estado de cliente.
 *
 * A conferência das duas senhas passou a existir TAMBÉM no servidor: antes era
 * só no cliente, então sem JS ela não acontecia.
 */
/** Rota `/nova-senha`: define a senha nova a partir da sessão criada pelo link de recuperação. */
export default function NovaSenhaPage() {
  const [estado, formAction] = useActionState(definirSenhaAction, null);
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");

  const curta = senha.length > 0 && senha.length < 6;
  const diferem = repetida.length > 0 && senha !== repetida;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
      </div>
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
      >
        <h1 className="text-lg font-semibold">Criar senha nova</h1>
        <p className="text-sm leading-relaxed text-muted">
          Escolha uma senha de pelo menos 6 caracteres. Depois de salvar, você já entra direto.
        </p>
        <div>
          <label className="label" htmlFor="senha">
            Senha nova
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            className="input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            required
            autoFocus
            aria-describedby="senha-dica"
          />
          <p id="senha-dica" aria-live="polite" className="mt-1 text-xs text-muted">
            {curta ? `Faltam ${6 - senha.length} caracteres.` : "Mínimo de 6 caracteres."}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="repetida">
            Repita a senha
          </label>
          <input
            id="repetida"
            name="repetida"
            type="password"
            autoComplete="new-password"
            className="input"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
          />
          {diferem ? (
            <p aria-live="polite" className="mt-1 text-xs text-danger">
              As duas senhas ainda estão diferentes.
            </p>
          ) : null}
        </div>
        {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
        <BotaoEnviar
          className="btn-brand mt-1"
          enviando="Salvando…"
          desabilitado={curta || diferem}
        >
          SALVAR SENHA
        </BotaoEnviar>
        <Link href="/login" className="link-touch">
          Voltar para o login
        </Link>
      </form>
    </main>
  );
}
