import { redirect } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { servicosPorHorario } from "@/lib/servico-do-horario";
import { CriarSlotForm } from "@/components/agenda/criar-slot-form";
import { AgendaCalendarV2, type AgendaEvento } from "@/components/agenda/agenda-calendar-v2";
import { AgendasAbertas } from "@/components/agenda/agendas-abertas";
import type { PerfilResumo } from "@/components/perfil-popover";
import { resumoHorariosAbertos } from "@/lib/agenda-resumo";

/**
 * Rota `/agenda`: prestador vê/oferece os próprios horários (agenda v2:
 * clicáveis, aceitar/cancelar, observações privadas — DESIGN_MEAJUDAAI_V2.md e
 * ROADMAP.md §8); cliente vê os horários que já reservou, no mesmo calendário,
 * mas sem as ações de prestador (ver componente `SlotDetalheCliente`).
 */
export default async function AgendaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico" && user.role !== "cliente") redirect("/inicio");

  const sb = await createServerClient();

  if (user.role === "cliente") {
    const { data: servicos } = await sb
      .from("servicos")
      .select("id, slot_id, descricao, preco_tipo, preco_valor, status, cancelado_motivo, prestador_id")
      .eq("cliente_id", user.id);

    const slotIds = (servicos ?? []).map((s) => s.slot_id);
    const { data: slots } = slotIds.length
      ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim, status").in("id", slotIds)
      : { data: [] };
    const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));

    const prestadorIds = [...new Set((servicos ?? []).map((s) => s.prestador_id))];
    const { data: prestadores } = prestadorIds.length
      ? await sb
          .from("profiles")
          .select("user_id, nome, foto_url, genero, tipo_base, nota_media, total_avaliacoes, verificado")
          .in("user_id", prestadorIds)
      : { data: [] };
    const prestadorDe = new Map((prestadores ?? []).map((p) => [p.user_id, p]));

    const eventos: AgendaEvento[] = [];
    // Serializável — nunca uma função: este é um Server Component, e RSC não
    // deixa passar closures pra um Client Component (só dados).
    const prestadoresPorServico: Record<string, PerfilResumo> = {};
    for (const s of servicos ?? []) {
      const slot = slotDe.get(s.slot_id);
      if (!slot) continue;
      eventos.push({
        slot,
        servico: {
          id: s.id,
          descricao: s.descricao,
          preco_tipo: s.preco_tipo,
          preco_valor: s.preco_valor,
          status: s.status,
          cancelado_motivo: s.cancelado_motivo,
        },
        logs: [],
      });
      const p = prestadorDe.get(s.prestador_id);
      if (p) {
        prestadoresPorServico[s.id] = {
          userId: p.user_id,
          nome: p.nome,
          fotoUrl: p.foto_url,
          genero: p.genero,
          papel: p.tipo_base as AppRole,
          notaMedia: p.nota_media,
          totalAvaliacoes: p.total_avaliacoes,
          verificado: p.verificado,
        };
      }
    }

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Minha agenda</h1>
        <p className="text-sm text-muted">Os horários que você já reservou com prestadores.</p>
        <AgendaCalendarV2 eventos={eventos} variant="cliente" prestadoresPorServico={prestadoresPorServico} />
      </div>
    );
  }
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
        .select("id, slot_id, descricao, preco_tipo, preco_valor, status, cancelado_motivo, cliente_id, created_at")
        .in("slot_id", slotIds)
    : { data: [] };

  const clienteIds = [...new Set((servicos ?? []).map((s) => s.cliente_id))];
  const { data: clientesNomes } = clienteIds.length
    ? await sb.from("profiles").select("user_id, nome").in("user_id", clienteIds)
    : { data: [] };
  const nomeDeCliente = new Map((clientesNomes ?? []).map((c) => [c.user_id, c.nome]));

  // Um horário pode ter um cancelado e um novo (migration 0048): fica o que ocupa.
  const servicoDeSlot = new Map(
    [...servicosPorHorario(servicos ?? []).values()].map((s) => [
      s.slot_id,
      { ...s, clienteNome: nomeDeCliente.get(s.cliente_id) ?? null },
    ]),
  );

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

  const periodosAbertos = resumoHorariosAbertos(slots ?? []);

  // Horário 'fechado' (migration 0046) não é aberto e não aparece na agenda —
  // some da grade e do calendário, não só do resumo.
  const eventosAbertos: AgendaEvento[] = (slots ?? [])
    .filter((slot) => slot.status !== "fechado")
    .map((slot): AgendaEvento => {
      const servico = servicoDeSlot.get(slot.id) ?? null;
      return { slot, servico, logs: servico ? (logsDeServico.get(servico.id) ?? []) : [] };
    });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Minha agenda</h1>
      <p className="text-sm text-muted">Ofereça horários e acompanhe os serviços agendados.</p>

      <AgendasAbertas periodos={periodosAbertos} />

      <CriarSlotForm />
      <AgendaCalendarV2 eventos={eventosAbertos} />
    </div>
  );
}
