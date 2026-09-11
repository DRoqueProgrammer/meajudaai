import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { PerfilPopover } from "@/components/perfil-popover";
import { FlagsPessoa } from "@/components/flags-pessoa";
import { SinalizarServico } from "@/components/sinalizar-servico";
import { StatusTabs } from "@/components/status-tabs";
import { formatBRL, formatData } from "@/lib/format";
import { quandoDoServico } from "@/lib/periodo-da-visita";
import { listarTiposServico } from "@/lib/tipos-servico";

const TABS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "confirmado", label: "Confirmados" },
  { value: "realizado", label: "Realizados" },
  { value: "cancelado", label: "Cancelados" },
];

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

/** Status em que já houve engajamento de verdade — só nesses dá para sinalizar (pendente ainda não virou nada). */
const STATUS_COM_FLAG = new Set(["confirmado", "realizado", "cancelado"]);

/**
 * Rota `/servicos` (prestador): todos os serviços dele, mais recentes
 * primeiro, com filtro por status (chips via `?status=`, funciona sem JS) e
 * o cliente de cada um — com as red flags aprovadas (`flags_da_pessoa`, ao
 * lado do nome e no cartão de hover) e o ícone de sinalizar
 * (`sinalizarAction`, migration 0055, pedido do Leonardo em 10/09/2026).
 */
export default async function ServicosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const { status } = await searchParams;
  const filtro = TABS.some((t) => t.value === status) ? (status ?? "") : "";

  const sb = await createServerClient();
  let query = sb
    .from("servicos")
    .select(
      "id, descricao, preco_tipo, preco_valor, status, cliente_id, slot_id, tipo, periodo_preferido, hora_combinada_inicio, hora_combinada_fim, created_at",
    )
    .eq("prestador_id", user.id)
    .order("created_at", { ascending: false });
  if (filtro) query = query.eq("status", filtro);
  const { data: servicos } = await query;
  const lista = servicos ?? [];

  const slotIds = [...new Set(lista.map((s) => s.slot_id))];
  const { data: slots } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds)
    : { data: [] };
  const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));

  const clienteIds = [...new Set(lista.map((s) => s.cliente_id))];
  const { data: clientes } = clienteIds.length
    ? await sb
        .from("profiles")
        .select("user_id, nome, foto_url, genero, tipo_base, nota_media, total_avaliacoes, verificado")
        .in("user_id", clienteIds)
    : { data: [] };
  const clienteDe = new Map((clientes ?? []).map((c) => [c.user_id, c]));

  // Bandeiras de cada cliente — flags_da_pessoa só devolve linha pro OUTRO
  // lado (o prestador vê as do cliente, nunca as próprias).
  const flagsPorCliente = new Map(
    await Promise.all(
      clienteIds.map(async (id) => {
        const { data } = await sb.rpc("flags_da_pessoa", { p_alvo: id });
        return [id, data ?? []] as const;
      }),
    ),
  );

  // As próprias sinalizações (a RLS deixa o autor ler as dele) — pra trocar o
  // ícone de sinalizar pelo status, se este serviço já foi sinalizado.
  const servicoIds = lista.map((s) => s.id);
  const { data: minhasSinalizacoes } = servicoIds.length
    ? await sb.from("sinalizacoes").select("servico_id, status, created_at").eq("autor_id", user.id).in("servico_id", servicoIds)
    : { data: [] };
  const sinalizacaoDe = new Map((minhasSinalizacoes ?? []).map((s) => [s.servico_id, s]));

  const tipos = await listarTiposServico(sb);
  const nomeTipo = new Map(tipos.map((t) => [t.slug, t.nome]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Serviços</h1>
      <p className="text-sm text-muted">Todos os serviços que você já teve, com o cliente de cada um.</p>

      <StatusTabs base="/servicos" current={filtro} tabs={TABS} />

      {lista.length === 0 ? (
        <p className="card-vazio">Nenhum serviço {filtro ? "nesse status" : "ainda"}.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((s) => {
            const slot = slotDe.get(s.slot_id);
            const cliente = clienteDe.get(s.cliente_id);
            const sinalizacao = sinalizacaoDe.get(s.id);
            return (
              <div key={s.id} className="card flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar nome={cliente?.nome ?? "Cliente"} fotoUrl={cliente?.foto_url ?? null} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cliente ? (
                          <PerfilPopover
                            perfil={{
                              userId: s.cliente_id,
                              nome: cliente.nome,
                              fotoUrl: cliente.foto_url,
                              genero: cliente.genero,
                              papel: cliente.tipo_base as AppRole,
                              notaMedia: cliente.nota_media,
                              totalAvaliacoes: cliente.total_avaliacoes,
                              verificado: cliente.verificado,
                            }}
                            flags={flagsPorCliente.get(s.cliente_id) ?? []}
                          />
                        ) : (
                          <span className="text-sm font-semibold">Cliente</span>
                        )}
                        <FlagsPessoa flags={flagsPorCliente.get(s.cliente_id) ?? []} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {slot ? `${formatData(slot.data)} · ${quandoDoServico(slot, s)} · ` : ""}
                        {nomeTipo.get(s.tipo) ?? "Outros"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand">
                    {formatBRL(s.preco_valor)} {s.preco_tipo === "hora" ? "/h" : ""}
                  </span>
                  <div className="flex items-center gap-3">
                    {STATUS_COM_FLAG.has(s.status) ? (
                      <SinalizarServico
                        servicoId={s.id}
                        alvoNome={cliente?.nome ?? "o cliente"}
                        jaSinalizado={sinalizacao ? { status: sinalizacao.status, criadoEm: sinalizacao.created_at } : null}
                      />
                    ) : null}
                    <Link href={`/agenda/${s.slot_id}`} className="text-sm font-semibold text-brand">
                      Abrir →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
