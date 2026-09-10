"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { solicitarExclusaoAction, desistirDaExclusaoAction } from "@/lib/actions/titular";
import { FormError } from "@/components/ui";

/**
 * Seção "Seus dados" do perfil (LGPD art. 18; decisão D-023): os dois direitos
 * novos, ao lado do "Desativar conta" (reversível, `DesativarContaBotao`) que
 * já existia. "Baixar meus dados" é só um link para `GET /api/meus-dados` —
 * a sessão já autentica, não precisa de action. "Excluir meus dados" pede uma
 * confirmação explícita (a anonimização não tem volta depois de rodar) antes
 * de chamar `solicitarExclusaoAction`; com um pedido pendente, mostra a data
 * prevista e troca a oferta por "Desistir".
 */
export function SeusDadosCard({ podeProcessarEm }: { podeProcessarEm: string | null }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function solicitar() {
    start(async () => {
      const r = await solicitarExclusaoAction();
      if (r.ok) {
        setConfirmando(false);
        router.refresh();
      } else {
        setErro(r.erro ?? "Não foi possível registrar o pedido.");
      }
    });
  }

  function desistir() {
    start(async () => {
      const r = await desistirDaExclusaoAction();
      if (r.ok) router.refresh();
      else setErro(r.erro ?? "Não foi possível desistir agora.");
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <div>
        <p className="text-base font-semibold text-ink">Seus dados</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Baixe uma cópia de tudo o que é seu na plataforma, ou peça a exclusão dos seus dados
          pessoais — os dois direitos vêm da LGPD (art. 18).
        </p>
      </div>

      <a href="/api/meus-dados" className="btn-ghost self-start px-4 text-xs">
        Baixar meus dados
      </a>

      {podeProcessarEm ? (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line bg-tint-warn p-3">
          <p className="text-sm text-tint-warn-ink">
            Pedido de exclusão em andamento — previsão de anonimização em{" "}
            <strong className="font-semibold">
              {new Date(podeProcessarEm).toLocaleDateString("pt-BR")}
            </strong>
            . Ainda dá tempo de desistir.
          </p>
          <button
            type="button"
            disabled={pending}
            className="btn-ghost self-start px-4 text-xs"
            onClick={desistir}
          >
            {pending ? "Desistindo…" : "Desistir da exclusão"}
          </button>
        </div>
      ) : !confirmando ? (
        <button
          type="button"
          className="btn-ghost self-start px-4 text-xs text-danger"
          onClick={() => setConfirmando(true)}
        >
          Excluir meus dados
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-danger/40 bg-tint-danger p-3">
          <p className="text-sm text-danger">
            Seus dados pessoais (contato, endereço, foto, bio) são anonimizados em até 15 dias —
            7 dias de carência para desistir, mais o próximo ciclo diário de processamento. O
            histórico de serviços da outra parte continua íntegro, sem nenhum dado seu. Depois de
            concluída, essa ação não tem volta.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              className="btn-ghost self-start px-4 text-xs"
              onClick={() => setConfirmando(false)}
            >
              Deixar como está
            </button>
            <button
              type="button"
              disabled={pending}
              className="btn-ghost self-start border-danger/40 px-4 text-xs text-danger hover:bg-tint-danger"
              onClick={solicitar}
            >
              {pending ? "Enviando…" : "Excluir meus dados"}
            </button>
          </div>
        </div>
      )}

      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
