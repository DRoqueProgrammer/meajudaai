"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cadastrarAction } from "@/lib/actions/auth";
import { CIDADES } from "@/lib/cidades";
import { mascaraCPF, mascaraTelefone } from "@/lib/format";
import { Logo } from "@/components/logo";
import { FormError } from "@/components/ui";
import { BotaoEnviar } from "@/components/botao-enviar";

export type Papel = "admin" | "ajudante";

export interface ConviteInfo {
  token: string;
  equipeNome: string;
  papelLabel: string;
}

/** "admin" é o profissional que contrata — o nome vem do schema, não da UI. */
const PAPEIS = [
  {
    valor: "admin" as const,
    titulo: "Preciso de ajudante",
    desc: "Publico diárias e escolho quem vai para a obra.",
    confirmacao: "Sua conta vai publicar vagas e receber candidatos.",
  },
  {
    valor: "ajudante" as const,
    titulo: "Quero trabalhar",
    desc: "Procuro diária e me candidato às vagas.",
    confirmacao: "Sua conta vai buscar vagas e se candidatar.",
  },
];

export function CadastroForm({
  papelInicial,
  convite = null,
}: {
  papelInicial: Papel | null;
  convite?: ConviteInfo | null;
}) {
  const [estado, formAction] = useActionState(cadastrarAction, null);

  const v = estado?.valores ?? {};
  const [cpf, setCpf] = useState(v.cpf ?? "");
  const [telefone, setTelefone] = useState(v.telefone ?? "");
  const [papel, setPapel] = useState<Papel | null>(
    (v.tipo_base as Papel | undefined) ?? papelInicial,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-10">
      <Logo />
      <h1 className="text-2xl font-semibold text-brand">Criar conta</h1>
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
      >
        {convite ? (
          // Cadastro via convite: o papel é definido pelo convite, não escolhido.
          <div className="rounded-xl border border-brand bg-[#e6effb] p-3">
            <input type="hidden" name="convite_token" value={convite.token} />
            <p className="text-sm">
              Você foi convidado para <strong className="font-semibold">{convite.equipeNome}</strong>{" "}
              como <strong className="font-semibold">{convite.papelLabel}</strong>. Complete o cadastro
              — o responsável pela equipe aprova o seu acesso.
            </p>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-1">Você está aqui para quê?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAPEIS.map((p) => (
                <label
                  key={p.valor}
                  className="flex min-h-[76px] cursor-pointer flex-col justify-center gap-0.5 rounded-xl border-2 border-line bg-white px-4 py-3 text-left transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                >
                  <input
                    type="radio"
                    name="tipo_base"
                    value={p.valor}
                    checked={papel === p.valor}
                    onChange={() => setPapel(p.valor)}
                    required
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{p.titulo}</span>
                  <span className="text-xs leading-snug text-muted [.text-white_&]:text-white">
                    {p.desc}
                  </span>
                </label>
              ))}
            </div>
            <p aria-live="polite" className="text-xs text-muted">
              {papel
                ? PAPEIS.find((p) => p.valor === papel)!.confirmacao
                : "Dá para trocar depois, enquanto você não tiver vaga nem candidatura."}
            </p>
          </fieldset>
        )}
        <div>
          <label className="label" htmlFor="nome">
            Nome
          </label>
          <input id="nome" name="nome" autoComplete="name" className="input" defaultValue={v.nome ?? ""} required />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" autoComplete="email" className="input" type="email" defaultValue={v.email ?? ""} required />
        </div>
        <div>
          <label className="label" htmlFor="senha">
            Senha
          </label>
          <input id="senha" name="senha" autoComplete="new-password" className="input" type="password" required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              className="input"
              value={cpf}
              onChange={(e) => setCpf(mascaraCPF(e.target.value))}
              aria-describedby="pii-motivo"
              required
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="telefone">
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="input"
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              aria-describedby="pii-motivo"
              required
            />
          </div>
        </div>
        <p id="pii-motivo" className="-mt-1 text-xs leading-relaxed text-muted">
          CPF e telefone ficam guardados e <strong className="font-medium">nunca aparecem</strong> no
          seu perfil. Servem para verificar que você é uma pessoa real — é o que dá o selo de perfil
          verificado e o que faz o outro lado aceitar a diária.
        </p>
        <div>
          <label className="label" htmlFor="cidade">
            Cidade
          </label>
          <select
            id="cidade"
            name="cidadeUf"
            autoComplete="address-level2"
            className="input"
            defaultValue={v.cidadeUf ?? "Niterói|RJ"}
          >
            {CIDADES.map((c) => (
              <option key={`${c.nome}|${c.uf}`} value={`${c.nome}|${c.uf}`}>
                {c.nome} - {c.uf}
              </option>
            ))}
          </select>
        </div>
        {estado?.erro ? <FormError>{estado.erro}</FormError> : null}
        <p className="text-xs leading-relaxed text-muted">
          Ao criar conta, você concorda com os{" "}
          <Link href="/termos" className="text-brand underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <BotaoEnviar className="btn-brand mt-1" enviando="Criando…" desabilitado={!convite && !papel}>
          CRIAR CONTA
        </BotaoEnviar>
        <Link href="/login" className="link-touch">
          Já tenho conta
        </Link>
      </form>
    </main>
  );
}
