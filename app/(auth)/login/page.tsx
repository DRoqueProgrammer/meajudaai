"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrarAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

/**
 * `<form action={...}>` com Server Action, não `onSubmit`.
 *
 * Com isso o login funciona sem JavaScript: o navegador faz o POST, a action
 * roda no servidor e o redirect vem de lá. Antes, o `onSubmit` só existia
 * depois da hidratação — e o submit nativo virava GET com a senha na URL.
 *
 * Campos não controlados (`defaultValue`): sem estado no cliente, o valor
 * digitado sobrevive ao erro porque a action devolve em `valores`.
 */
/** Rota `/login`: entrada por e-mail e senha (form com Server Action, funciona sem JS). */
export default function LoginPage() {
  const [estado, formAction] = useActionState(entrarAction, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="text-sm text-muted">
          A ajuda que você precisa, no momento que você mais precisa.
        </p>
      </div>
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
      >
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            autoComplete="email"
            className="input"
            type="email"
            defaultValue={estado?.valores?.email ?? ""}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            autoComplete="current-password"
            className="input"
            type="password"
            required
          />
        </div>
        <Link href="/recuperar-senha" className="link-touch -mt-1 self-start">
          Esqueci minha senha
        </Link>
        {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
        <BotaoEnviar className="btn-brand mt-1" enviando="Entrando…">
          ENTRAR
        </BotaoEnviar>
        <Link href="/cadastro" className="link-touch">
          Criar conta
        </Link>
        <Link href="/" className="link-touch text-xs text-muted">
          Explorar com uma conta de exemplo
        </Link>
      </form>
    </main>
  );
}
