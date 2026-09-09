import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { CancelarServicoBotao } from "@/components/agenda/cancelar-servico-botao";
import { ResponderRenegociacao } from "@/components/agenda/responder-renegociacao";
import { formatBRL, formatData, formatHora } from "@/lib/format";

/** Rota `/meus-servicos` (cliente): histórico dos agendamentos feitos. */
export default async function MeusServicosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "cliente") redirect("/inicio");

  const sb = await createServerClient();
  const { data: servicos } = await sb
    .from("servicos")
    .select("id, descricao, preco_tipo, preco_valor, preco_pendente, status, cancelado_motivo, prestador_id, slot_id")
    .eq("cliente_id", user.id)
    .order("created_at", { ascending: false });

  const prestadorIds = [...new Set((servicos ?? []).map((s) => s.prestador_id))];
  const { data: prestadores } = prestadorIds.length
    ? await sb.from("profiles").select("user_id, nome").in("user_id", prestadorIds)
    : { data: [] };
  const nomeDe = new Map((prestadores ?? []).map((p) => [p.user_id, p.nome]));

  const slotIds = (servicos ?? []).map((s) => s.slot_id);
  const { data: slots } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds)
    : { data: [] };
  const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Meus serviços</h1>
      {(servicos ?? []).length === 0 ? (
        <p className="text-sm text-muted">Você ainda não agendou nenhum serviço.</p>
      ) : (
        (servicos ?? []).map((s) => {
          const slot = slotDe.get(s.slot_id);
          return (
            <div key={s.id} className="card flex flex-col gap-1">
              <p className="text-sm font-semibold">{nomeDe.get(s.prestador_id) ?? "Prestador"}</p>
              {slot ? (
                <p className="text-xs text-muted">
                  {formatData(slot.data)} · {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fim)}
                </p>
              ) : null}
              <p className="text-sm">{s.descricao}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brand">
                  {formatBRL(s.preco_valor)} {s.preco_tipo === "hora" ? "/h" : ""}
                </span>
                <span className="text-xs font-semibold uppercase text-muted">{s.status}</span>
              </div>
              {s.cancelado_motivo ? <p className="text-xs text-danger">Cancelado: {s.cancelado_motivo}</p> : null}
              {s.preco_pendente != null ? (
                <ResponderRenegociacao servicoId={s.id} precoPendente={s.preco_pendente} />
              ) : null}
              {s.status === "pendente" || s.status === "confirmado" ? (
                <CancelarServicoBotao servicoId={s.id} />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
