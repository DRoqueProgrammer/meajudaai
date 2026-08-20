"use client";

import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { enviarMensagemAction } from "@/lib/actions/mensagens";
import { marcarMensagensLidasAction } from "@/lib/actions/leitura";

export interface Msg {
  id: string;
  remetente_id: string;
  conteudo: string;
  created_at: string;
}

/** Thread de chat de uma conversa: escuta mensagens por Realtime, envia de forma otimista e marca como lida ao abrir. */
export function ChatThread({
  conversaId,
  meId,
  initial,
}: {
  conversaId: string;
  meId: string;
  initial: Msg[];
}) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [estado, formAction, pending] = useActionState(enviarMensagemAction, null);
  const [otimistas, addOtimista] = useOptimistic<Msg[], string>(
    [],
    (atuais, conteudo) => [
      ...atuais,
      { id: `pendente-${atuais.length}`, remetente_id: meId, conteudo, created_at: new Date().toISOString() },
    ],
  );
  const fim = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    const ch = sb
      .channel(`conversa:${conversaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` },
        (p) => {
          const nova = p.new as Msg;
          setMsgs((m) => (m.some((x) => x.id === nova.id) ? m : [...m, nova]));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [conversaId]);

  // O servidor volta a ser a fonte da verdade sempre que a rota revalida (o que
  // a action faz para o caminho sem JavaScript). O merge por id resolve os dois
  // caminhos — realtime e revalidação — sem duplicar.
  useEffect(() => {
    setMsgs((atuais) => {
      const porId = new Map(atuais.map((m) => [m.id, m]));
      for (const m of initial) porId.set(m.id, m);
      return [...porId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, [initial]);

  // Abrir a conversa zera o cursor de leitura dela.
  useEffect(() => {
    void marcarMensagensLidasAction(conversaId).then(() => router.refresh());
  }, [conversaId, router]);

  const visiveis = [...msgs, ...otimistas];

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, otimistas.length]);

  function aoSubmeter(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const conteudo = new FormData(form).get("mensagem");
    if (typeof conteudo !== "string" || !conteudo.trim()) return;
    startTransition(() => addOtimista(conteudo.trim()));
  }

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <div className="flex h-[70dvh] flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto px-1 py-3">
        {visiveis.map((m) => {
          const meu = m.remetente_id === meId;
          const enviando = m.id.startsWith("pendente-");
          return (
            <div key={m.id} className={`flex flex-col ${meu ? "items-end" : "items-start"}`}>
              <span
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${
                  meu ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-white"
                } ${enviando ? "opacity-70" : ""}`}
              >
                {m.conteudo}
              </span>
              {enviando ? <span className="mt-0.5 text-[11px] text-muted">enviando…</span> : null}
            </div>
          );
        })}
        {visiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Ainda não há mensagens. Comece a conversa.</p>
        ) : null}
        <div ref={fim} />
      </div>
      {estado?.erro ? (
        <p role="alert" className="border-t border-line pt-3 text-sm text-danger">
          {estado.erro} Seu texto voltou para o campo — é só tocar em Enviar de novo.
        </p>
      ) : null}
      <form ref={formRef} action={formAction} onSubmit={aoSubmeter} className="flex gap-2 border-t border-line pt-3">
        <input type="hidden" name="conversaId" value={conversaId} />
        <label htmlFor="mensagem" className="sr-only">
          Mensagem
        </label>
        <input
          id="mensagem"
          name="mensagem"
          className="input rounded-full"
          defaultValue={estado?.valores?.mensagem ?? ""}
          placeholder="Mensagem…"
          required
        />
        <button type="submit" className="btn-brand rounded-full px-5" disabled={pending}>
          Enviar
        </button>
      </form>
    </div>
  );
}
