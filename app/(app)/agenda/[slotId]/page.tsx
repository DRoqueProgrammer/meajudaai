import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { SlotDetalhe } from "@/components/agenda/slot-detalhe";
import { CobrancaPix } from "@/components/pix/cobranca-pix";
import { ClienteDoServico } from "@/components/agenda/cliente-do-servico";
import { listarTiposServico } from "@/lib/tipos-servico";
import type { AppRole } from "@/lib/auth/roles";

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
    .select("id, descricao, preco_tipo, preco_valor, status, cancelado_motivo, cliente_id, endereco, lat, lng, tipo")
    .eq("slot_id", slotId)
    .maybeSingle();
  const tipos = await listarTiposServico(sb);

  const { data: logs } = servico
    ? await sb
        .from("servico_logs")
        .select("id, texto, created_at")
        .eq("servico_id", servico.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: meuPerfil } = await sb.from("profiles").select("nome, cidade").eq("user_id", user.id).maybeSingle();
  const { data: minhaPii } = await sb.from("profiles_pii").select("chave_pix").eq("user_id", user.id).maybeSingle();
  const { data: cliente } = servico
    ? await sb
        .from("profiles")
        .select("nome, foto_url, genero, tipo_base, nota_media, total_avaliacoes, verificado")
        .eq("user_id", servico.cliente_id)
        .maybeSingle()
    : { data: null };
  // Liberado só porque há um serviço em comum (tem_servico_com — migration 0027).
  const { data: clientePii } = servico
    ? await sb.from("profiles_pii").select("telefone, is_whatsapp").eq("user_id", servico.cliente_id).maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/agenda" className="text-sm font-semibold text-brand">
        ← Voltar pra agenda
      </Link>
      <SlotDetalhe slot={slot} servico={servico ?? null} logs={logs ?? []} tipos={tipos} paginaCompleta />
      {servico && cliente ? (
        <ClienteDoServico
          perfil={{
            userId: servico.cliente_id,
            nome: cliente.nome,
            fotoUrl: cliente.foto_url,
            genero: cliente.genero,
            papel: cliente.tipo_base as AppRole,
            notaMedia: cliente.nota_media,
            totalAvaliacoes: cliente.total_avaliacoes,
            verificado: cliente.verificado,
          }}
          telefone={clientePii?.telefone ?? null}
          isWhatsapp={clientePii?.is_whatsapp ?? false}
          endereco={servico.endereco}
          local={servico.lat != null && servico.lng != null ? { lat: servico.lat, lng: servico.lng } : null}
        />
      ) : null}
      {servico && minhaPii?.chave_pix ? (
        <CobrancaPix
          chavePix={minhaPii.chave_pix}
          nomePrestador={meuPerfil?.nome ?? ""}
          cidade={meuPerfil?.cidade ?? null}
          nomeCliente={cliente?.nome ?? "Cliente"}
          data={slot.data}
          descricao={servico.descricao}
          valor={servico.preco_valor}
        />
      ) : null}
    </div>
  );
}
