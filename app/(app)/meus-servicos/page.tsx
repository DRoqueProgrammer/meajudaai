import { redirect } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { CancelarServicoBotao } from "@/components/agenda/cancelar-servico-botao";
import { ResponderRenegociacao } from "@/components/agenda/responder-renegociacao";
import { PerfilPopover } from "@/components/perfil-popover";
import { FlagsPessoa } from "@/components/flags-pessoa";
import { SinalizarServico } from "@/components/sinalizar-servico";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import { quandoDoServico } from "@/lib/periodo-da-visita";
import { nomeCategoria } from "@/lib/categorias";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

/** Status em que já houve engajamento de verdade — só nesses o "Flag Pilantra" aparece (pendente ainda não virou nada). */
const STATUS_COM_FLAG = new Set(["confirmado", "realizado", "cancelado"]);

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[status] ?? "bg-surface text-muted"}`}>
      {status}
    </span>
  );
}

/** Rota `/meus-servicos` (cliente): histórico dos agendamentos feitos, mais recente primeiro, últimos 10 + "ver todos", filtro geral (prestador, descrição, categoria). */
export default async function MeusServicosPage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string; busca?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "cliente") redirect("/inicio");
  const { todos, busca } = await searchParams;

  const sb = await createServerClient();
  const { data: servicosBrutos } = await sb
    .from("servicos")
    .select("id, descricao, preco_tipo, preco_valor, preco_pendente, status, cancelado_motivo, prestador_id, slot_id, periodo_preferido, hora_combinada_inicio, hora_combinada_fim")
    .eq("cliente_id", user.id)
    .order("created_at", { ascending: false });

  const prestadorIds = [...new Set((servicosBrutos ?? []).map((s) => s.prestador_id))];
  const { data: prestadores } = prestadorIds.length
    ? await sb
        .from("profiles")
        .select("user_id, nome, foto_url, genero, tipo_base, categoria, nota_media, total_avaliacoes, verificado")
        .in("user_id", prestadorIds)
    : { data: [] };
  const perfilDe = new Map((prestadores ?? []).map((p) => [p.user_id, p]));

  const slotIds = (servicosBrutos ?? []).map((s) => s.slot_id);
  const { data: slots } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data, hora_inicio, hora_fim").in("id", slotIds)
    : { data: [] };
  const slotDe = new Map((slots ?? []).map((s) => [s.id, s]));

  // Bandeiras de cada prestador (flags_da_pessoa só devolve linha pro outro
  // lado — o cliente vê as do prestador, nunca as próprias, migration 0055).
  const flagsPorPrestador = new Map(
    await Promise.all(
      prestadorIds.map(async (id) => {
        const { data } = await sb.rpc("flags_da_pessoa", { p_alvo: id });
        return [id, data ?? []] as const;
      }),
    ),
  );

  // As próprias sinalizações (a RLS deixa o autor ler as dele) — pra trocar o
  // botão "Flag Pilantra" pelo status, se este serviço já foi sinalizado.
  const servicoIds = (servicosBrutos ?? []).map((s) => s.id);
  const { data: minhasSinalizacoes } = servicoIds.length
    ? await sb.from("sinalizacoes").select("servico_id, status, created_at").eq("autor_id", user.id).in("servico_id", servicoIds)
    : { data: [] };
  const sinalizacaoDe = new Map((minhasSinalizacoes ?? []).map((s) => [s.servico_id, s]));

  // Filtro geral em memória: nome do prestador, descrição do serviço ou categoria — três
  // colunas que vivem em duas tabelas diferentes, sem dado o bastante por cliente pra
  // justificar um índice full-text só pra isso.
  const buscaNorm = busca?.trim().toLowerCase();
  const servicosFiltrados = buscaNorm
    ? (servicosBrutos ?? []).filter((s) => {
        const p = perfilDe.get(s.prestador_id);
        return (
          s.descricao.toLowerCase().includes(buscaNorm) ||
          p?.nome.toLowerCase().includes(buscaNorm) ||
          (p?.categoria && nomeCategoria(p.categoria).toLowerCase().includes(buscaNorm))
        );
      })
    : (servicosBrutos ?? []);
  const servicos = todos ? servicosFiltrados : servicosFiltrados.slice(0, 10);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Meus serviços</h1>

      <form className="flex gap-2">
        <input
          name="busca"
          defaultValue={busca ?? ""}
          placeholder="Buscar por prestador, descrição ou serviço…"
          className="input flex-1"
        />
        <button type="submit" className="btn-ghost px-4 text-sm">Filtrar</button>
      </form>

      {servicos.length === 0 ? (
        <p className="card-vazio">
          {buscaNorm ? "Nenhum serviço encontrado para essa busca." : "Você ainda não agendou nenhum serviço."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {servicos.map((s) => {
            const slot = slotDe.get(s.slot_id);
            const p = perfilDe.get(s.prestador_id);
            const sinalizacao = sinalizacaoDe.get(s.id);
            return (
              <div key={s.id} className="flex flex-col gap-1 rounded-xl border border-line bg-card px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p ? (
                        <PerfilPopover
                          perfil={{
                            userId: s.prestador_id,
                            nome: p.nome,
                            fotoUrl: p.foto_url,
                            genero: p.genero,
                            papel: p.tipo_base as AppRole,
                            notaMedia: p.nota_media,
                            totalAvaliacoes: p.total_avaliacoes,
                            verificado: p.verificado,
                          }}
                        />
                      ) : (
                        <span className="text-sm font-semibold">Prestador</span>
                      )}
                      <FlagsPessoa flags={flagsPorPrestador.get(s.prestador_id) ?? []} />
                    </div>
                    <p className="truncate text-xs text-muted">
                      {slot ? `${formatData(slot.data)} · ${quandoDoServico(slot, s)} · ` : ""}
                      {s.descricao}
                    </p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand">
                    {formatBRL(s.preco_valor)} {s.preco_tipo === "hora" ? "/h" : ""}
                  </span>
                  {s.status === "pendente" || s.status === "confirmado" ? (
                    <CancelarServicoBotao servicoId={s.id} />
                  ) : null}
                </div>
                {s.cancelado_motivo ? <p className="text-xs text-danger">Cancelado: {s.cancelado_motivo}</p> : null}
                {s.preco_pendente != null ? (
                  <ResponderRenegociacao servicoId={s.id} precoPendente={s.preco_pendente} />
                ) : null}
                {STATUS_COM_FLAG.has(s.status) ? (
                  <SinalizarServico
                    servicoId={s.id}
                    alvoNome={p?.nome ?? "o prestador"}
                    jaSinalizado={sinalizacao ? { status: sinalizacao.status, criadoEm: sinalizacao.created_at } : null}
                  />
                ) : null}
              </div>
            );
          })}
          {!todos && servicosFiltrados.length > 10 ? (
            <a href={`?todos=1${busca ? `&busca=${encodeURIComponent(busca)}` : ""}`} className="self-start text-sm font-semibold text-brand">
              Ver todos ({servicosFiltrados.length}) →
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
