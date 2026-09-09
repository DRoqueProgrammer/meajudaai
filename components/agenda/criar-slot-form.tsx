"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarSlotAction } from "@/lib/actions/agenda-v2";
import { FormError } from "@/components/ui";

/** Formulário do prestador para oferecer um novo horário na agenda. */
export function CriarSlotForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      className="card flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await criarSlotAction({
            data: String(fd.get("data")),
            horaInicio: String(fd.get("horaInicio")),
            horaFim: String(fd.get("horaFim")),
          });
          if (r.ok) {
            setErro(null);
            form.reset();
            router.refresh();
          } else setErro(r.erro ?? "Não foi possível criar o horário.");
        });
      }}
    >
      <p className="text-sm font-semibold">Oferecer um horário</p>
      <div className="grid grid-cols-3 gap-2">
        <input name="data" type="date" required className="input col-span-3 sm:col-span-1" />
        <input name="horaInicio" type="time" required className="input" />
        <input name="horaFim" type="time" required className="input" />
      </div>
      {erro ? <FormError>{erro}</FormError> : null}
      <button type="submit" disabled={pending} className="btn-brand self-start px-4 text-xs">
        {pending ? "Salvando…" : "Adicionar horário"}
      </button>
    </form>
  );
}
