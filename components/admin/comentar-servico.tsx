"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { comentarServicoAction } from "@/lib/actions/admin-servicos";
import { FormError } from "@/components/ui";

export interface ComentarServicoProps {
  servicoId: string;
  /** Prestador → cliente do serviço, pro nome acessível do campo — a lista renderiza um
   * card por serviço, e "Comentar…" repetido em cada linha não diz sobre QUAL serviço
   * (parecer de design, item [MÉDIO] "~30 campos sem label" em /admin/servicos). */
  contexto: string;
  comentarios: { id: string; texto: string; publico: boolean; created_at: string }[];
}

/** SysAdmin comenta um serviço — checkbox de público desmarcada por padrão (fica privado). */
export function ComentarServico({ servicoId, contexto, comentarios }: ComentarServicoProps) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [publico, setPublico] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      {comentarios.map((c) => (
        <p key={c.id} className="text-xs text-muted">
          {new Date(c.created_at).toLocaleDateString("pt-BR")} — {c.texto}{" "}
          <span className={c.publico ? "text-action" : "text-muted"}>({c.publico ? "público" : "privado"})</span>
        </p>
      ))}
      <div className="flex gap-2">
        <input
          className="input flex-1 text-xs"
          placeholder="Comentar…"
          aria-label={`Comentar sobre o serviço de ${contexto}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <label className="flex items-center gap-1 text-xs text-muted">
          <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} /> Público
        </label>
        <button
          type="button"
          disabled={pending || !texto.trim()}
          className="btn-ghost px-3 text-xs"
          onClick={() =>
            start(async () => {
              const r = await comentarServicoAction({ servicoId, texto, publico });
              if (r.ok) {
                setTexto("");
                router.refresh();
              } else setErro(r.erro ?? "Não foi possível comentar.");
            })
          }
        >
          Comentar
        </button>
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
    </div>
  );
}
