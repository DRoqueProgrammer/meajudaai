import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { ServicoClienteCard } from "@/components/clientes/servico-cliente-card";
import { TelefoneWhatsApp } from "@/components/telefone-whatsapp";

/**
 * Rota `/clientes/[id]` (prestador): visão limitada do cliente (nome, telefone)
 * + aba de Serviços — histórico com esse cliente, mais recente primeiro,
 * últimos 10 + "ver todos", filtro por descrição. Ver ROADMAP.md §2.3.
 */
export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ todos?: string; busca?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const { id } = await params;
  const { todos, busca } = await searchParams;

  const sb = await createServerClient();
  const { data: perfil } = await sb.from("profiles").select("nome, foto_url").eq("user_id", id).maybeSingle();
  if (!perfil) notFound();
  const { data: pii } = await sb.from("profiles_pii").select("telefone, is_whatsapp").eq("user_id", id).maybeSingle();

  // `.eq("prestador_id", user.id)`: só os serviços que ELE fez com esse cliente —
  // nunca o histórico do cliente com outros prestadores.
  let query = sb
    .from("servicos")
    .select("id, slot_id, descricao, preco_tipo, preco_valor, preco_pendente, status, cancelado_motivo, created_at")
    .eq("prestador_id", user.id)
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });
  if (busca) query = query.ilike("descricao", `%${busca}%`);
  if (!todos) query = query.limit(10);
  const { data: servicos } = await query;

  const servicoIds = (servicos ?? []).map((s) => s.id);
  const { data: logs } = servicoIds.length
    ? await sb.from("servico_logs").select("id, servico_id, texto, created_at").in("servico_id", servicoIds)
    : { data: [] };
  type LogRow = { id: string; servico_id: string; texto: string; created_at: string };
  const logsDe = new Map<string, LogRow[]>();
  for (const l of (logs ?? []) as LogRow[]) {
    if (!logsDe.has(l.servico_id)) logsDe.set(l.servico_id, []);
    logsDe.get(l.servico_id)!.push(l);
  }

  const slotIds = (servicos ?? []).map((s) => s.slot_id);
  const { data: slots } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds)
    : { data: [] };
  const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center gap-3">
        <Avatar nome={perfil.nome} fotoUrl={perfil.foto_url} tamanho="lg" />
        <div>
          <p className="text-lg font-semibold">{perfil.nome}</p>
          {pii?.telefone ? <TelefoneWhatsApp telefone={pii.telefone} isWhatsapp={pii.is_whatsapp} /> : null}
        </div>
      </div>

      <form className="flex gap-2">
        <input
          name="busca"
          defaultValue={busca ?? ""}
          placeholder="Buscar por descrição…"
          className="input flex-1"
        />
        <button type="submit" className="btn-ghost px-4 text-sm">Filtrar</button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Serviços</h2>
        {(servicos ?? []).length === 0 ? (
          <p className="card-vazio">Nenhum serviço com esse cliente ainda.</p>
        ) : (
          (servicos ?? []).map((s) => (
            <ServicoClienteCard key={s.id} servico={s} slot={slotDe.get(s.slot_id) ?? null} logs={logsDe.get(s.id) ?? []} />
          ))
        )}
        {!todos && (servicos ?? []).length === 10 ? (
          <a href={`?todos=1${busca ? `&busca=${encodeURIComponent(busca)}` : ""}`} className="text-sm font-semibold text-brand">
            Ver todos →
          </a>
        ) : null}
      </div>
    </div>
  );
}
