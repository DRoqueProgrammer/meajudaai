"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trocarMeuPapelAction } from "@/lib/actions/auth";
import { FormError } from "@/components/ui";

/**
 * Saída para quem escolheu o papel errado no cadastro.
 *
 * O papel decide o RBAC inteiro: um ajudante que virou "profissional" sem
 * querer não tem /vagas no rodapé e não consegue procurar trabalho. Até esta
 * tela existir, só o sysadmin conseguia desfazer isso.
 */
export function TrocarPapel({ papelAtual }: { papelAtual: "admin" | "ajudante" }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const alvo = papelAtual === "admin" ? "ajudante" : "admin";
  const souProfissional = papelAtual === "admin";

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">
          Sua conta é de{" "}
          <strong className="font-medium text-ink">
            {souProfissional ? "profissional" : "ajudante"}
          </strong>
          {souProfissional ? " — você publica diárias." : " — você se candidata a diárias."}
        </p>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="min-h-11 self-start text-sm text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {souProfissional ? "Na verdade eu quero trabalhar" : "Na verdade eu preciso de ajudante"}
        </button>
        {erro ? <FormError>{erro}</FormError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand bg-tint-info p-3">
      <p className="text-sm">
        Trocar para{" "}
        <strong className="font-semibold">
          {alvo === "admin" ? "profissional" : "ajudante"}
        </strong>
        ?{" "}
        {alvo === "admin"
          ? "Você passa a publicar diárias e escolher candidatos."
          : "Você passa a buscar vagas e se candidatar."}
      </p>
      <p className="text-xs text-muted">
        Só dá para trocar enquanto você não tem vaga publicada nem candidatura enviada.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="btn-ghost px-4 text-xs"
        >
          Deixar como está
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-brand px-4 text-xs"
          onClick={() =>
            start(async () => {
              const r = await trocarMeuPapelAction(alvo);
              if (r.ok) {
                setConfirmando(false);
                router.push("/inicio");
                router.refresh();
              } else setErro(r.erro ?? "Não foi possível trocar.");
            })
          }
        >
          {pending ? "Trocando…" : "Trocar papel"}
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
