import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { SlotDetalhe } from "@/components/agenda/slot-detalhe";

/**
 * Rota `/agenda/[slotId]` (prestador): detalhe completo de um horário —
 * aceitar/cancelar o serviço, observações privadas. O card efêmero na linha
 * do tempo (`EventoPopover`) linka pra cá em vez de expandir tudo inline.
 */
export default async function AgendaSlotPage({ params }: { params: Promise<{ slotId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const { slotId } = await params;
  const sb = await createServerClient();
  const { data: slot } = await sb
    .from("agenda_slots")
    .select("id, data, hora_inicio, hora_fim, status")
    .eq("id", slotId)
    .eq("prestador_id", user.id)
    .maybeSingle();
  if (!slot) notFound();

  const { data: servico } = await sb
    .from("servicos")
    .select("id, descricao, preco_tipo, preco_valor, status, cancelado_motivo")
    .eq("slot_id", slotId)
    .maybeSingle();

  const { data: logs } = servico
    ? await sb
        .from("servico_logs")
        .select("id, texto, created_at")
        .eq("servico_id", servico.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/agenda" className="text-sm font-semibold text-brand">
        ← Voltar pra agenda
      </Link>
      <SlotDetalhe slot={slot} servico={servico ?? null} logs={logs ?? []} paginaCompleta />
    </div>
  );
}
