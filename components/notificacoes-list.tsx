"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { marcarNotificacoesVistasAction } from "@/lib/actions/leitura";
import { formatData } from "@/lib/format";

export interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  visualizada: boolean;
  created_at: string;
  link: string | null;
}

/**
 * Destino por tipo, para as notificações gravadas antes da migration 0011 —
 * elas não têm `link`. Menos preciso que o link salvo (leva à lista, não ao
 * item), mas melhor que card morto.
 */
const DESTINO_POR_TIPO: Record<string, string> = {
  nova_candidatura: "/minhas-vagas",
  candidatura_aceita: "/minhas-diarias",
  candidatura_recusada: "/minhas-diarias",
  vaga_cancelada: "/minhas-diarias",
  diaria_concluida: "/minhas-diarias",
  mensagem_recebida: "/mensagens",
  convite_equipe: "/equipe",
};

export function NotificacoesList({ meId, initial }: { meId: string; initial: Notif[] }) {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>(initial);

  useEffect(() => {
    const sb = createBrowserClient();
    const ch = sb
      .channel(`notif:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${meId}` },
        (p) => {
          const nova = p.new as Notif;
          setNotifs((n) => (n.some((x) => x.id === nova.id) ? n : [nova, ...n]));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [meId]);

  // Abrir a tela é o que marca como visto — `visualizada` nunca era escrito, então
  // o contador do rodapé cresceria para sempre. O estado local não muda: quem
  // acabou de abrir continua vendo qual era novidade nesta visita.
  useEffect(() => {
    if (!initial.some((n) => !n.visualizada)) return;
    void marcarNotificacoesVistasAction().then(() => {
      // `revalidatePath` na action só invalida o cache; sem `refresh` o badge do
      // rodapé continua com o número antigo até a próxima navegação. O estado
      // local não é tocado, então os pontos azuis desta visita permanecem.
      router.refresh();
    });
  }, [initial, router]);

  if (notifs.length === 0) {
    return <p className="card-vazio">Sem notificações por enquanto.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifs.map((n) => {
        const destino = n.link ?? DESTINO_POR_TIPO[n.tipo] ?? null;
        const conteudo = (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {!n.visualizada ? (
                  <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
                ) : null}
                {n.titulo}
                {!n.visualizada ? <span className="sr-only"> (nova)</span> : null}
              </p>
              <span className="shrink-0 text-xs text-muted">
                {formatData(n.created_at.slice(0, 10))}
              </span>
            </div>
            {n.mensagem ? <p className="mt-0.5 text-sm text-muted">{n.mensagem}</p> : null}
          </>
        );
        return (
          <li key={n.id}>
            {destino ? (
              <Link
                href={destino}
                className={`card block transition hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  n.visualizada ? "" : "border-brand"
                }`}
              >
                {conteudo}
              </Link>
            ) : (
              <div className={`card ${n.visualizada ? "" : "border-brand"}`}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
