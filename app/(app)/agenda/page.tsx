import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { CriarSlotForm } from "@/components/agenda/criar-slot-form";
import { AgendaCalendarV2, type AgendaEvento } from "@/components/agenda/agenda-calendar-v2";

/**
 * Rota `/agenda` (prestador de serviço) — agenda v2: horários oferecidos,
 * clicáveis para ver o serviço associado, aceitar/cancelar e anotar
 * observações privadas. Ver DESIGN_MEAJUDAAI_V2.md e ROADMAP.md §8.
 */
export default async function AgendaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const sb = await createServerClient();
  const { data: slots } = await sb
    .from("agenda_slots")
    .select("id, data, hora_inicio, hora_fim, status")
    .eq("prestador_id", user.id)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: servicos } = slotIds.length
    ? await sb
        .from("servicos")
        .select("id, slot_id, descricao, preco_tipo, preco_valor, status, cancelado_motivo")
        .in("slot_id", slotIds)
    : { data: [] };
  const servicoDeSlot = new Map((servicos ?? []).map((s) => [s.slot_id, s]));

  const servicoIds = (servicos ?? []).map((s) => s.id);
  const { data: logs } = servicoIds.length
    ? await sb
        .from("servico_logs")
        .select("id, servico_id, texto, created_at")
        .in("servico_id", servicoIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  type LogRow = { id: string; servico_id: string; texto: string; created_at: string };
  const logsDeServico = new Map<string, LogRow[]>();
  for (const l of (logs ?? []) as LogRow[]) {
    if (!logsDeServico.has(l.servico_id)) logsDeServico.set(l.servico_id, []);
    logsDeServico.get(l.servico_id)!.push(l);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Minha agenda</h1>
      <p className="text-sm text-muted">Ofereça horários e acompanhe os serviços agendados.</p>
      <CriarSlotForm />
      <AgendaCalendarV2
        eventos={(slots ?? []).map(
          (slot): AgendaEvento => {
            const servico = servicoDeSlot.get(slot.id) ?? null;
            return { slot, servico, logs: servico ? (logsDeServico.get(servico.id) ?? []) : [] };
          },
        )}
      />
    </div>
  );
}
