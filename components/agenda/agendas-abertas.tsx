"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fecharAgendaAbertaAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";
import { formatData, formatHora } from "@/lib/format";
import type { PeriodoAberto } from "@/lib/agenda-resumo";

const DIA_LETRA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Grade de "agendas abertas" do prestador — substitui o card longo "Você está
 * aberto para" (pedido do Leonardo em 10/09/2026: "está feia a questão da
 * agenda ali também, um card longo, na maioria vazio. Não tem necessidade,
 * faça mais bonito"). Cada cartão resume uma faixa hora_inicio/hora_fim (o
 * mesmo agrupamento de `resumoHorariosAbertos`) com os dias da semana como
 * bolinhas e um X vermelho para fechá-la — com confirmação, bloqueada se a
 * faixa tiver serviço agendado.
 */
export function AgendasAbertas({ periodos }: { periodos: PeriodoAberto[] }) {
  const router = useRouter();
  const [alvo, setAlvo] = useState<PeriodoAberto | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), 4000);
    return () => clearTimeout(t);
  }, [mensagem]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Agendas abertas</h2>
        {mensagem ? (
          <p role="status" className="text-xs font-medium text-ok">
            {mensagem}
          </p>
        ) : null}
      </div>

      {periodos.length === 0 ? (
        <p className="card-vazio">Nenhuma agenda aberta — abra horários abaixo.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {periodos.map((p) => (
            <div key={`${p.horaInicio}-${p.horaFim}`} className="card relative flex flex-col gap-2 pr-11">
              <p className="text-base font-semibold text-ink">
                {formatHora(p.horaInicio)}–{formatHora(p.horaFim)}
              </p>
              <div className="flex gap-1">
                {DIA_LETRA.map((letra, dia) => (
                  <span
                    key={dia}
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-rotulo font-semibold ${
                      p.diasSemanaAtivos.includes(dia) ? "bg-brand-fill text-white" : "bg-tint-neutral text-muted"
                    }`}
                  >
                    {letra}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted">até {formatData(p.dataMax)}</p>

              <button
                type="button"
                onClick={() => setAlvo(p)}
                aria-label={`Fechar agenda das ${formatHora(p.horaInicio)} às ${formatHora(p.horaFim)}`}
                className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full text-danger transition hover:bg-tint-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ✕
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {alvo ? (
        <ConfirmarFechar
          periodo={alvo}
          onFechar={() => setAlvo(null)}
          onFechado={() => {
            setAlvo(null);
            setMensagem("Agenda fechada.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Confirmação antes de fechar uma agenda aberta — diálogo acessível (foco
 * preso entre os dois botões, Esc fecha) porque a ação é destrutiva: fechar
 * tira do ar todo dia livre dessa faixa. Se a faixa tiver serviço agendado, o
 * botão de confirmar fica desabilitado e o próprio diálogo explica por quê —
 * a checagem de verdade é a `fecharAgendaAbertaAction` (e o gatilho do banco
 * atrás dela), isto aqui só evita a viagem ao servidor para um clique que a
 * tela já sabe que vai falhar.
 */
function ConfirmarFechar({
  periodo,
  onFechar,
  onFechado,
}: {
  periodo: PeriodoAberto;
  onFechar: () => void;
  onFechado: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const temConflito = periodo.datasComServico.length > 0;

  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    function focaveis(): HTMLElement[] {
      return Array.from(
        dialogEl!.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
    }
    focaveis()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focaveis();
      if (els.length === 0) return;
      const primeiro = els[0]!;
      const ultimo = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFechar só troca de identidade, não de comportamento; reexecutar o efeito por isso trocaria o foco inicial a cada render.
  }, []);

  const horaInicio = formatHora(periodo.horaInicio);
  const horaFim = formatHora(periodo.horaFim);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onFechar}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fechar-agenda-titulo"
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="fechar-agenda-titulo" className="text-sm font-semibold text-ink">
          Fechar a agenda das {horaInicio} às {horaFim}?
        </p>
        <p className="mt-1 text-sm text-muted">Os dias livres dessa agenda deixam de aceitar reserva.</p>

        {temConflito ? (
          <p className="mt-2 text-sm text-danger">
            Esta agenda tem serviços agendados ({periodo.datasComServico.map((d) => formatData(d)).join(", ")}). Cancele ou
            conclua esses serviços antes de fechar.
          </p>
        ) : null}
        {erro ? <FormError className="mt-2">{erro}</FormError> : null}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onFechar} className="btn-ghost flex-1 text-xs">
            Voltar
          </button>
          <button
            type="button"
            disabled={temConflito || pending}
            onClick={() =>
              start(async () => {
                const r = await fecharAgendaAbertaAction({ horaInicio: periodo.horaInicio, horaFim: periodo.horaFim });
                if (r.ok) onFechado();
                else setErro(r.erro ?? "Não foi possível fechar a agenda.");
              })
            }
            className="btn-danger flex-1 text-xs"
          >
            {pending ? "Fechando…" : "Fechar agenda"}
          </button>
        </div>
      </div>
    </div>
  );
}
