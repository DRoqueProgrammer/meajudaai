"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderCandidaturaAction } from "@/lib/actions/candidaturas";
import { FormError, StatusBadge } from "@/components/ui";
import { formatData, formatBRL } from "@/lib/format";

/**
 * Aceitar é a decisão mais cara do app: coloca uma pessoa na sua obra amanhã e
 * não tem desfazer. Por isso a confirmação é inline (e não um window.confirm,
 * que não cabe o resumo da diária) e repete nome, data e valor antes do commit.
 * Recusar não confirma: é reversível na prática — o ajudante pode se candidatar
 * de novo enquanto a vaga estiver aberta.
 */
export function ResponderCandidatura({
  candidaturaId,
  status,
  nome,
  dataServico,
  valorDiaria,
}: {
  candidaturaId: string;
  status: string;
  nome: string;
  dataServico: string | null;
  valorDiaria: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  if (status !== "aguardando") {
    // POV do profissional: ele confirmou/recusou este candidato — não "Você foi
    // aceito". Mesmo badge (verde/vermelho) do resto do app, rótulo do contexto.
    return <StatusBadge status={status} label={status === "aceito" ? "Confirmado" : "Recusado"} />;
  }

  function responder(decisao: "aceito" | "recusado") {
    start(async () => {
      const r = await responderCandidaturaAction(candidaturaId, decisao);
      if (r.ok) router.refresh();
      else {
        setConfirmando(false);
        setErro(r.erro ?? "Não foi possível responder. Tente de novo.");
      }
    });
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-brand bg-tint-info p-3">
        <p className="text-sm">
          Confirmar <strong className="font-semibold">{nome}</strong> para a diária
          {dataServico ? ` de ${formatData(dataServico)}` : ""}
          {typeof valorDiaria === "number" ? `, ${formatBRL(valorDiaria)}` : ""}?
        </p>
        <p className="text-xs text-muted">
          O chat abre para vocês combinarem o serviço, e a vaga sai do ar para novos candidatos.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={pending}
            className="btn-ghost px-4 text-xs"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => responder("aceito")}
            disabled={pending}
            className="btn-action px-4 text-xs"
          >
            {pending ? "Confirmando…" : "Confirmar ajudante"}
          </button>
        </div>
      </div>
    );
  }

  return (
    // gap-3: Recusar e Aceitar têm consequências opostas e nenhuma volta.
    // 8px entre dois alvos assim gera aceite acidental no celular.
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => responder("recusado")} disabled={pending} className="btn-ghost px-4 text-xs">
        Recusar
      </button>
      <button onClick={() => setConfirmando(true)} disabled={pending} className="btn-action px-4 text-xs">
        Aceitar
      </button>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
