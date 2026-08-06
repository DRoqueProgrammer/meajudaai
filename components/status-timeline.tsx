/**
 * Timeline vertical do ciclo da diária (padrão CareConnect / ObraFácil).
 * Presentational — recebe a etapa atual já derivada dos status reais
 * (vagas.status + candidaturas.status + avaliação). Ver [[status-lifecycle]].
 */

const STEPS = [
  { label: "Vaga publicada", hint: "no ar para ajudantes próximos" },
  { label: "Candidato aceito", hint: "contato liberado entre os dois" },
  { label: "Diária em andamento", hint: "dia do serviço na obra" },
  { label: "Diária concluída", hint: "serviço entregue" },
  { label: "Avaliação", hint: "profissional e ajudante se avaliam" },
];

export function StatusTimeline({
  current,
  terminal,
}: {
  current: number;
  /** Estado terminal (recusada/cancelada) — substitui a timeline por um aviso. */
  terminal?: string | null;
}) {
  if (terminal) {
    return (
      <div className="card border-danger/30 bg-[#fdeaea]">
        <p className="text-sm font-semibold text-danger">{terminal}</p>
        <p className="mt-1 text-xs text-muted">Esta diária não seguiu adiante.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Andamento da diária
      </p>
      <ol className="flex flex-col">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const last = i === STEPS.length - 1;
          return (
            <li key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-action-dark text-white"
                      : active
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {!last && (
                  <span
                    className={`w-0.5 flex-1 ${done ? "bg-action" : "bg-line"}`}
                    style={{ minHeight: 18 }}
                  />
                )}
              </div>
              <div className={last ? "pb-0" : "pb-4"}>
                <p
                  className={`flex flex-wrap items-center gap-2 text-sm font-medium ${
                    active ? "text-brand" : done ? "text-ink" : "text-muted"
                  }`}
                >
                  {s.label}
                  {active && (
                    <span className="rounded-full bg-[#e6effb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      você está aqui
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
