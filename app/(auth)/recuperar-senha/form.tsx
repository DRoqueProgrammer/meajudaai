"use client";

import { useActionState } from "react";
import Link from "next/link";
import { recuperarSenhaAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

export function RecuperarSenhaForm({ expirado }: { expirado: boolean }) {
  const [estado, formAction] = useActionState(recuperarSenhaAction, null);
  // O recibo é derivado do estado da action, não de `useState`: assim ele
  // também aparece no caminho sem JavaScript, depois do POST.
  const enviado = estado?.ok === true;
  const email = estado?.valores?.email ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
      </div>

      {enviado ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]">
          <h1 className="text-lg font-semibold">Confira seu e-mail</h1>
          {/* Mensagem neutra de propósito: confirmar que o e-mail existe
              transformaria esta tela num verificador de quem está na base. */}
          <p className="text-sm leading-relaxed text-muted">
            Se <strong className="font-medium text-ink">{email}</strong> estiver cadastrado, o link
            para criar uma senha nova já está a caminho. Ele vale por uma hora.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Não chegou em alguns minutos? Olhe no spam ou{" "}
            <Link
              href="/recuperar-senha"
              className="text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              tente outro e-mail
            </Link>
            .
          </p>
          <Link href="/login" className="btn-ghost mt-1 w-full">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
        >
          <h1 className="text-lg font-semibold">Esqueci minha senha</h1>
          <p className="text-sm leading-relaxed text-muted">
            Digite o e-mail da sua conta. Mandamos um link para você criar uma senha nova.
          </p>
          {expirado ? (
            <FormError>Esse link já expirou. Peça um novo abaixo.</FormError>
          ) : null}
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              defaultValue={email}
              required
              autoFocus
            />
          </div>
          {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
          <BotaoEnviar className="btn-brand mt-1" enviando="Enviando…">
            ENVIAR LINK
          </BotaoEnviar>
          <Link href="/login" className="link-touch">
            Lembrei minha senha
          </Link>
        </form>
      )}
    </main>
  );
}
