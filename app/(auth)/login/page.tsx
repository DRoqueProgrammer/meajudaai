"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { entrarAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoSenha } from "@/components/campo-senha";

/** Chave nova: guarda só o e-mail (texto puro, sem senha). */
const CHAVE_EMAIL_LEMBRADO = "meajudaai:email-lembrado";
/**
 * Chave de versões antigas — guardava e-mail e senha em texto puro. Nunca mais
 * escrita; só lida uma vez, para migrar o e-mail e apagar o registro (R-50, D-018).
 */
const CHAVE_CREDENCIAIS_ANTIGA = "meajudaai:credenciais-salvas";

/**
 * `<form action={...}>` com Server Action, não `onSubmit` para o envio em si —
 * o navegador faz o POST, a action roda no servidor e o redirect vem de lá.
 *
 * "Lembrar meu e-mail" é o atalho de conveniência para o protótipo: grava só o
 * e-mail em `localStorage` (só neste navegador) para pré-preencher da próxima
 * vez. A senha nunca é gravada nem lida daqui — quem guarda e restaura senha é
 * o gerenciador do próprio navegador, por isso os `autoComplete` de e-mail e de
 * senha (`current-password`) continuam nos campos. "Criptografar" a senha antes
 * de gravá-la aqui seria falsa segurança: a chave estaria no mesmo navegador
 * (R-50, D-018). Quem tinha senha guardada por uma versão antiga (chave
 * `meajudaai:credenciais-salvas`) tem esse registro migrado — o e-mail é
 * reaproveitado — e apagado já na primeira visita depois desta mudança.
 */
/** Rota `/login`: entrada por e-mail e senha, com mostrar/ocultar senha e "lembrar meu e-mail" (localStorage, só o e-mail). */
export default function LoginPage() {
  const [estado, formAction] = useActionState(entrarAction, null);
  const [email, setEmail] = useState(estado?.valores?.email ?? "");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  // Para onde voltar depois de entrar (`?next=`): lido da URL no navegador e
  // mandado num campo escondido; quem decide se é seguro é o servidor
  // (lib/destino-seguro.ts, em entrarAction).
  const [next, setNext] = useState("");

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
    try {
      // Migração: versões antigas guardavam e-mail + senha em texto puro sob a
      // chave antiga. Aproveita o e-mail, mas a senha é apagada, nunca lida.
      const registroAntigo = localStorage.getItem(CHAVE_CREDENCIAIS_ANTIGA);
      if (registroAntigo !== null) {
        let emailAntigo = "";
        try {
          emailAntigo = JSON.parse(registroAntigo)?.email ?? "";
        } catch {
          // Registro antigo ilegível — apenas remove abaixo, sem aproveitar nada.
        }
        localStorage.removeItem(CHAVE_CREDENCIAIS_ANTIGA);
        if (emailAntigo) localStorage.setItem(CHAVE_EMAIL_LEMBRADO, emailAntigo);
      }

      const emailGuardado = localStorage.getItem(CHAVE_EMAIL_LEMBRADO);
      if (emailGuardado) {
        setEmail(emailGuardado);
        setLembrar(true);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue sem pré-preencher.
    }
  }, []);

  function aoEnviar() {
    try {
      if (lembrar) localStorage.setItem(CHAVE_EMAIL_LEMBRADO, email);
      else localStorage.removeItem(CHAVE_EMAIL_LEMBRADO);
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
        <input type="hidden" name="next" value={next} />
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
        <CampoSenha
          id="senha"
          name="senha"
          label="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Lembrar meu e-mail
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
      </form>
    </main>
  );
}
