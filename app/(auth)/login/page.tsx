"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { entrarAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

const CHAVE_CREDENCIAIS = "meajudaai:credenciais-salvas";

/**
 * `<form action={...}>` com Server Action, não `onSubmit` para o envio em si —
 * o navegador faz o POST, a action roda no servidor e o redirect vem de lá.
 *
 * "Salvar credenciais" é um atalho de conveniência para o protótipo: grava
 * e-mail/senha em `localStorage` (só neste navegador) para pré-preencher da
 * próxima vez. Não é um cofre de senhas — é só isso, texto puro no
 * localStorage, aceitável aqui porque é a própria conta do usuário no próprio
 * dispositivo, mas não é o padrão que usaríamos para dados de terceiros.
 */
/** Rota `/login`: entrada por e-mail e senha, com mostrar/ocultar senha e "salvar credenciais" (localStorage). */
export default function LoginPage() {
  const [estado, formAction] = useActionState(entrarAction, null);
  const [email, setEmail] = useState(estado?.valores?.email ?? "");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvar, setSalvar] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_CREDENCIAIS);
      if (salvo) {
        const { email: e, senha: s } = JSON.parse(salvo);
        setEmail(e ?? "");
        setSenha(s ?? "");
        setSalvar(true);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue sem pré-preencher.
    }
  }, []);

  function aoEnviar() {
    try {
      if (salvar) localStorage.setItem(CHAVE_CREDENCIAIS, JSON.stringify({ email, senha }));
      else localStorage.removeItem(CHAVE_CREDENCIAIS);
    } catch {
      // Sem localStorage disponível, só não salva — não impede o login.
    }
  }

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
        onSubmit={aoEnviar}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="senha">
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              name="senha"
              autoComplete="current-password"
              className="input pr-16"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-brand"
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={salvar}
            onChange={(e) => setSalvar(e.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Salvar credenciais neste dispositivo
        </label>
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
